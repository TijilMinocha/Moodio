/**
 * HLS transcode pipeline.
 *
 *   npm run transcode          only songs without HLS yet
 *   npm run transcode -- --all re-encode everything
 *
 * For each song: ffmpeg produces three bitrate ladders (96/160/320 kbps), each
 * cut into ~10s segments, plus a variant playlist per ladder. Everything is
 * uploaded to the private `audio` bucket under hls/<slug>/<songId>/.
 *
 * Deliberately separate from `npm run ingest`: transcoding is the slow step
 * (tens of seconds per track), and keeping it apart means adding metadata does
 * not force a re-encode. It also runs on your machine, so the deployed app
 * never needs ffmpeg installed -- the tradeoff being that this is a manual
 * step rather than a worker queue. See the README's scale note.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";

import { CATALOGUE_PREFIX } from "../src/lib/cache-keys.js";

config({ path: ".env.local" });

const run = promisify(execFile);

const LADDERS = [
  { name: "low", bitrate: "96k", bandwidth: 106000 },
  { name: "mid", bitrate: "160k", bandwidth: 176000 },
  { name: "high", bitrate: "320k", bandwidth: 342000 },
] as const;

const SEGMENT_SECONDS = 10;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase env vars. Fill in .env.local first.");
  process.exit(1);
}
if (!ffmpegPath) {
  console.error("ffmpeg-static did not provide a binary path.");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const force = process.argv.includes("--all");

/**
 * Encode one ladder into segments + a variant playlist.
 *
 * -vn drops any embedded album art: without it ffmpeg tries to carry the cover
 * image into every segment as a video stream and the muxer refuses.
 * hls_flags temp_file avoids readers seeing a half-written playlist.
 */
async function encodeLadder(
  inputPath: string,
  outDir: string,
  ladder: (typeof LADDERS)[number],
) {
  const args = [
    "-y",
    "-i", inputPath,
    "-vn",
    "-c:a", "aac",
    "-b:a", ladder.bitrate,
    "-ac", "2",
    "-ar", "44100",
    "-f", "hls",
    "-hls_time", String(SEGMENT_SECONDS),
    "-hls_playlist_type", "vod",
    "-hls_flags", "temp_file",
    "-hls_segment_filename", path.join(outDir, `${ladder.name}_%03d.aac`),
    path.join(outDir, `${ladder.name}.m3u8`),
  ];

  await run(ffmpegPath!, args, { maxBuffer: 1024 * 1024 * 32 });
}

/**
 * Master playlist. Segment and variant URLs are written as bare filenames --
 * the API rewrites them into signed URLs at request time, because a URL signed
 * now would expire while the listener is still playing.
 */
function masterPlaylist(): string {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3"];
  for (const ladder of LADDERS) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${ladder.bandwidth},CODECS="mp4a.40.2"`,
      `${ladder.name}.m3u8`,
    );
  }
  return lines.join("\n") + "\n";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Upload one file, retrying on transient failures.
 *
 * A single song is 57-90 small objects, and pushing them back to back reliably
 * produced sporadic "Bad Request" responses from storage -- the kind of
 * transient error you only see once you are hammering an API rather than
 * making one call at a time. Without a retry, one blip 25 segments in throws
 * away the whole track's encode.
 *
 * Exponential backoff with a small base: 300ms, 600ms, 1200ms.
 */
async function uploadWithRetry(
  key: string,
  body: Buffer,
  label: string,
  attempts = 4,
) {
  const contentType = key.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : "audio/aac";

  let lastError = "";
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { error } = await db.storage
      .from("audio")
      .upload(key, body, { contentType, upsert: true });

    if (!error) return;

    // Surface the real payload -- supabase-js flattens storage errors to
    // "Bad Request", which says nothing about the cause.
    lastError = `${error.message}${
      "statusCode" in error ? ` (${(error as { statusCode?: string }).statusCode})` : ""
    }`;
    await sleep(300 * 2 ** attempt);
  }

  throw new Error(`upload ${label} failed after ${attempts} attempts: ${lastError}`);
}

async function transcodeSong(song: {
  id: string;
  title: string;
  storage_path: string;
}) {
  const workDir = await mkdtemp(path.join(tmpdir(), "moodio-hls-"));

  try {
    // Pull the original back out of storage -- storage is the source of truth,
    // not whatever happens to be in the local songs/ folder.
    const { data: blob, error: dlError } = await db.storage
      .from("audio")
      .download(song.storage_path);
    if (dlError || !blob) throw new Error(`download: ${dlError?.message}`);

    const inputPath = path.join(workDir, "input.mp3");
    await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));

    for (const ladder of LADDERS) {
      await encodeLadder(inputPath, workDir, ladder);
    }

    await writeFile(path.join(workDir, "master.m3u8"), masterPlaylist());

    const prefix = `hls/${song.id}`;
    const files = (await readdir(workDir)).filter((f) => f !== "input.mp3");

    let bytes = 0;
    for (const file of files) {
      const body = await readFile(path.join(workDir, file));
      bytes += body.length;
      await uploadWithRetry(`${prefix}/${file}`, body, file);
    }

    const { error: updateError } = await db
      .from("songs")
      .update({ hls_path: `${prefix}/master.m3u8` })
      .eq("id", song.id);
    if (updateError) throw new Error(`update: ${updateError.message}`);

    const segments = files.filter((f) => f.endsWith(".aac")).length;
    console.log(
      `  ok  ${song.title.padEnd(32)} ${segments} segments, ${(bytes / 1024 / 1024).toFixed(1)} MB`,
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function main() {
  let query = db
    .from("songs")
    .select("id, title, storage_path, hls_path")
    .eq("status", "ready");

  if (!force) query = query.is("hls_path", null);

  const { data, error } = await query;
  if (error) {
    console.error("Could not list songs:", error.message);
    process.exit(1);
  }

  const songs = data ?? [];
  if (songs.length === 0) {
    console.log("Nothing to transcode. Use --all to re-encode everything.");
    return;
  }

  console.log(
    `Transcoding ${songs.length} song(s) into ${LADDERS.length} ladders each...\n`,
  );

  const started = Date.now();
  let failed = 0;

  for (const song of songs) {
    try {
      await transcodeSong(song);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${song.title}: ${(err as Error).message}`);
    }
  }

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\nDone in ${secs}s. ${songs.length - failed} ok, ${failed} failed.`);
  await invalidateCatalogueCache();
}

if (!existsSync(ffmpegPath)) {
  console.error(`ffmpeg binary missing at ${ffmpegPath}`);
  process.exit(1);
}


/**
 * Drop the catalogue cache so a newly added song appears immediately rather
 * than after the TTL expires. Silent no-op when Redis is not configured.
 */
async function invalidateCatalogueCache(): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return;

  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const keys = await redis.keys(CATALOGUE_PREFIX + "*");
    if (keys.length === 0) return;
    await redis.del(...keys);
    console.log("Invalidated " + keys.length + " cache key(s).");
  } catch (err) {
    console.warn("Cache invalidation skipped: " + (err as Error).message);
  }
}


main().catch((err) => {
  console.error("\nTranscode failed:", err.message);
  process.exit(1);
});
