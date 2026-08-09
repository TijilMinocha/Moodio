import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/require-user";

const VARIANTS = new Set(["low", "mid", "high"]);

/**
 * How long a segment URL stays valid. Two hours comfortably outlives any
 * single track, so a link cannot expire mid-playback.
 */
const SEGMENT_TTL_SECONDS = 60 * 60 * 2;

/**
 * GET /api/songs/[id]/manifest/[variant] -- one bitrate ladder's playlist,
 * with every segment URL signed at request time.
 *
 * This is the crux of serving HLS from a private bucket. A playlist is a list
 * of URLs, and the bucket needs each of them signed. The obvious approaches
 * both fail:
 *
 *   - Sign them at upload time and store them in the playlist: signatures
 *     expire, so the file rots and playback breaks days later.
 *   - Proxy every segment through this server: ~28 requests per track hitting
 *     Node, and we lose the CDN entirely.
 *
 * So the playlist is generated per request and the segments are signed in one
 * batch. The client then pulls segment bytes straight from storage's CDN --
 * our server handles one request per track per quality, not one per segment.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  const { id, variant } = await params;

  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!VARIANTS.has(variant)) {
    return NextResponse.json({ error: "Unknown variant" }, { status: 404 });
  }

  const db = createAdminClient();

  const { data: song, error } = await db
    .from("songs")
    .select("id, hls_path")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("GET variant", error);
    return NextResponse.json({ error: "Could not load song" }, { status: 500 });
  }
  if (!song?.hls_path) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const dir = song.hls_path.replace(/\/master\.m3u8$/, "");

  const { data: file, error: dlError } = await db.storage
    .from("audio")
    .download(`${dir}/${variant}.m3u8`);

  if (dlError || !file) {
    console.error("GET variant download", dlError);
    return NextResponse.json({ error: "Playlist unavailable" }, { status: 502 });
  }

  const playlist = await file.text();

  // Collect the segment filenames in playlist order.
  const segments = playlist
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (segments.length === 0) {
    return NextResponse.json({ error: "Empty playlist" }, { status: 502 });
  }

  // One batch call rather than N round-trips to sign N segments.
  const { data: signed, error: signError } = await db.storage
    .from("audio")
    .createSignedUrls(
      segments.map((name) => `${dir}/${name}`),
      SEGMENT_TTL_SECONDS,
    );

  if (signError || !signed) {
    console.error("sign segments", signError);
    return NextResponse.json({ error: "Could not sign segments" }, { status: 500 });
  }

  const urlByName = new Map<string, string>();
  signed.forEach((entry, i) => {
    if (entry.signedUrl) urlByName.set(segments[i], entry.signedUrl);
  });

  if (urlByName.size !== segments.length) {
    return NextResponse.json(
      { error: "Some segments could not be signed" },
      { status: 500 },
    );
  }

  const rewritten = playlist
    .split("\n")
    .map((line) => {
      const name = line.trim();
      if (!name || name.startsWith("#")) return line;
      return urlByName.get(name) ?? line;
    })
    .join("\n");

  return new NextResponse(rewritten, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "private, no-store",
    },
  });
}
