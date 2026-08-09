/**
 * Waveform peaks.
 *
 * A 4-minute MP3 is ~12 million samples per channel. Decoding that in the
 * browser on every play would cost seconds of CPU and tens of megabytes of
 * transfer, for a strip of bars a few hundred pixels wide.
 *
 * So it is computed exactly once, at ingest, and reduced to PEAK_COUNT floats
 * (~1.5KB of JSON) stored on the song row. Every future playback gets the
 * waveform for free. Same principle as a materialised view or a denormalised
 * counter: move the work from read-time to write-time, because reads vastly
 * outnumber writes.
 */
export const PEAK_COUNT = 200;

/**
 * Reduce decoded PCM to PEAK_COUNT normalised values in [0, 1].
 *
 * Each bucket keeps its loudest sample rather than its average: averaging
 * washes out transients and every song ends up looking like the same gentle
 * blob. Peak-per-bucket is what makes a waveform look like the music.
 */
export function extractPeaks(
  channels: Float32Array[],
  peakCount = PEAK_COUNT,
): number[] {
  if (channels.length === 0 || channels[0].length === 0) {
    return new Array(peakCount).fill(0);
  }

  const length = channels[0].length;
  const bucketSize = Math.floor(length / peakCount) || 1;
  const peaks: number[] = new Array(peakCount).fill(0);

  for (let bucket = 0; bucket < peakCount; bucket++) {
    const start = bucket * bucketSize;
    const end = Math.min(start + bucketSize, length);

    let peak = 0;
    for (let i = start; i < end; i++) {
      for (const channel of channels) {
        const value = Math.abs(channel[i]);
        if (value > peak) peak = value;
      }
    }
    peaks[bucket] = peak;
  }

  // Normalise against the track's own loudest moment, so a quiet recording
  // still fills the strip instead of rendering as a flat line.
  const max = Math.max(...peaks);
  if (max > 0) {
    for (let i = 0; i < peaks.length; i++) {
      peaks[i] = Math.round((peaks[i] / max) * 1000) / 1000;
    }
  }

  return peaks;
}
