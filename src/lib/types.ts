export type SongStatus = "pending" | "processing" | "ready" | "failed";

export interface Artist {
  id: string;
  name: string;
  image_url: string | null;
}

export interface Album {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  artist_id: string | null;
  year: number | null;
}

export interface Song {
  id: string;
  title: string;
  album_id: string;
  artist_id: string | null;
  duration_sec: number | null;
  storage_path: string;
  hls_path: string | null;
  status: SongStatus;
  waveform_peaks: number[] | null;
  energy: number | null;
  brightness: number | null;
  tempo: number | null;
}

/** What the API actually returns to the client -- no storage paths leak out. */
export interface SongDTO {
  id: string;
  title: string;
  artist: string | null;
  albumId: string;
  albumTitle: string | null;
  coverUrl: string | null;
  durationSec: number | null;
}

export interface AlbumDTO {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  artist: string | null;
  songCount?: number;
}
