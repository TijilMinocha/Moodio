"use client";

import { AddToPlaylist } from "@/components/AddToPlaylist";
import { LikeButton, useLikes } from "@/components/LikesProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { formatTime } from "@/lib/format";
import type { SongDTO } from "@/lib/types";

/**
 * Client component: it needs the player context. The album page around it
 * stays a server component, so only this list ships to the browser.
 */
export function SongList({
  songs,
  onRemove,
}: {
  songs: SongDTO[];
  /** Supplied by the playlist page so rows can be removed from it. */
  onRemove?: (songId: string) => void;
}) {
  const { playQueue, addToQueue, playNext, current, isPlaying, togglePlay } =
    usePlayer();
  const { isSignedIn } = useLikes();

  return (
    <ul className="mt-6">
      {songs.map((song, i) => {
        const isCurrent = current?.id === song.id;
        return (
          <li
            key={song.id}
            className="group flex items-center gap-4 rounded px-3 py-2.5 hover:bg-white/10"
          >
            <button
              onClick={() => (isCurrent ? togglePlay() : playQueue(songs, i))}
              className="w-6 shrink-0 text-left text-sm text-white/40"
              aria-label={`Play ${song.title}`}
            >
              <span className="group-hover:hidden">
                {isCurrent ? (
                  <span className="text-green-500">{isPlaying ? "♪" : "❚❚"}</span>
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden group-hover:inline">▶</span>
            </button>

            <button
              onClick={() => (isCurrent ? togglePlay() : playQueue(songs, i))}
              className="min-w-0 flex-1 text-left"
            >
              <div
                className={`truncate font-medium ${isCurrent ? "text-green-500" : ""}`}
              >
                {song.title}
              </div>
              <div className="truncate text-sm text-white/50">
                {song.artist ?? "Unknown artist"}
              </div>
            </button>

            <LikeButton songId={song.id} />

            <div className="flex shrink-0 items-center gap-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
              <button
                onClick={() => playNext(song)}
                className="rounded border border-white/20 px-2 py-1 text-xs text-white/70 hover:border-white hover:text-white"
              >
                Play next
              </button>
              <button
                onClick={() => addToQueue(song)}
                className="rounded border border-white/20 px-2 py-1 text-xs text-white/70 hover:border-white hover:text-white"
              >
                + Queue
              </button>
              {isSignedIn && <AddToPlaylist songId={song.id} />}
              {onRemove && (
                <button
                  onClick={() => onRemove(song.id)}
                  aria-label={`Remove ${song.title} from playlist`}
                  className="px-1 text-white/40 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>

            <span className="w-12 shrink-0 text-right text-sm tabular-nums text-white/40">
              {formatTime(song.durationSec)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Play all" button in the album header. */
export function PlayAlbumButton({ songs }: { songs: SongDTO[] }) {
  const { playQueue } = usePlayer();

  if (songs.length === 0) return null;

  return (
    <button
      onClick={() => playQueue(songs, 0)}
      className="rounded-full bg-green-500 px-8 py-3 font-bold text-black transition hover:scale-105"
    >
      Play
    </button>
  );
}
