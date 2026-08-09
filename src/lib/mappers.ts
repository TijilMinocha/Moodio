import type { AlbumDTO, SongDTO } from "@/lib/types";

/**
 * Covers live in a public bucket, so their URL is stable and CDN-cacheable --
 * no signing round-trip needed just to render a grid of album art.
 */
export function coverUrl(coverPath: string | null): string | null {
  if (!coverPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/covers/${coverPath}`;
}

/**
 * PostgREST returns a many-to-one embed as a single object, but supabase-js
 * cannot infer that without generated types and widens it to an array. Accept
 * both shapes and normalise, so the mappers work either way.
 */
type Embedded<T> = T | T[] | null;

function one<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Shapes returned by our Supabase selects. */
interface AlbumRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  artists: Embedded<{ name: string }>;
  songs?: { count: number }[];
}

interface SongRow {
  id: string;
  title: string;
  album_id: string;
  duration_sec: number | null;
  waveform_peaks: number[] | null;
  artists: Embedded<{ name: string }>;
  albums: Embedded<{ title: string; cover_path: string | null }>;
}

export function toAlbumDTO(row: AlbumRow): AlbumDTO {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverUrl: coverUrl(row.cover_path),
    artist: one(row.artists)?.name ?? null,
    songCount: row.songs?.[0]?.count,
  };
}

/**
 * Note what is missing: storage_path never leaves the server. Clients get an
 * id and ask /api/songs/[id]/stream for a short-lived signed URL instead.
 */
export function toSongDTO(row: SongRow): SongDTO {
  const album = one(row.albums);
  return {
    id: row.id,
    title: row.title,
    artist: one(row.artists)?.name ?? null,
    albumId: row.album_id,
    albumTitle: album?.title ?? null,
    coverUrl: coverUrl(album?.cover_path ?? null),
    durationSec: row.duration_sec,
    waveformPeaks: row.waveform_peaks,
  };
}
