import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/require-user";

/** Long enough for any song, short enough that a leaked link dies quickly. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * GET /api/songs/[id]/stream
 *
 * The audio bucket is private, so we hand back a short-lived signed URL rather
 * than the file itself. Two reasons: the bytes are served by Supabase's CDN
 * instead of our Node process, and the client still gets HTTP range requests
 * for free -- which is what makes seeking work without downloading the whole
 * track.
 *
 * On Day 7 this is replaced by a generated HLS manifest whose segment URLs are
 * signed at request time.
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
    .select("id, storage_path, status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("GET /api/songs/[id]/stream", error);
    return NextResponse.json({ error: "Could not load song" }, { status: 500 });
  }
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }
  if (song.status !== "ready") {
    return NextResponse.json(
      { error: `Song is ${song.status}` },
      { status: 409 },
    );
  }

  const { data: signed, error: signError } = await db.storage
    .from("audio")
    .createSignedUrl(song.storage_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) {
    console.error("sign failed", signError);
    return NextResponse.json({ error: "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
