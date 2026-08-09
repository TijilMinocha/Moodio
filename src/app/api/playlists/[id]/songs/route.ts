import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";
import { POSITION_GAP } from "@/lib/user-data";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

async function requireOwnedPlaylist(supabase: Supabase, playlistId: string, userId: string) {
  const { data } = await supabase
    .from("playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** POST /api/playlists/[id]/songs { songId } -- append to the end. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: playlistId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let songId: unknown;
  try {
    ({ songId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof songId !== "string" || !songId) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }

  if (!(await requireOwnedPlaylist(supabase, playlistId, user.id))) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  const { data: last } = await supabase
    .from("playlist_songs")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? 0) + POSITION_GAP;

  const { error } = await supabase
    .from("playlist_songs")
    .insert({ playlist_id: playlistId, song_id: songId, position });

  if (error) {
    // 23505 = unique_violation on the (playlist_id, song_id) primary key.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Song is already in this playlist" },
        { status: 409 },
      );
    }
    console.error("POST /api/playlists/[id]/songs", error);
    return NextResponse.json({ error: "Could not add song" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/playlists/[id]/songs { songId } */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: playlistId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let songId: unknown;
  try {
    ({ songId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof songId !== "string" || !songId) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }

  if (!(await requireOwnedPlaylist(supabase, playlistId, user.id))) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("playlist_songs")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("song_id", songId);

  if (error) {
    console.error("DELETE /api/playlists/[id]/songs", error);
    return NextResponse.json({ error: "Could not remove song" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/playlists/[id]/songs { songId, afterSongId }
 *
 * Reorders by placing `songId` directly after `afterSongId` (null = move to
 * the front). Positions are stored with gaps of 1000, so the new position is
 * the midpoint between its two new neighbours and the move costs exactly one
 * UPDATE -- rather than rewriting every row's position on every drag.
 *
 * Midpoints halve the gap each time, so after enough drags in the same spot
 * two positions can converge. When that happens we renumber the playlist back
 * onto clean multiples of 1000 and retry.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: playlistId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { songId?: unknown; afterSongId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const songId = body.songId;
  const afterSongId = body.afterSongId ?? null;

  if (typeof songId !== "string" || !songId) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }
  if (afterSongId !== null && typeof afterSongId !== "string") {
    return NextResponse.json({ error: "Invalid afterSongId" }, { status: 400 });
  }

  if (!(await requireOwnedPlaylist(supabase, playlistId, user.id))) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  const { data: rows, error: readError } = await supabase
    .from("playlist_songs")
    .select("song_id, position")
    .eq("playlist_id", playlistId)
    .order("position");

  if (readError || !rows) {
    console.error("PATCH /api/playlists/[id]/songs read", readError);
    return NextResponse.json({ error: "Could not reorder" }, { status: 500 });
  }

  const others = rows.filter((r) => r.song_id !== songId);
  if (others.length === rows.length) {
    return NextResponse.json(
      { error: "Song is not in this playlist" },
      { status: 404 },
    );
  }

  const afterIndex =
    afterSongId === null
      ? -1
      : others.findIndex((r) => r.song_id === afterSongId);

  if (afterSongId !== null && afterIndex === -1) {
    return NextResponse.json({ error: "afterSongId not found" }, { status: 404 });
  }

  const before = afterIndex >= 0 ? others[afterIndex].position : null;
  const next = others[afterIndex + 1]?.position ?? null;

  let position: number;
  if (before === null && next === null) position = POSITION_GAP;
  else if (before === null) position = next! - POSITION_GAP;
  else if (next === null) position = before + POSITION_GAP;
  else position = (before + next) / 2;

  // Gap exhausted: the midpoint is no longer strictly between its neighbours.
  const collided =
    (before !== null && position <= before) ||
    (next !== null && position >= next);

  if (collided) {
    const reordered = [...others];
    reordered.splice(afterIndex + 1, 0, { song_id: songId, position: 0 });

    for (let i = 0; i < reordered.length; i++) {
      const { error } = await supabase
        .from("playlist_songs")
        .update({ position: (i + 1) * POSITION_GAP })
        .eq("playlist_id", playlistId)
        .eq("song_id", reordered[i].song_id);
      if (error) {
        console.error("PATCH renumber", error);
        return NextResponse.json({ error: "Could not reorder" }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true, renumbered: true });
  }

  const { error } = await supabase
    .from("playlist_songs")
    .update({ position })
    .eq("playlist_id", playlistId)
    .eq("song_id", songId);

  if (error) {
    console.error("PATCH /api/playlists/[id]/songs", error);
    return NextResponse.json({ error: "Could not reorder" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, position });
}
