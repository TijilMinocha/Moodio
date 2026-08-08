/**
 * Deterministic colour-to-black gradients for cards and page headers.
 *
 * Spotify gives every playlist its own colour wash; the colour is a property
 * of the item, not something random per render. Hashing the id means an album
 * keeps the same tint forever, across reloads and across users, without
 * storing anything in the database or extracting a palette from the artwork.
 *
 * All hues are deliberately dark and desaturated -- they read as "tinted
 * black", not as colour blocks.
 */
const TINTS = [
  "#7c1f2e", // deep red
  "#7a2450", // plum / pink
  "#7a5a1f", // amber
  "#15514d", // teal
  "#2b3a78", // indigo
  "#4a2a68", // purple
  "#6b3320", // rust
  "#1f4a6b", // slate blue
] as const;

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0; // force 32-bit
  }
  return Math.abs(h);
}

/**
 * A separate, cooler palette for user-created playlists, so your own
 * playlists never get mistaken for the curated ones at a glance.
 */
const USER_TINTS = [
  "#1f4f6b", // steel
  "#2f4a7c", // denim
  "#3d3a72", // periwinkle
  "#4a2f63", // mauve
  "#1d5450", // pine
  "#54406b", // heather
] as const;

/** Liked Songs is always the same soft red -- it is one fixed thing. */
export const LIKED_TINT = "#7a2230";

export function tintFor(id: string): string {
  return TINTS[hash(id) % TINTS.length];
}

export function userTintFor(id: string): string {
  return USER_TINTS[hash(id) % USER_TINTS.length];
}

/** Soft wash for a card: tint at low opacity fading into the surface. */
export function cardGradient(id: string): string {
  return washFrom(tintFor(id));
}

export function userCardGradient(id: string): string {
  return washFrom(userTintFor(id));
}

export function washFrom(tint: string): string {
  return `linear-gradient(160deg, ${tint}38 0%, ${tint}14 38%, transparent 72%)`;
}

/** Stronger wash for a page header, fading into the page background. */
export function headerGradient(id: string): string {
  return headerFrom(tintFor(id));
}

export function userHeaderGradient(id: string): string {
  return headerFrom(userTintFor(id));
}

export function headerFrom(tint: string): string {
  return `linear-gradient(to bottom, ${tint}cc 0%, ${tint}55 45%, #0a0c10 100%)`;
}
