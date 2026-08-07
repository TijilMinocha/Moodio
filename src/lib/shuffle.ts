/**
 * Fisher-Yates shuffle. Each of the n! orderings is equally likely.
 *
 * The tempting one-liner `arr.sort(() => Math.random() - 0.5)` is NOT a
 * uniform shuffle -- it gives the sort an inconsistent comparator, so some
 * orderings come out far more often than others. Day 5 adds a script that
 * measures the difference, plus artist-spreading on top of this.
 */
export function shuffleIndices(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Playback order over the queue. When shuffle is on, `startAt` is forced to
 * the front so toggling shuffle never yanks the user off the current song.
 */
export function buildPlayOrder(
  queueLength: number,
  shuffle: boolean,
  startAt: number,
): number[] {
  if (queueLength === 0) return [];
  if (!shuffle) return Array.from({ length: queueLength }, (_, i) => i);

  const order = shuffleIndices(queueLength).filter((i) => i !== startAt);
  return [startAt, ...order];
}
