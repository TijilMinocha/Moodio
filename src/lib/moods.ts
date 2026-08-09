import type { SongDTO } from "@/lib/types";

/**
 * Mood buckets over the (energy, brightness) plane.
 *
 * Classification is *relative to the library*, splitting at the median of each
 * axis rather than at fixed constants. Measured across the current catalogue,
 * energy spans only 0.147-0.356 and brightness 0.080-0.161 -- any absolute
 * threshold would be a number pulled from thin air, and would silently stop
 * working as soon as the library grew or a louder master arrived. A median
 * split always produces four populated quadrants and adapts on its own.
 *
 * The honest caveat: these are signal-processing proxies. Loudness is not
 * happiness, and a sad song played loud lands in Hype. Real systems train on
 * human-labelled data.
 */
export type MoodSlug = "late-night" | "chill" | "focus" | "hype";

export interface Mood {
  slug: MoodSlug;
  name: string;
  blurb: string;
  /** Soft tint, matching the colour-to-black treatment used elsewhere. */
  tint: string;
}

export const MOODS: Record<MoodSlug, Mood> = {
  "late-night": {
    slug: "late-night",
    name: "Late Night",
    blurb: "Low and warm. For the small hours.",
    tint: "#3d3a72",
  },
  chill: {
    slug: "chill",
    name: "Chill",
    blurb: "Easy going, with air in the mix.",
    tint: "#1f4f6b",
  },
  focus: {
    slug: "focus",
    name: "Focus",
    blurb: "Driving but dark. Keeps you moving.",
    tint: "#1d5450",
  },
  hype: {
    slug: "hype",
    name: "Hype",
    blurb: "Loud and bright. Volume up.",
    tint: "#7a2450",
  },
};

export const MOOD_LIST: Mood[] = [
  MOODS.chill,
  MOODS.focus,
  MOODS.hype,
  MOODS["late-night"],
];

export function isMoodSlug(value: string): value is MoodSlug {
  return value in MOODS;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export interface MoodThresholds {
  energy: number;
  brightness: number;
}

export function classify(
  energy: number,
  brightness: number,
  t: MoodThresholds,
): MoodSlug {
  const loud = energy >= t.energy;
  const bright = brightness >= t.brightness;
  if (loud && bright) return "hype";
  if (loud && !bright) return "focus";
  if (!loud && bright) return "chill";
  return "late-night";
}

/** A song plus where it sits in the feature space. */
export interface MoodSong extends SongDTO {
  energy: number;
  brightness: number;
  tempo: number | null;
  mood: MoodSlug;
}
