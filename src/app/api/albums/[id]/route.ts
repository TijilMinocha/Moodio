import { NextResponse } from "next/server";

import { getAlbumWithSongs } from "@/lib/data";

/**
 * GET /api/albums/[id] -- one album plus its songs.
 * Accepts either a uuid or a slug, so URLs can read /album/arijit.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await getAlbumWithSongs(id);
    if (!result) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/albums/[id]", error);
    return NextResponse.json({ error: "Could not load album" }, { status: 500 });
  }
}
