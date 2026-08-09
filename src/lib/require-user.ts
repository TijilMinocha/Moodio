import "server-only";

import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Guard for the audio routes.
 *
 * The catalogue is behind a login, so the endpoints that hand out playable
 * audio must be too. Without this, anyone holding a song UUID could pull a
 * signed URL and stream the library without an account -- the gate on the
 * pages would be decorative.
 */
export async function requireUser(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  return { ok: true };
}
