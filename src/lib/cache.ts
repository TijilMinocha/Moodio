import "server-only";

import { Redis } from "@upstash/redis";

import { CATALOGUE_PREFIX } from "@/lib/cache-keys";

/**
 * Read-through cache for catalogue queries.
 *
 * Optional by design: with no Upstash credentials set, `cached()` just calls
 * the function and returns. The app works either way, so a fresh clone runs
 * without anyone signing up for anything, and Redis is a measurable
 * improvement rather than a hard dependency.
 *
 * Only the catalogue is cached -- albums, songs, the mood map. Never a user's
 * playlists or likes: those are per-user and change constantly, so caching
 * them buys nothing and risks serving one person another's data.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

export const cacheEnabled = redis !== null;

/** Process-local counters, surfaced by /api/cache-stats. */
const stats = { hits: 0, misses: 0, errors: 0 };

export function cacheStats() {
  const total = stats.hits + stats.misses;
  return {
    enabled: cacheEnabled,
    ...stats,
    hitRatio: total === 0 ? null : Number((stats.hits / total).toFixed(3)),
  };
}

export { cacheKeys } from "@/lib/cache-keys";

/**
 * Read through the cache.
 *
 * A cache miss or a Redis outage must never take the site down, so every
 * failure path falls back to the database. That is the whole point of a cache
 * being a cache and not a datastore.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!redis) return fetcher();

  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) {
      stats.hits++;
      return hit;
    }
  } catch (err) {
    stats.errors++;
    console.error("cache read failed:", (err as Error).message);
    return fetcher();
  }

  stats.misses++;
  const value = await fetcher();

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    stats.errors++;
    console.error("cache write failed:", (err as Error).message);
  }

  return value;
}

/**
 * Drop every catalogue key. Called at the end of ingest and transcode, so a
 * newly added song shows up immediately instead of waiting out a TTL.
 *
 * TTLs alone would work, but then "I added a song and the site still doesn't
 * show it" becomes a five-minute mystery. Explicit invalidation on write plus
 * a TTL as a safety net is the combination worth defending.
 */
export async function invalidateCatalogue(): Promise<number> {
  if (!redis) return 0;

  try {
    const keys = await redis.keys(`${CATALOGUE_PREFIX}*`);
    if (keys.length === 0) return 0;
    await redis.del(...keys);
    return keys.length;
  } catch (err) {
    console.error("cache invalidation failed:", (err as Error).message);
    return 0;
  }
}
