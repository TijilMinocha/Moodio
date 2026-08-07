import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { toAlbumDTO, toSongDTO } from "@/lib/mappers";
import type { AlbumDTO, SongDTO } from "@/lib/types";

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

export async function getAlbums(): Promise<AlbumDTO[]> {
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
}

export async function getAlbumWithSongs(
  idOrSlug: string,
): Promise<{ album: AlbumDTO; songs: SongDTO[] } | null> {
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
      "id, title, album_id, duration_sec, artists ( name ), albums ( title, cover_path )",
    )
    .eq("album_id", album.id)
    .eq("status", "ready")
    .order("title");

  if (songsError) throw new Error(`getAlbumWithSongs: ${songsError.message}`);

  return { album: toAlbumDTO(album), songs: songs.map(toSongDTO) };
}
