import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";

/** PATCH /api/playlists/[id] { name?, description?, isPublic? } */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { name?: unknown; description?: unknown; isPublic?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    patch.name = name;
  }
  if (typeof body.description === "string") {
    patch.description = body.description.trim() || null;
  }
  if (typeof body.isPublic === "boolean") {
    patch.is_public = body.isPublic;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // The .eq("user_id") is belt and braces -- RLS already blocks other people's
  // rows -- but it turns a silent no-op into an explicit 404.
  const { data, error } = await supabase
    .from("playlists")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("PATCH /api/playlists/[id]", error);
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/playlists/[id] -- playlist_songs rows go with it via cascade. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("DELETE /api/playlists/[id]", error);
    return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
