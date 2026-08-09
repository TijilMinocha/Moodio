"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PLAYED = "#4d8df6"; // brand
const HOVERED = "#39445c";
const UPCOMING = "#262a34";

/**
 * Waveform scrubber.
 *
 * Draws the precomputed peaks from the song row -- no audio is decoded here.
 * Played bars are brand blue, upcoming bars are dim, and hovering previews
 * where a click would seek to.
 *
 * Falls back to a plain progress bar when a song has no peaks (rows ingested
 * before waveforms existed, or a file the decoder choked on).
 */
export function Waveform({
  peaks,
  progress,
  onSeek,
  height = 40,
}: {
  peaks: number[] | null;
  /** 0..1 */
  progress: number;
  onSeek: (fraction: number) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The element we measure carries no padding, so clientX maths stays honest.
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track || !peaks?.length) return;

    const width = track.clientWidth;
    if (width === 0) return;

    // Render at device resolution so bars aren't blurry on HiDPI screens.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const count = peaks.length;
    const slot = width / count;
    const barWidth = Math.max(1, slot * 0.62);
    const mid = height / 2;

    for (let i = 0; i < count; i++) {
      const fraction = (i + 0.5) / count;
      const isPlayed = fraction <= progress;
      const isHovered = hover !== null && fraction <= hover && !isPlayed;

      ctx.fillStyle = isPlayed ? PLAYED : isHovered ? HOVERED : UPCOMING;

      // The 1.5px floor keeps silent passages visible as a hairline instead of
      // rendering as gaps in the strip.
      const amplitude = Math.max(peaks[i] * (mid - 1), 1.5);
      ctx.fillRect(i * slot, mid - amplitude, barWidth, amplitude * 2);
    }
  }, [peaks, progress, hover, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  // A canvas is a fixed pixel buffer, so unlike an SVG it does not reflow with
  // its container -- it has to be redrawn on resize.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(track);
    return () => observer.disconnect();
  }, [draw]);

  const fractionFromEvent = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  const a11y = {
    role: "slider" as const,
    "aria-label": "Seek",
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": Math.round(progress * 100),
    tabIndex: 0,
  };

  // No peaks for this track: plain bar, identical interaction.
  if (!peaks?.length) {
    return (
      <div
        ref={trackRef}
        onClick={(e) => onSeek(fractionFromEvent(e.clientX))}
        className="h-1.5 cursor-pointer bg-surface-3"
        {...a11y}
      >
        <div
          className="h-full bg-brand transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 sm:px-6">
      <div
        ref={trackRef}
        onClick={(e) => onSeek(fractionFromEvent(e.clientX))}
        onMouseMove={(e) => setHover(fractionFromEvent(e.clientX))}
        onMouseLeave={() => setHover(null)}
        className="cursor-pointer select-none"
        style={{ height }}
        {...a11y}
      >
        <canvas ref={canvasRef} className="block" aria-hidden />
      </div>
    </div>
  );
}
