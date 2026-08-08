/**
 * Shows smart shuffle running against your actual library.
 *
 *   npm run shuffle-demo
 *
 * Builds a queue from every song in the catalogue, shuffles it both ways, and
 * counts how often two tracks by the same artist land back to back. That
 * adjacency count is the thing users actually perceive as "shuffle is broken".
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { shuffleInPlace, spreadByArtist } from "../src/lib/shuffle.js";

config({ path: ".env.local" });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

interface Track {
  title: string;
  artist: string;
}

const { data, error } = await db
  .from("songs")
  .select("title, artists ( name )")
  .eq("status", "ready");

if (error) {
  console.error("Could not load songs:", error.message);
  process.exit(1);
}

const tracks: Track[] = (data ?? []).map((row) => {
  const a = row.artists as { name: string } | { name: string }[] | null;
  const artist = Array.isArray(a) ? a[0]?.name : a?.name;
  return { title: row.title, artist: artist ?? "Unknown" };
});

/** How many neighbouring pairs share an artist. Lower is better. */
function adjacentRepeats(list: Track[]): number {
  let n = 0;
  for (let i = 1; i < list.length; i++) {
    if (list[i].artist === list[i - 1].artist) n++;
  }
  return n;
}

const TRIALS = 2000;
let plainTotal = 0;
let smartTotal = 0;
let plainWorst = 0;

for (let i = 0; i < TRIALS; i++) {
  const plain = shuffleInPlace([...tracks]);
  const smart = spreadByArtist(shuffleInPlace([...tracks]), (t) => t.artist);
  const p = adjacentRepeats(plain);
  plainTotal += p;
  plainWorst = Math.max(plainWorst, p);
  smartTotal += adjacentRepeats(smart);
}

console.log(`Library: ${tracks.length} tracks, ${new Set(tracks.map((t) => t.artist)).size} artists`);
console.log(`Averaged over ${TRIALS.toLocaleString()} shuffles:\n`);
console.log(`  plain Fisher-Yates  : ${(plainTotal / TRIALS).toFixed(2)} same-artist pairs back to back (worst seen: ${plainWorst})`);
console.log(`  + artist spreading  : ${(smartTotal / TRIALS).toFixed(2)}`);

console.log("\nOne sample queue with spreading on:\n");
for (const t of spreadByArtist(shuffleInPlace([...tracks]), (x) => x.artist).slice(0, 14)) {
  console.log(`  ${t.artist.padEnd(34)} ${t.title}`);
}
