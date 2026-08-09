"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { ShuffleIcon } from "@/components/icons";
import { usePlayer } from "@/components/player/PlayerProvider";
import { formatTime } from "@/lib/format";
import { MOODS, type MoodSong } from "@/lib/moods";
import { washFrom } from "@/lib/tint";

const QUEUE_SIZE = 10;

/**
 * Pick a point on the energy scale and get a playlist built around it.
 *
 * Replaces the scatter plot that used to live here. The plot was interesting to
 * me but useless to a listener -- nobody opens a music app wanting to read a
 * chart of spectral centroids. The slider exposes the same feature space in the
 * one way that is actually usable: drag, hear the result.
 */
export function MoodMeter({ songs }: { songs: MoodSong[] }) {
  const { playQueue, shufflePlay, current } = usePlayer();
  const [target, setTarget] = useState(50);

  const range = useMemo(() => {
    const values = songs.map((s) => s.energy);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [songs]);

  const picked = useMemo(() => {
    const value = range.min + (target / 100) * (range.max - range.min);
    return [...songs]
      .sort((a, b) => Math.abs(a.energy - value) - Math.abs(b.energy - value))
      .slice(0, QUEUE_SIZE);
  }, [songs, target, range]);

  // Whichever mood most of the picks belong to -- used to colour the panel so
  // the slider visibly moves between moods rather than just reordering a list.
  const dominant = useMemo(() => {
    const counts = new Map<string, number>();
    for (const song of picked) {
      counts.set(song.mood, (counts.get(song.mood) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? MOODS[top[0] as keyof typeof MOODS] : MOODS.chill;
  }, [picked]);

  if (songs.length === 0) {
    return (
      <p className="mt-8 text-ink-muted">
        Nothing analysed yet. Run <code className="text-ink">npm run ingest</code>.
      </p>
    );
  }

  const label = target < 25 ? "Mellow" : target < 55 ? "Easy" : target < 80 ? "Driving" : "Loud";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-all duration-500"
        style={{ backgroundImage: washFrom(dominant.tint) }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight">{label}</h2>
          <span className="text-sm text-ink-muted">
            mostly {dominant.name.toLowerCase()}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          aria-label="Energy"
          className="mt-5 w-full accent-brand"
        />
        <div className="mt-1 flex justify-between text-xs text-ink-dim">
          <span>calm</span>
          <span>energetic</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => playQueue(picked, 0)}
            className="rounded-full bg-brand px-7 py-2.5 font-bold text-white transition hover:brightness-110"
          >
            Play
          </button>
          <button
            onClick={() => shufflePlay(picked)}
            className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-semibold text-ink-muted transition hover:border-brand hover:text-ink"
          >
            <ShuffleIcon size={18} />
            Shuffle
          </button>
        </div>

        <ul className="mt-6 space-y-0.5">
          {picked.map((song, i) => {
            const isCurrent = current?.id === song.id;
            return (
              <li
                key={song.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                  isCurrent ? "bg-brand/10" : "hover:bg-surface-2"
                }`}
              >
                <span className="w-5 shrink-0 text-sm text-ink-dim">{i + 1}</span>
                {song.coverUrl && (
                  <Image
                    src={song.coverUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded object-cover"
                    unoptimized
                  />
                )}
                <button
                  onClick={() => playQueue(picked, i)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div
                    className={`truncate font-medium ${isCurrent ? "text-brand" : ""}`}
                  >
                    {song.title}
                  </div>
                  <div className="truncate text-xs text-ink-muted">
                    {song.artist ?? "Unknown artist"}
                  </div>
                </button>
                <span
                  className="hidden shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium sm:inline"
                  style={{ backgroundColor: `${MOODS[song.mood].tint}55` }}
                >
                  {MOODS[song.mood].name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-dim">
                  {formatTime(song.durationSec)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
