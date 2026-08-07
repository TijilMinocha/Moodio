import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client scoped to the *signed-in user*, backed by the anon key and
 * the session cookie.
 *
 * The distinction from createAdminClient matters:
 *
 *   admin client  -> service key, bypasses RLS. Used for the public catalogue
 *                    and for storage signing, where there is no "owner".
 *   server client -> the user's own JWT. Postgres applies the RLS policies, so
 *                    a query for playlists physically cannot return someone
 *                    else's rows even if our code forgot to filter.
 *
 * All user-owned data (likes, playlists) goes through this one, which is what
 * makes the RLS policies from Day 1 load-bearing rather than decorative.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session instead, so this is safe.
          }
        },
      },
    },
  );
}

/** The signed-in user, or null. */
export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
