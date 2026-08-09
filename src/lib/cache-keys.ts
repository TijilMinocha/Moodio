/**
 * Cache key names, shared between the app and the ingest/transcode scripts.
 *
 * Deliberately its own module with no imports: `cache.ts` is marked
 * "server-only", which throws the moment a plain Node script imports it. The
 * scripts still need to know which keys to invalidate, so the names live here
 * and both sides reference the same constants instead of hardcoding strings
 * that could drift apart.
 */
export const CATALOGUE_PREFIX = "moodio:catalogue:";

export const cacheKeys = {
  albums: `${CATALOGUE_PREFIX}albums`,
  album: (idOrSlug: string) => `${CATALOGUE_PREFIX}album:${idOrSlug}`,
  moodMap: `${CATALOGUE_PREFIX}mood-map`,
};
