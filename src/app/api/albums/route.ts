import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { toAlbumDTO } from "@/lib/mappers";

/** GET /api/albums -- every album, with its artist and song count. */
export async function GET() {
  const db = createAdminClient();

  // One query with joins rather than N+1: fetching albums and then looping to
  // count each album's songs would be 12 round-trips instead of 1.
  const { data, error } = await db
    .from("albums")
    .select(
      "id, slug, title, description, cover_path, artists ( name ), songs ( count )",
    )
    .order("title");

  if (error) {
    console.error("GET /api/albums", error);
    return NextResponse.json({ error: "Could not load albums" }, { status: 500 });
  }

  return NextResponse.json({ albums: data.map(toAlbumDTO) });
}
