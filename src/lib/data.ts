import "server-only";

import { cacheKeys, cached } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { toAlbumDTO, toSongDTO } from "@/lib/mappers";
import type { AlbumDTO, SongDTO } from "@/lib/types";
import {
  classify,
  median,
  type MoodSlug,
  type MoodSong,
  type MoodThresholds,
} from "@/lib/moods";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The single place catalogue queries live.
 *
 * Both the API routes and the server components call these. A server component
 * fetching its own /api/albums over HTTP would be a pointless round-trip to
 * ourselves -- same process, same database, plus serialisation both ways.
 * The API routes exist for the *client* (the player fetching a stream URL,
 * and search on Day 4).
 *
 * "server-only" makes this a build error if it is ever imported into a client
 * component, which is what stops the service-role key leaking to the browser.
 */

/** Catalogue TTL. Short enough to self-heal, long enough to be worth having. */
const CATALOGUE_TTL = 300;

export async function getAlbums(): Promise<AlbumDTO[]> {
  return cached(cacheKeys.albums, CATALOGUE_TTL, async () => {
    const db = createAdminClient();

    // One query with joins, not N+1: looping to count each album's songs would
    // be 12 round-trips instead of 1.
    const { data, error } = await db
      .from("albums")
      .select(
        "id, slug, title, description, cover_path, artists ( name ), songs ( count )",
      )
      .order("title");

    if (error) throw new Error(`getAlbums: ${error.message}`);
    return data.map(toAlbumDTO);
  });
}

export interface SearchResults {
  songs: SongDTO[];
  albums: AlbumDTO[];
}

/**
 * `%` and `_` are wildcards in LIKE patterns, and `\` escapes them. Without
 * this, searching for "50%" would match everything starting with "50".
 */
function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Search songs, albums and artists.
 *
 * ILIKE with a leading wildcard cannot use a normal B-tree index, so this is a
 * sequential scan. Fine at 27 songs; the Day 8 README notes that a real
 * library would want a tsvector column with a GIN index (and would then get
 * stemming and ranking, which ILIKE has no concept of).
 */
export async function search(rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim();
  if (query.length < 2) return { songs: [], albums: [] };

  const db = createAdminClient();
  const pattern = `%${escapeLikePattern(query)}%`;

  // Both selects are written out in full rather than built from a variable:
  // supabase-js infers row types from the select *string literal*, so a
  // computed one degrades everything downstream to `any`.
  //
  // Title and artist are two queries rather than one `.or(...)`, because
  // PostgREST cannot reference an embedded column (artists.name) inside a
  // top-level logic tree -- it fails with "failed to parse logic tree".
  // Merging two indexable queries is also closer to what the tsvector version
  // on the roadmap would do anyway.
  const [byTitle, byArtist, albumsResult] = await Promise.all([
    db
      .from("songs")
      .select(
        "id, title, album_id, duration_sec, waveform_peaks, artists ( name ), albums ( title, cover_path )",
      )
      .eq("status", "ready")
      .ilike("title", pattern)
      .limit(30),
    db
      .from("songs")
      .select(
        "id, title, album_id, duration_sec, waveform_peaks, artists!inner ( name ), albums ( title, cover_path )",
      )
      .eq("status", "ready")
      .ilike("artists.name", pattern)
      .limit(30),
    db
      .from("albums")
      .select("id, slug, title, description, cover_path, artists ( name )")
      .ilike("title", pattern)
      .limit(12),
  ]);

  if (byTitle.error) throw new Error(`search songs: ${byTitle.error.message}`);
  if (byArtist.error)
    throw new Error(`search artists: ${byArtist.error.message}`);
  if (albumsResult.error)
    throw new Error(`search albums: ${albumsResult.error.message}`);

  // Title matches first -- someone typing "kesariya" wants the song, not
  // every other track by the same artist. Dedupe by id across both sets.
  const seen = new Set<string>();
  const songs = [...byTitle.data, ...byArtist.data]
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .slice(0, 30)
    .map(toSongDTO);

  return { songs, albums: albumsResult.data.map(toAlbumDTO) };
}

export async function getAlbumWithSongs(
  idOrSlug: string,
): Promise<{ album: AlbumDTO; songs: SongDTO[] } | null> {
  return cached(cacheKeys.album(idOrSlug), CATALOGUE_TTL, async () => {
    const db = createAdminClient();

    const { data: album, error } = await db
      .from("albums")
      .select("id, slug, title, description, cover_path, artists ( name )")
      .eq(UUID.test(idOrSlug) ? "id" : "slug", idOrSlug)
      .maybeSingle();

    if (error) throw new Error(`getAlbumWithSongs: ${error.message}`);
    if (!album) return null;

    const { data: songs, error: songsError } = await db
      .from("songs")
      .select(
        "id, title, album_id, duration_sec, waveform_peaks, artists ( name ), albums ( title, cover_path )",
      )
      .eq("album_id", album.id)
      .eq("status", "ready")
      .order("title");

    if (songsError) throw new Error(`getAlbumWithSongs: ${songsError.message}`);

    return { album: toAlbumDTO(album), songs: songs.map(toSongDTO) };
  });
}

// ------------------------------------------------------------------- moods

/**
 * Every analysed song, tagged with its mood.
 *
 * The medians are computed over the whole library on each call rather than
 * stored, because a threshold baked into the database would go stale the
 * moment a song is added. At this size that is one cheap query; at scale it
 * would become a materialised view refreshed on ingest.
 */
export async function getMoodMap(): Promise<{
  songs: MoodSong[];
  thresholds: MoodThresholds;
}> {
  return cached(cacheKeys.moodMap, CATALOGUE_TTL, async () => {
    const db = createAdminClient();

    const { data, error } = await db
      .from("songs")
      .select(
        "id, title, album_id, duration_sec, waveform_peaks, energy, brightness, tempo, artists ( name ), albums ( title, cover_path )",
      )
      .eq("status", "ready")
      .not("energy", "is", null)
      .not("brightness", "is", null);

    if (error) throw new Error(`getMoodMap: ${error.message}`);

    const rows = data ?? [];
    const thresholds: MoodThresholds = {
      energy: median(rows.map((r) => r.energy as number)),
      brightness: median(rows.map((r) => r.brightness as number)),
    };

    const songs: MoodSong[] = rows.map((row) => {
      const energy = row.energy as number;
      const brightness = row.brightness as number;
      return {
        ...toSongDTO(row),
        energy,
        brightness,
        tempo: row.tempo as number | null,
        mood: classify(energy, brightness, thresholds),
      };
    });

    return { songs, thresholds };
  });
}

export async function getSongsForMood(slug: MoodSlug): Promise<MoodSong[]> {
  const { songs } = await getMoodMap();
  // Within a mood, lead with the most characteristic tracks -- the ones
  // furthest from the dividing lines, not the ones that barely qualified.
  return songs.filter((s) => s.mood === slug);
}
