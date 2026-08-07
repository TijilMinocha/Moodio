import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { toSongDTO } from "@/lib/mappers";
import type { SongDTO } from "@/lib/types";

export interface PlaylistDTO {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  songCount?: number;
}

const SONG_SELECT =
  "id, title, album_id, duration_sec, artists ( name ), albums ( title, cover_path )";

/** Gap between adjacent positions, so an insert between two rows is one UPDATE. */
export const POSITION_GAP = 1000;

// ------------------------------------------------------------------- likes

export async function getLikedSongs(): Promise<SongDTO[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("liked_songs")
    .select(`liked_at, songs ( ${SONG_SELECT} )`)
    .order("liked_at", { ascending: false });

  if (error) throw new Error(`getLikedSongs: ${error.message}`);

  return (data ?? [])
    .map((row) => (Array.isArray(row.songs) ? row.songs[0] : row.songs))
    .filter(Boolean)
    .map((song) => toSongDTO(song as Parameters<typeof toSongDTO>[0]));
}

export async function getLikedSongIds(): Promise<string[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("liked_songs").select("song_id");
  if (error) throw new Error(`getLikedSongIds: ${error.message}`);
  return (data ?? []).map((r) => r.song_id);
}

// --------------------------------------------------------------- playlists

export async function getPlaylists(): Promise<PlaylistDTO[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, description, is_public, created_at, playlist_songs ( count )")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getPlaylists: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public,
    createdAt: row.created_at,
    songCount: (row.playlist_songs as { count: number }[] | null)?.[0]?.count,
  }));
}

export async function getPlaylistWithSongs(
  id: string,
): Promise<{ playlist: PlaylistDTO; songs: SongDTO[] } | null> {
  const supabase = await createServerSupabase();

  // RLS decides visibility here: your own playlists, plus anyone's public
  // ones. A playlist you should not see comes back as null, not as a leak.
  const { data: playlist, error } = await supabase
    .from("playlists")
    .select("id, name, description, is_public, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getPlaylistWithSongs: ${error.message}`);
  if (!playlist) return null;

  const { data: rows, error: songsError } = await supabase
    .from("playlist_songs")
    .select(`position, songs ( ${SONG_SELECT} )`)
    .eq("playlist_id", id)
    .order("position");

  if (songsError) throw new Error(`getPlaylistWithSongs: ${songsError.message}`);

  const songs = (rows ?? [])
    .map((row) => (Array.isArray(row.songs) ? row.songs[0] : row.songs))
    .filter(Boolean)
    .map((song) => toSongDTO(song as Parameters<typeof toSongDTO>[0]));

  return {
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      isPublic: playlist.is_public,
      createdAt: playlist.created_at,
    },
    songs,
  };
}
