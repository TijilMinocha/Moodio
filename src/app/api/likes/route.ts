import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getLikedSongIds } from "@/lib/user-data";

/** GET /api/likes -- ids of every song the signed-in user has liked. */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ songIds: [] });

  try {
    return NextResponse.json({ songIds: await getLikedSongIds() });
  } catch (error) {
    console.error("GET /api/likes", error);
    return NextResponse.json({ error: "Could not load likes" }, { status: 500 });
  }
}

/** POST /api/likes { songId } -- toggles, returns the resulting state. */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let songId: unknown;
  try {
    ({ songId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof songId !== "string" || !songId) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }

  const { data: existing, error: readError } = await supabase
    .from("liked_songs")
    .select("song_id")
    .eq("song_id", songId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("POST /api/likes read", readError);
    return NextResponse.json({ error: "Could not read like" }, { status: 500 });
  }

  if (existing) {
    const { error } = await supabase
      .from("liked_songs")
      .delete()
      .eq("song_id", songId)
      .eq("user_id", user.id);
    if (error) {
      console.error("POST /api/likes delete", error);
      return NextResponse.json({ error: "Could not unlike" }, { status: 500 });
    }
    return NextResponse.json({ liked: false });
  }

  // user_id is set explicitly rather than trusted from the body -- the client
  // never gets to say whose like this is.
  const { error } = await supabase
    .from("liked_songs")
    .insert({ song_id: songId, user_id: user.id });

  if (error) {
    console.error("POST /api/likes insert", error);
    return NextResponse.json({ error: "Could not like" }, { status: 500 });
  }

  return NextResponse.json({ liked: true });
}
