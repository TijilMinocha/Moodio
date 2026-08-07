"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { usePlayer } from "@/components/player/PlayerProvider";
import { formatTime } from "@/lib/format";

export function Playbar() {
  const {
    current, isPlaying, currentTime, duration, volume, muted, shuffle, repeat,
    loading, error, togglePlay, next, previous, seekToFraction, setVolume,
    toggleMute, toggleShuffle, cycleRepeat,
  } = usePlayer();

  const seekRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcuts. Skipped while typing so space doesn't hijack inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore keys aimed at anything focusable. Space and the arrows already
      // mean something there: activating a button, moving a slider, and
      // picking up / moving a row in the drag-and-drop queue.
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, select, button, a, [contenteditable], [role="button"]',
        )
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowRight" && e.shiftKey) {
        next();
      } else if (e.code === "ArrowLeft" && e.shiftKey) {
        previous();
      } else if (e.code === "ArrowRight") {
        seekToFraction(duration ? (currentTime + 5) / duration : 0);
      } else if (e.code === "ArrowLeft") {
        seekToFraction(duration ? (currentTime - 5) / duration : 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, next, previous, seekToFraction, currentTime, duration]);

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = seekRef.current?.getBoundingClientRect();
    if (!rect) return;
    seekToFraction((e.clientX - rect.left) / rect.width);
  };

  if (!current) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#1a1a1a]/95 backdrop-blur">
      {/* Seekbar. Day 5 replaces this strip with the real waveform. */}
      <div
        ref={seekRef}
        onClick={handleSeek}
        className="group relative h-1.5 cursor-pointer bg-white/15"
      >
        <div
          className="h-full bg-green-500 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        {/* Now playing */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {current.coverUrl && (
            <Image
              src={current.coverUrl}
              alt=""
              width={48}
              height={48}
              className="hidden h-12 w-12 rounded object-cover sm:block"
              unoptimized
            />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{current.title}</div>
            <div className="truncate text-xs text-white/60">
              {error ? (
                <span className="text-red-400">{error}</span>
              ) : loading ? (
                "Loading..."
              ) : (
                (current.artist ?? "Unknown artist")
              )}
            </div>
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShuffle}
            title="Shuffle"
            aria-pressed={shuffle}
            className={`hidden text-lg sm:block ${shuffle ? "text-green-500" : "text-white/50 hover:text-white"}`}
          >
            ⤮
          </button>
          <button onClick={previous} title="Previous (Shift+Left)" className="opacity-80 hover:opacity-100">
            <Image src="/img/prevsong.svg" alt="Previous" width={30} height={30} className="invert" />
          </button>
          <button
            onClick={togglePlay}
            title="Play/Pause (Space)"
            className="rounded-full bg-white p-2 transition hover:scale-105"
          >
            <Image
              src={isPlaying ? "/img/pause.svg" : "/img/play.svg"}
              alt={isPlaying ? "Pause" : "Play"}
              width={22}
              height={22}
            />
          </button>
          <button onClick={next} title="Next (Shift+Right)" className="opacity-80 hover:opacity-100">
            <Image src="/img/nextsong.svg" alt="Next" width={30} height={30} className="invert" />
          </button>
          <button
            onClick={cycleRepeat}
            title={`Repeat: ${repeat}`}
            className={`hidden text-lg sm:block ${repeat !== "off" ? "text-green-500" : "text-white/50 hover:text-white"}`}
          >
            {repeat === "one" ? "🔂" : "🔁"}
          </button>
        </div>

        {/* Time + volume */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="hidden text-xs tabular-nums text-white/60 md:inline">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button onClick={toggleMute} title="Mute">
            <Image
              src={muted || volume === 0 ? "/img/mute.svg" : "/img/volume.svg"}
              alt="Volume"
              width={22}
              height={22}
              className="invert"
            />
          </button>
          {/* onChange fires continuously in React (it maps to the input event),
              unlike the old vanilla listener which only fired on release. */}
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="hidden w-24 accent-green-500 sm:block"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
