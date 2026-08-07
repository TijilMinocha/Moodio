import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key.
 *
 * This key bypasses Row Level Security, so it must never reach the browser.
 * Everything the UI needs goes through our own API routes, which use this
 * client and do their own authorization checks.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Copy .env.local.example to .env.local and fill it in.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
