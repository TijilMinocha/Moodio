import { NextResponse } from "next/server";

import { cacheStats } from "@/lib/cache";
import { requireUser } from "@/lib/require-user";

/**
 * GET /api/cache-stats -- hit ratio for the current server process.
 *
 * Counters are in-memory, so they reset on redeploy and are per-instance.
 * That is fine for "is the cache doing anything" and for the numbers quoted in
 * the README; real metrics would go to a proper collector.
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  return NextResponse.json(cacheStats());
}
