"use client";

import Image from "next/image";
import { useEffect } from "react";

import { usePlayer } from "@/components/player/PlayerProvider";
import { Waveform } from "@/components/player/Waveform";
import { formatTime } from "@/lib/format";

/** Three animated bars, shown on the current track. */
export function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 0.3, 0.15].map((delay, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm bg-brand ${playing ? "eq-bar" : ""}`}
          style={{
            height: "100%",
            animationDelay: `${delay}s`,
            transform: playing ? undefined : "scaleY(0.35)",
          }}
        />
      ))}
    </span>
  );
}

export function Playbar() {
  const {
    current, isPlaying, currentTime, duration, volume, muted, shuffle, repeat,
    loading, error, togglePlay, next, previous, seekToFraction, setVolume,
    toggleMute, toggleShuffle, cycleRepeat,
  } = usePlayer();

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

  // Nothing queued: keep the row's height so the grid doesn't jump when the
  // first track starts.
  if (!current) {
    return (
      <div className="hidden h-[4.5rem] items-center justify-center border-t border-border/60 bg-surface/80 px-6 text-sm text-ink-muted backdrop-blur lg:flex">
        Pick an album to start listening
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 bg-surface/85 backdrop-blur">
      <Waveform
        peaks={current.waveformPeaks}
        progress={duration ? currentTime / duration : 0}
        onSeek={seekToFraction}
      />

      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        {/* Now playing */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {current.coverUrl && (
            <Image
              src={current.coverUrl}
              alt=""
              width={48}
              height={48}
              className="hidden h-12 w-12 rounded-lg object-cover ring-1 ring-border sm:block"
              unoptimized
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Equalizer playing={isPlaying} />
              <span className="truncate text-sm font-semibold">{current.title}</span>
            </div>
            <div className="truncate text-xs text-ink-muted">
              {error ? (
                <span className="text-danger">{error}</span>
              ) : loading ? (
                "Loading..."
              ) : (
                (current.artist ?? "Unknown artist")
              )}
            </div>
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleShuffle}
            title="Shuffle"
            aria-pressed={shuffle}
            className={`hidden rounded p-1.5 text-lg transition sm:block ${
              shuffle ? "text-brand" : "text-ink-muted hover:text-ink"
            }`}
          >
            ⤮
          </button>
          <button
            onClick={previous}
            title="Previous (Shift+Left)"
            className="rounded p-1 opacity-70 transition hover:opacity-100"
          >
            <Image src="/img/prevsong.svg" alt="Previous" width={26} height={26} className="invert" />
          </button>
          <button
            onClick={togglePlay}
            title="Play/Pause (Space)"
            className="grid h-11 w-11 place-items-center rounded-full bg-brand transition hover:brightness-110"
          >
            <Image
              src={isPlaying ? "/img/pause.svg" : "/img/play.svg"}
              alt={isPlaying ? "Pause" : "Play"}
              width={20}
              height={20}
            />
          </button>
          <button
            onClick={next}
            title="Next (Shift+Right)"
            className="rounded p-1 opacity-70 transition hover:opacity-100"
          >
            <Image src="/img/nextsong.svg" alt="Next" width={26} height={26} className="invert" />
          </button>
          <button
            onClick={cycleRepeat}
            title={`Repeat: ${repeat}`}
            className={`hidden rounded p-1.5 text-base transition sm:block ${
              repeat !== "off" ? "text-brand" : "text-ink-muted hover:text-ink"
            }`}
          >
            {repeat === "one" ? "🔂" : "🔁"}
          </button>
        </div>

        {/* Time + volume */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="hidden text-xs tabular-nums text-ink-muted md:inline">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button onClick={toggleMute} title="Mute" className="opacity-70 hover:opacity-100">
            <Image
              src={muted || volume === 0 ? "/img/mute.svg" : "/img/volume.svg"}
              alt="Volume"
              width={20}
              height={20}
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
            className="hidden w-24 accent-brand sm:block"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
