/**
 * Measures how biased the common one-line shuffle actually is.
 *
 *   npm run shuffle-bias
 *
 * Shuffles [A,B,C,D,E] 200,000 times with both algorithms and counts how often
 * each of the 120 possible orderings appears. A correct shuffle puts every
 * ordering at ~1/120 of the runs; the chi-square statistic below quantifies
 * how far each one strays from that.
 */
import { shuffleInPlace } from "../src/lib/shuffle.js";

const ITEMS = ["A", "B", "C", "D", "E"] as const;
const RUNS = 200_000;
const PERMUTATIONS = 120; // 5!
const EXPECTED = RUNS / PERMUTATIONS;

/** The version almost everyone writes first. */
function naiveShuffle(items: readonly string[]): string[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function tally(shuffle: (items: readonly string[]) => string[]) {
  const counts = new Map<string, number>();
  for (let i = 0; i < RUNS; i++) {
    const key = shuffle(ITEMS).join("");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Sum of (observed - expected)^2 / expected across all 120 orderings.
 * For a fair shuffle this lands near the degrees of freedom (119).
 * Values in the thousands mean the distribution is not uniform.
 */
function chiSquare(counts: Map<string, number>): number {
  let total = 0;
  for (const key of allPermutations()) {
    const observed = counts.get(key) ?? 0;
    total += (observed - EXPECTED) ** 2 / EXPECTED;
  }
  return total;
}

function allPermutations(): string[] {
  const out: string[] = [];
  const walk = (prefix: string[], rest: readonly string[]) => {
    if (rest.length === 0) return void out.push(prefix.join(""));
    rest.forEach((item, i) =>
      walk([...prefix, item], [...rest.slice(0, i), ...rest.slice(i + 1)]),
    );
  };
  walk([], ITEMS);
  return out;
}

function report(label: string, counts: Map<string, number>) {
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const most = entries[0];
  const least = entries[entries.length - 1];

  console.log(`\n${label}`);
  console.log(`  expected per ordering : ${EXPECTED.toFixed(0)}`);
  console.log(`  most common           : ${most[0]}  ${most[1]}  (${((most[1] / EXPECTED) * 100).toFixed(0)}% of expected)`);
  console.log(`  least common          : ${least[0]}  ${least[1]}  (${((least[1] / EXPECTED) * 100).toFixed(0)}% of expected)`);
  console.log(`  spread (max/min)      : ${(most[1] / Math.max(least[1], 1)).toFixed(2)}x`);
  console.log(`  chi-square (df=119)   : ${chiSquare(counts).toFixed(0)}`);
}

console.log(`Shuffling [${ITEMS.join(", ")}] ${RUNS.toLocaleString()} times with each algorithm...`);

report("naive:  arr.sort(() => Math.random() - 0.5)", tally(naiveShuffle));
report("correct: Fisher-Yates", tally((items) => shuffleInPlace<string>([...items])));

console.log(
  "\nA fair shuffle sits near 1.0x spread and chi-square close to 119.\n",
);
