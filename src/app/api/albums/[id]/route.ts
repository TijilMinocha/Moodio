import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { toAlbumDTO, toSongDTO } from "@/lib/mappers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/albums/[id] -- one album plus its songs.
 * Accepts either a uuid or a slug, so URLs can read /album/arijit.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: album, error: albumError } = await db
    .from("albums")
    .select("id, slug, title, description, cover_path, artists ( name )")
    .eq(UUID.test(id) ? "id" : "slug", id)
    .maybeSingle();

  if (albumError) {
    console.error("GET /api/albums/[id]", albumError);
    return NextResponse.json({ error: "Could not load album" }, { status: 500 });
  }
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const { data: songs, error: songsError } = await db
    .from("songs")
    .select(
      "id, title, album_id, duration_sec, artists ( name ), albums ( title, cover_path )",
    )
    .eq("album_id", album.id)
    .eq("status", "ready")
    .order("title");

  if (songsError) {
    console.error("GET /api/albums/[id] songs", songsError);
    return NextResponse.json({ error: "Could not load songs" }, { status: 500 });
  }

  return NextResponse.json({
    album: toAlbumDTO(album),
    songs: songs.map(toSongDTO),
  });
}
