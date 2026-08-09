import { NextResponse } from "next/server";

import { getAlbums } from "@/lib/data";

/** GET /api/albums -- every album, with its artist and song count. */
export async function GET() {
  try {
    return NextResponse.json({ albums: await getAlbums() });
  } catch (error) {
    console.error("GET /api/albums", error);
    return NextResponse.json({ error: "Could not load albums" }, { status: 500 });
  }
}
