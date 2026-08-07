/**
 * Ingest: walk ./songs, push audio + cover art into Supabase Storage, and
 * write the catalogue rows into Postgres.
 *
 *   npm run ingest
 *
 * Safe to re-run. Albums are keyed by slug and songs by (album_id, title),
 * so a second run updates rows instead of creating duplicates.
 *
 * This runs on your machine, not on the server. That is deliberate: later
 * days add ffmpeg transcoding here, and keeping it local means the deployed
 * app never needs ffmpeg installed. The tradeoff is that adding a song is a
 * manual step -- see the "what I'd change at scale" note in the README.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { config } from "dotenv";
import { parseBuffer } from "music-metadata";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SONGS_DIR = path.resolve("songs");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.local.example to .env.local and fill it in first.",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface AlbumInfo {
  title: string;
  description: string;
  songs: string[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Filenames look like "Apna Bana Le - Arijit Singh.mp3", so the text after the
 * last " - " is the artist. Falls back to the album artist when there is no
 * separator.
 */
function splitTitleAndArtist(filename: string): {
  title: string;
  artist: string | null;
} {
  const base = filename.replace(/\.mp3$/i, "").trim();
  const idx = base.lastIndexOf(" - ");
  if (idx === -1) return { title: base.replace(/\s+/g, " "), artist: null };
  return {
    title: base.slice(0, idx).trim().replace(/\s+/g, " "),
    artist: base.slice(idx + 3).trim(),
  };
}

/** Insert the artist if new, and return its id either way. */
async function upsertArtist(name: string): Promise<string> {
  const { data, error } = await db
    .from("artists")
    .upsert({ name }, { onConflict: "name" })
    .select("id")
    .single();
  if (error) throw new Error(`artist "${name}": ${error.message}`);
  return data.id;
}

async function uploadCover(slug: string, dir: string): Promise<string | null> {
  const coverPath = path.join(dir, "cover.jpg");
  if (!existsSync(coverPath)) return null;

  const key = `${slug}/cover.jpg`;
  const { error } = await db.storage
    .from("covers")
    .upload(key, await readFile(coverPath), {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (error) throw new Error(`cover ${key}: ${error.message}`);
  return key;
}

async function ingestFolder(folder: string) {
  const dir = path.join(SONGS_DIR, folder);
  const infoPath = path.join(dir, "info.json");

  if (!existsSync(infoPath)) {
    console.warn(`  skip ${folder} -- no info.json`);
    return;
  }

  const info: AlbumInfo = JSON.parse(await readFile(infoPath, "utf8"));
  const slug = slugify(folder);

  console.log(`\n${info.title}  (${slug})`);

  const albumArtistId = await upsertArtist(info.title);
  const coverPath = await uploadCover(slug, dir);

  const { data: album, error: albumError } = await db
    .from("albums")
    .upsert(
      {
        slug,
        title: info.title,
        description: info.description ?? null,
        cover_path: coverPath,
        artist_id: albumArtistId,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (albumError) throw new Error(`album ${slug}: ${albumError.message}`);

  const files = (await readdir(dir)).filter((f) => /\.mp3$/i.test(f));

  for (const file of files) {
    const { title, artist } = splitTitleAndArtist(file);
    const buffer = await readFile(path.join(dir, file));

    // Content hash lets a future run skip files that have not changed, and
    // catches the same track uploaded twice under different names.
    const contentHash = createHash("sha256").update(buffer).digest("hex");

    let durationSec: number | null = null;
    try {
      const metadata = await parseBuffer(buffer, { mimeType: "audio/mpeg" });
      durationSec = metadata.format.duration
        ? Math.round(metadata.format.duration)
        : null;
    } catch (err) {
      console.warn(
        `    could not read duration for ${file}: ${(err as Error).message}`,
      );
    }

    const storagePath = `${slug}/${file}`;
    const { error: uploadError } = await db.storage
      .from("audio")
      .upload(storagePath, buffer, { contentType: "audio/mpeg", upsert: true });
    if (uploadError) throw new Error(`upload ${storagePath}: ${uploadError.message}`);

    const artistId = artist ? await upsertArtist(artist) : albumArtistId;

    const { error: songError } = await db.from("songs").upsert(
      {
        title,
        album_id: album.id,
        artist_id: artistId,
        duration_sec: durationSec,
        storage_path: storagePath,
        content_hash: contentHash,
        status: "ready",
      },
      { onConflict: "album_id,title" },
    );
    if (songError) throw new Error(`song ${title}: ${songError.message}`);

    const mins = durationSec ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}` : "?:??";
    console.log(`  + ${title} -- ${artist ?? info.title}  [${mins}]`);
  }
}

async function main() {
  if (!existsSync(SONGS_DIR)) {
    console.error(`No songs/ directory at ${SONGS_DIR}`);
    process.exit(1);
  }

  const entries = await readdir(SONGS_DIR, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  console.log(`Ingesting ${folders.length} album folders...`);

  for (const folder of folders) {
    await ingestFolder(folder);
  }

  const { count } = await db
    .from("songs")
    .select("*", { count: "exact", head: true });
  console.log(`\nDone. ${count} songs in the catalogue.`);
}

main().catch((err) => {
  console.error("\nIngest failed:", err.message);
  process.exit(1);
});
