"use client";

import { useMemo, useState } from "react";

import { usePlayer } from "@/components/player/PlayerProvider";
import { MOODS, type MoodSong, type MoodThresholds } from "@/lib/moods";

const W = 640;
const H = 420;
const PAD = 44;

/**
 * The library plotted in feature space: energy across, brightness up, with the
 * median lines that divide the four moods.
 *
 * SVG rather than canvas here -- there are only a few dozen points, and SVG
 * gives hover and accessibility for free.
 */
export function MoodMap({
  songs,
  thresholds,
}: {
  songs: MoodSong[];
  thresholds: MoodThresholds;
}) {
  const { playQueue } = usePlayer();
  const [hovered, setHovered] = useState<MoodSong | null>(null);

  const bounds = useMemo(() => {
    const e = songs.map((s) => s.energy);
    const b = songs.map((s) => s.brightness);
    // Pad the extremes so points never sit exactly on the frame.
    const grow = (lo: number, hi: number) => {
      const margin = (hi - lo) * 0.12 || 0.01;
      return [lo - margin, hi + margin] as const;
    };
    return {
      energy: grow(Math.min(...e), Math.max(...e)),
      brightness: grow(Math.min(...b), Math.max(...b)),
    };
  }, [songs]);

  if (songs.length === 0) return null;

  const x = (energy: number) =>
    PAD +
    ((energy - bounds.energy[0]) / (bounds.energy[1] - bounds.energy[0])) *
      (W - PAD * 2);

  const y = (brightness: number) =>
    H -
    PAD -
    ((brightness - bounds.brightness[0]) /
      (bounds.brightness[1] - bounds.brightness[0])) *
      (H - PAD * 2);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[34rem]"
        role="img"
        aria-label="Library plotted by energy and brightness"
      >
        <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} fill="#0e1220" rx="12" />

        {/* Median split lines -- the mood boundaries */}
        <line x1={x(thresholds.energy)} y1={PAD} x2={x(thresholds.energy)} y2={H - PAD} stroke="#2a3350" strokeDasharray="4 4" />
        <line x1={PAD} y1={y(thresholds.brightness)} x2={W - PAD} y2={y(thresholds.brightness)} stroke="#2a3350" strokeDasharray="4 4" />

        {/* Quadrant labels */}
        <text x={PAD + 12} y={PAD + 22} fill={MOODS.chill.tint} fontSize="13" fontWeight="600">Chill</text>
        <text x={W - PAD - 12} y={PAD + 22} fill={MOODS.hype.tint} fontSize="13" fontWeight="600" textAnchor="end">Hype</text>
        <text x={PAD + 12} y={H - PAD - 12} fill={MOODS["late-night"].tint} fontSize="13" fontWeight="600">Late Night</text>
        <text x={W - PAD - 12} y={H - PAD - 12} fill={MOODS.focus.tint} fontSize="13" fontWeight="600" textAnchor="end">Focus</text>

        {/* Axes */}
        <text x={W / 2} y={H - 10} fill="#6b7280" fontSize="12" textAnchor="middle">energy (RMS loudness) &rarr;</text>
        <text x={14} y={H / 2} fill="#6b7280" fontSize="12" textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`}>brightness (spectral centroid) &rarr;</text>

        {songs.map((song) => (
          <circle
            key={song.id}
            cx={x(song.energy)}
            cy={y(song.brightness)}
            r={hovered?.id === song.id ? 8 : 5.5}
            fill={MOODS[song.mood].tint}
            stroke={hovered?.id === song.id ? "#e9ecf2" : "transparent"}
            strokeWidth="1.5"
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHovered(song)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => playQueue([song], 0)}
          >
            <title>{`${song.title} - ${song.artist ?? "Unknown"}`}</title>
          </circle>
        ))}
      </svg>

      <p className="mt-2 min-h-[2.5rem] text-sm text-ink-muted">
        {hovered ? (
          <>
            <span className="font-medium text-ink">{hovered.title}</span>
            <span className="text-ink-dim"> &middot; {hovered.artist}</span>
            <br />
            <span className="text-xs text-ink-dim">
              energy {hovered.energy.toFixed(3)} &middot; brightness{" "}
              {hovered.brightness.toFixed(3)}
              {hovered.tempo ? ` · ~${hovered.tempo} bpm` : ""} &middot;{" "}
              {MOODS[hovered.mood].name}
            </span>
          </>
        ) : (
          <span className="text-ink-dim">
            Hover a point for its features. Click to play it.
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * Energy slider: drag to a point on the energy axis and get the closest N
 * tracks as a queue. A different way into the same feature space, for when
 * none of the four buckets is quite what you want.
 */
export function EnergySlider({ songs }: { songs: MoodSong[] }) {
  const { playQueue } = usePlayer();
  const [target, setTarget] = useState(50);

  const range = useMemo(() => {
    const e = songs.map((s) => s.energy);
    return { min: Math.min(...e), max: Math.max(...e) };
  }, [songs]);

  const picked = useMemo(() => {
    const value = range.min + (target / 100) * (range.max - range.min);
    return [...songs]
      .sort((a, b) => Math.abs(a.energy - value) - Math.abs(b.energy - value))
      .slice(0, 8);
  }, [songs, target, range]);

  if (songs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Build a queue by energy</h2>
        <span className="text-xs text-ink-dim">
          {target < 33 ? "mellow" : target < 66 ? "steady" : "high"}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={target}
        onChange={(e) => setTarget(Number(e.target.value))}
        aria-label="Target energy"
        className="mt-4 w-full accent-brand"
      />

      <ul className="mt-4 space-y-1">
        {picked.map((song) => (
          <li key={song.id} className="flex items-center gap-3 text-sm">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: MOODS[song.mood].tint }}
            />
            <span className="min-w-0 flex-1 truncate">{song.title}</span>
            <span className="shrink-0 text-xs tabular-nums text-ink-dim">
              {song.energy.toFixed(3)}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => playQueue(picked, 0)}
        className="mt-5 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        Play these 8
      </button>
    </div>
  );
}
