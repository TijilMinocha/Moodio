"use client";

import { AddToPlaylist } from "@/components/AddToPlaylist";
import { LikeButton, useLikes } from "@/components/LikesProvider";
import { Equalizer } from "@/components/player/Playbar";
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
    <ul className="mt-6 space-y-0.5">
      {songs.map((song, i) => {
        const isCurrent = current?.id === song.id;
        return (
          <li
            key={song.id}
            className={`group flex items-center gap-4 rounded-xl px-3 py-2.5 transition ${
              isCurrent ? "bg-brand/10" : "hover:bg-surface-2"
            }`}
          >
            <button
              onClick={() => (isCurrent ? togglePlay() : playQueue(songs, i))}
              className="grid w-6 shrink-0 place-items-center text-sm text-ink-muted"
              aria-label={`Play ${song.title}`}
            >
              <span className="group-hover:hidden">
                {isCurrent ? <Equalizer playing={isPlaying} /> : i + 1}
              </span>
              <span className="hidden text-brand group-hover:inline">▶</span>
            </button>

            <button
              onClick={() => (isCurrent ? togglePlay() : playQueue(songs, i))}
              className="min-w-0 flex-1 text-left"
            >
              <div
                className={`truncate font-medium ${isCurrent ? "text-brand" : ""}`}
              >
                {song.title}
              </div>
              <div className="truncate text-sm text-ink-muted">
                {song.artist ?? "Unknown artist"}
              </div>
            </button>

            <LikeButton songId={song.id} />

            <div className="flex shrink-0 items-center gap-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
              <button
                onClick={() => playNext(song)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted transition hover:border-brand hover:text-ink"
              >
                Play next
              </button>
              <button
                onClick={() => addToQueue(song)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted transition hover:border-brand hover:text-ink"
              >
                + Queue
              </button>
              {isSignedIn && <AddToPlaylist songId={song.id} />}
              {onRemove && (
                <button
                  onClick={() => onRemove(song.id)}
                  aria-label={`Remove ${song.title} from playlist`}
                  className="px-1 text-ink-muted transition hover:text-danger"
                >
                  ✕
                </button>
              )}
            </div>

            <span className="w-12 shrink-0 text-right text-sm tabular-nums text-ink-muted">
              {formatTime(song.durationSec)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Play all" button in a page header. */
export function PlayAlbumButton({ songs }: { songs: SongDTO[] }) {
  const { playQueue } = usePlayer();

  if (songs.length === 0) return null;

  return (
    <button
      onClick={() => playQueue(songs, 0)}
      className="rounded-full bg-brand px-8 py-3 font-bold text-white transition hover:brightness-110"
    >
      Play
    </button>
  );
}

/**
 * Start the whole list shuffled. Distinct from the playbar's shuffle toggle:
 * that one changes what plays *after* the current track, this one begins on a
 * random track straight away.
 */
export function ShufflePlayButton({ songs }: { songs: SongDTO[] }) {
  const { shufflePlay } = usePlayer();

  if (songs.length < 2) return null;

  return (
    <button
      onClick={() => shufflePlay(songs)}
      title="Shuffle - spreads the same artist apart"
      className="rounded-full border border-border px-6 py-3 font-semibold text-ink-muted transition hover:border-brand hover:text-ink"
    >
      ⤮ Shuffle
    </button>
  );
}
