/**
 * Audio feature extraction.
 *
 * Two cheap, well-understood descriptors, both computed once at ingest from
 * the PCM we already decode for the waveform:
 *
 *   energy     - RMS loudness. How hard the track pushes.
 *   brightness - spectral centroid. Where the "centre of mass" of the
 *                spectrum sits: bass-heavy tracks score low, tracks with a lot
 *                of cymbal/synth/air score high.
 *
 * These are proxies, not a mood classifier. A sad song played loud reads as
 * high energy. Real systems train on human-labelled data; this is signal
 * processing standing in for that, and the README says so.
 */

const FFT_SIZE = 2048;
const HOP = FFT_SIZE * 4; // Sparse sampling -- we want a summary, not a spectrogram.

export interface AudioFeatures {
  /** 0..1, RMS loudness */
  energy: number;
  /** 0..1, spectral centroid as a fraction of Nyquist */
  brightness: number;
  /** Estimated BPM, or null when no clear pulse was found */
  tempo: number | null;
}

/** Mix channels down to mono. Every feature below is computed on this. */
function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const length = channels[0].length;
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const channel of channels) sum += channel[i];
    mono[i] = sum / channels.length;
  }
  return mono;
}

/**
 * In-place iterative radix-2 Cooley-Tukey FFT.
 *
 * Written out rather than pulled from a package: it is ~30 lines, it is the
 * only DSP primitive needed here, and a dependency for this would be silly.
 */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;

        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;

        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/** RMS over the whole track. */
function rms(mono: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < mono.length; i++) sum += mono[i] * mono[i];
  return Math.sqrt(sum / mono.length);
}

/**
 * Mean spectral centroid across windowed FFTs, normalised to Nyquist.
 * A Hann window keeps the frame edges from leaking energy across the spectrum.
 */
function spectralCentroid(mono: Float32Array): number {
  const window = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
  }

  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  let centroidSum = 0;
  let frames = 0;

  for (let start = 0; start + FFT_SIZE < mono.length; start += HOP) {
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = mono[start + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);

    let weighted = 0;
    let total = 0;
    // Only the first half is meaningful -- the rest mirrors it.
    for (let bin = 1; bin < FFT_SIZE / 2; bin++) {
      const magnitude = Math.hypot(re[bin], im[bin]);
      weighted += bin * magnitude;
      total += magnitude;
    }

    if (total > 0) {
      // bin -> Hz -> fraction of Nyquist
      centroidSum += (weighted / total) / (FFT_SIZE / 2);
      frames++;
    }
  }

  return frames ? centroidSum / frames : 0;
}

/**
 * Tempo via spectral-flux onsets and autocorrelation.
 *
 * Build an onset strength envelope (how much the signal got louder frame to
 * frame), autocorrelate it, and take the strongest lag in the 60-180 BPM band.
 * Crude: it commonly reports half or double the true tempo, which is a known
 * failure mode of autocorrelation methods. Treated as a hint, not a fact.
 */
function estimateTempo(mono: Float32Array, sampleRate: number): number | null {
  const frame = 1024;
  const envelope: number[] = [];
  let previous = 0;

  for (let start = 0; start + frame < mono.length; start += frame) {
    let sum = 0;
    for (let i = start; i < start + frame; i++) sum += mono[i] * mono[i];
    const energy = Math.sqrt(sum / frame);
    envelope.push(Math.max(0, energy - previous)); // half-wave rectified flux
    previous = energy;
  }

  if (envelope.length < 64) return null;

  const mean = envelope.reduce((a, b) => a + b, 0) / envelope.length;
  const centred = envelope.map((v) => v - mean);

  const framesPerSecond = sampleRate / frame;
  const minLag = Math.floor((framesPerSecond * 60) / 180); // 180 BPM
  const maxLag = Math.ceil((framesPerSecond * 60) / 60); // 60 BPM

  let bestLag = 0;
  let bestScore = 0;

  for (let lag = minLag; lag <= maxLag && lag < centred.length / 2; lag++) {
    let score = 0;
    for (let i = 0; i + lag < centred.length; i++) {
      score += centred[i] * centred[i + lag];
    }
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (!bestLag || bestScore <= 0) return null;
  return Math.round((framesPerSecond * 60) / bestLag);
}

export function computeFeatures(
  channels: Float32Array[],
  sampleRate: number,
): AudioFeatures {
  const mono = toMono(channels);
  return {
    energy: Number(rms(mono).toFixed(4)),
    brightness: Number(spectralCentroid(mono).toFixed(4)),
    tempo: estimateTempo(mono, sampleRate),
  };
}
