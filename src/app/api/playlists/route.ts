import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getPlaylists } from "@/lib/user-data";

/** GET /api/playlists -- the signed-in user's playlists. */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    return NextResponse.json({ playlists: await getPlaylists() });
  } catch (error) {
    console.error("GET /api/playlists", error);
    return NextResponse.json(
      { error: "Could not load playlists" },
      { status: 500 },
    );
  }
}

/** POST /api/playlists { name } */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { name?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: "Name is required and must be under 100 characters" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      name,
      description:
        typeof body.description === "string" ? body.description.trim() : null,
      user_id: user.id,
    })
    .select("id, name, description, is_public, created_at")
    .single();

  if (error) {
    console.error("POST /api/playlists", error);
    return NextResponse.json(
      { error: "Could not create playlist" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      playlist: {
        id: data.id,
        name: data.name,
        description: data.description,
        isPublic: data.is_public,
        createdAt: data.created_at,
        songCount: 0,
      },
    },
    { status: 201 },
  );
}
