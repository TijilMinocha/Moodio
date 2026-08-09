import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/require-user";

/**
 * GET /api/songs/[id]/manifest  -- the HLS master playlist.
 *
 * The stored master.m3u8 lists variants as bare filenames. We rewrite them to
 * point back at our own API rather than at storage, because the variant
 * playlists themselves must be generated per request (see the variant route
 * for why). So the client only ever sees our URLs at this level.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const db = createAdminClient();

  const { data: song, error } = await db
    .from("songs")
    .select("id, hls_path, status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("GET manifest", error);
    return NextResponse.json({ error: "Could not load song" }, { status: 500 });
  }
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }
  if (!song.hls_path) {
    // Not transcoded yet -- the client falls back to the progressive MP3.
    return NextResponse.json({ error: "No HLS for this song" }, { status: 404 });
  }

  const { data: file, error: dlError } = await db.storage
    .from("audio")
    .download(song.hls_path);

  if (dlError || !file) {
    console.error("GET manifest download", dlError);
    return NextResponse.json({ error: "Manifest unavailable" }, { status: 502 });
  }

  const master = await file.text();

  // Rewrite "low.m3u8" -> "/api/songs/<id>/manifest/low"
  const rewritten = master.replace(
    /^(low|mid|high)\.m3u8$/gm,
    (_match, name) => `/api/songs/${id}/manifest/${name}`,
  );

  return new NextResponse(rewritten, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      // Playlists carry signed URLs downstream, so they must never be cached
      // by a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
