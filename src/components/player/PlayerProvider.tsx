"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { SongDTO } from "@/lib/types";
import { buildPlayOrder } from "@/lib/shuffle";

export type RepeatMode = "off" | "all" | "one";

/**
 * `play()` rejects with an AbortError whenever a new load interrupts it, which
 * happens every time the user skips tracks. Chrome words it as "The play()
 * request was interrupted by a call to pause()". It is noise, not an error.
 */
function isBenignPlaybackAbort(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  const message = err instanceof Error ? err.message : "";
  return /interrupted by|aborted|removed from the document/i.test(message);
}

/**
 * Every play() in this file goes through here.
 *
 * A bare `audio.play()` returns a promise that rejects on interruption, and an
 * uncaught rejection surfaces as a "Runtime AbortError" in Next's dev overlay
 * even though nothing is actually broken. Swallowing only the benign aborts
 * keeps real failures visible.
 */
async function safePlay(audio: HTMLAudioElement): Promise<void> {
  try {
    await audio.play();
  } catch (err) {
    if (isBenignPlaybackAbort(err)) return;
    throw err;
  }
}

interface PlayerState {
  queue: SongDTO[];
  index: number;
  current: SongDTO | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  loading: boolean;
  error: string | null;
  /** e.g. "160 kbps", "original" -- what is actually streaming right now. */
  quality: string | null;
}

interface PlayerActions {
  playQueue: (songs: SongDTO[], startIndex?: number) => void;
  shufflePlay: (songs: SongDTO[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekToFraction: (fraction: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (song: SongDTO) => void;
  playNext: (song: SongDTO) => void;
  removeFromQueue: (songId: string) => void;
  reorderQueue: (activeId: string, overId: string) => void;
  clearQueue: () => void;
  jumpTo: (songId: string) => void;
}

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

/**
 * Owns the single <audio> element for the whole app.
 *
 * This provider is mounted in the root layout, not in a page. If it lived in a
 * page, navigating from the home grid into an album would unmount it and the
 * music would cut out mid-song.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);

  const [queue, setQueue] = useState<SongDTO[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Human-readable label for the ladder hls.js currently has selected.
  const [quality, setQuality] = useState<string | null>(null);

  // Playback order over `queue`. With shuffle off this is [0,1,2,...].
  const playOrderRef = useRef<number[]>([]);
  // Guards against out-of-order responses when the user skips tracks quickly:
  // only the most recent stream request is allowed to set audio.src.
  const requestTokenRef = useRef(0);
  // `repeat` is read inside the `ended` listener, which is registered once.
  // Mirrored into a ref via an effect rather than assigned during render --
  // writing to a ref while rendering is not safe under concurrent React.
  const repeatRef = useRef(repeat);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  const current = queue[index] ?? null;

  /**
   * Rebuild the playback order. Passing the artist lookup lets shuffle spread
   * same-artist tracks apart instead of letting them cluster -- see
   * spreadByArtist for why uniform randomness feels broken to listeners.
   */
  const rebuildOrder = useCallback(
    (songs: SongDTO[], on: boolean, startAt: number) => {
      playOrderRef.current = buildPlayOrder(
        songs.length,
        on,
        startAt,
        (i) => songs[i]?.artist ?? "",
      );
    },
    [],
  );

  /** Tear down any hls.js instance attached to the audio element. */
  const detachHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  /**
   * Point the audio element at a song.
   *
   * Prefers HLS so quality adapts to the listener's bandwidth mid-track. Three
   * paths, in order:
   *
   *   1. hls.js via Media Source Extensions -- Chrome, Firefox, Edge.
   *   2. Native HLS -- Safari plays .m3u8 straight from an <audio> src.
   *   3. Progressive MP3 -- browsers with neither, and songs not transcoded yet.
   *
   * The fallback matters: a song added but not yet run through
   * `npm run transcode` still plays, just without adaptive switching.
   */
  const loadSong = useCallback(
    async (song: SongDTO, autoplay: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;

      const token = ++requestTokenRef.current;
      setLoading(true);
      setError(null);
      detachHls();

      const playProgressive = async () => {
        const res = await fetch(`/api/songs/${song.id}/stream`);
        if (!res.ok) throw new Error(`Could not load "${song.title}"`);
        const { url } = (await res.json()) as { url: string };
        if (token !== requestTokenRef.current) return;
        audio.src = url;
        setQuality("original");
        if (autoplay) await safePlay(audio);
      };

      try {
        const manifestUrl = `/api/songs/${song.id}/manifest`;
        const head = await fetch(manifestUrl, { method: "HEAD" });
        if (token !== requestTokenRef.current) return;

        if (!head.ok) {
          await playProgressive();
          return;
        }

        const { default: Hls } = await import("hls.js");
        if (token !== requestTokenRef.current) return;

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;

          hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
            const level = hls.levels[data.level];
            if (level) setQuality(`${Math.round(level.bitrate / 1000)} kbps`);
          });

          hls.on(Hls.Events.ERROR, (_e, data) => {
            // Only fatal errors matter -- hls.js recovers from the rest itself.
            if (!data.fatal) return;
            console.error("hls fatal", data.type, data.details);
            detachHls();
            void playProgressive().catch(() => {
              setError("Playback failed");
              setIsPlaying(false);
            });
          });

          hls.loadSource(manifestUrl);
          hls.attachMedia(audio);
          if (autoplay) await safePlay(audio);
        } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
          audio.src = manifestUrl;
          setQuality("auto");
          if (autoplay) await safePlay(audio);
        } else {
          await playProgressive();
        }
      } catch (err) {
        if (token !== requestTokenRef.current) return;
        // Changing tracks quickly makes the browser abort the in-flight
        // play(). That is expected, not a failure the user should ever read
        // about -- the new track is already loading.
        if (isBenignPlaybackAbort(err)) return;
        setError(err instanceof Error ? err.message : "Playback failed");
        setIsPlaying(false);
      } finally {
        if (token === requestTokenRef.current) setLoading(false);
      }
    },
    [detachHls],
  );

  /** Advance through playOrder. `auto` distinguishes song-ended from a click. */
  const advance = useCallback(
    (direction: 1 | -1, auto = false) => {
      setIndex((currentIndex) => {
        const order = playOrderRef.current;
        const position = order.indexOf(currentIndex);
        if (position === -1) return currentIndex;

        // repeat: "one" only replays automatically; pressing next still skips.
        if (auto && repeatRef.current === "one") return currentIndex;

        const nextPosition = position + direction;

        if (nextPosition >= order.length) {
          if (repeatRef.current === "all") return order[0];
          if (auto) setIsPlaying(false);
          return currentIndex;
        }
        if (nextPosition < 0) {
          return repeatRef.current === "all"
            ? order[order.length - 1]
            : currentIndex;
        }
        return order[nextPosition];
      });
    },
    [],
  );

  // Wire up the audio element once.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    // Reset the progress readout from the element's own lifecycle rather than
    // from the track-change effect, so React only ever reacts to the audio
    // element instead of racing it.
    const onLoadStart = () => {
      setCurrentTime(0);
      setDuration(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (repeatRef.current === "one") {
        audio.currentTime = 0;
        void safePlay(audio);
        return;
      }
      advance(1, true);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onLoadedMetadata);
    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onLoadedMetadata);
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
    };
  }, [advance]);

  // Destroy any live hls.js instance when the provider goes away.
  useEffect(() => detachHls, [detachHls]);

  // Load whenever the current song changes.
  const currentId = current?.id ?? null;
  useEffect(() => {
    if (!current) return;
    // loadSong flips `loading` before it starts fetching. This effect is the
    // sanctioned case for that rule -- synchronising an external system (the
    // audio element / hls.js) with React state -- and the loading flag is part
    // of that synchronisation, not derived data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSong(current, true);
    // Keyed on id alone: re-running on every `current` object identity or on a
    // new loadSong reference would restart the track mid-playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Keep the element in sync with volume/mute state.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const playQueue = useCallback(
    (songs: SongDTO[], startIndex = 0) => {
      if (songs.length === 0) return;
      setQueue(songs);
      rebuildOrder(songs, shuffle, startIndex);
      setIndex(startIndex);
    },
    [shuffle, rebuildOrder],
  );

  /**
   * Start a list shuffled in one action: turn shuffle on, pick a random
   * opening track, and build the spread order around it. Without this the user
   * has to press play, then toggle shuffle, which starts track 1 first and
   * only shuffles what comes after -- not what "shuffle play" means anywhere
   * else.
   */
  const shufflePlay = useCallback(
    (songs: SongDTO[]) => {
      if (songs.length === 0) return;
      const start = Math.floor(Math.random() * songs.length);
      setQueue(songs);
      setShuffle(true);
      rebuildOrder(songs, true, start);
      setIndex(start);
    },
    [rebuildOrder],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) void safePlay(audio);
    else audio.pause();
  }, [current]);

  const seekToFraction = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const clamped = Math.min(Math.max(fraction, 0), 1);
    audio.currentTime = audio.duration * clamped;
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((next: number) => {
    setVolumeState(Math.min(Math.max(next, 0), 1));
    if (next > 0) setMuted(false);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      const nextOn = !on;
      rebuildOrder(queue, nextOn, index);
      return nextOn;
    });
  }, [queue, index, rebuildOrder]);

  const cycleRepeat = useCallback(() => {
    setRepeat((mode) =>
      mode === "off" ? "all" : mode === "all" ? "one" : "off",
    );
  }, []);

  const addToQueue = useCallback((song: SongDTO) => {
    setQueue((q) => {
      if (q.some((s) => s.id === song.id)) return q;
      const next = [...q, song];
      playOrderRef.current = [...playOrderRef.current, next.length - 1];
      return next;
    });
  }, []);

  const playNext = useCallback(
    (song: SongDTO) => {
      setQueue((q) => {
        const without = q.filter((s) => s.id !== song.id);
        const at = Math.min(index + 1, without.length);
        const next = [...without.slice(0, at), song, ...without.slice(at)];
        rebuildOrder(next, shuffle, index);
        return next;
      });
    },
    [index, shuffle, rebuildOrder],
  );

  /**
   * Removing or reordering must keep the *same song* playing. The index is a
   * position, so we re-derive it from the current song's id afterwards --
   * otherwise dragging a track from below the playhead to above it would
   * silently jump playback to a different song.
   */
  const removeFromQueue = useCallback(
    (songId: string) => {
      setQueue((q) => {
        const next = q.filter((s) => s.id !== songId);
        const stillPlaying = next.findIndex((s) => s.id === currentId);
        const newIndex = stillPlaying === -1 ? 0 : stillPlaying;
        rebuildOrder(next, shuffle, newIndex);
        setIndex(newIndex);
        return next;
      });
    },
    [currentId, shuffle, rebuildOrder],
  );

  const reorderQueue = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;
      setQueue((q) => {
        const from = q.findIndex((s) => s.id === activeId);
        const to = q.findIndex((s) => s.id === overId);
        if (from === -1 || to === -1) return q;

        const next = [...q];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);

        const newIndex = next.findIndex((s) => s.id === currentId);
        const safeIndex = newIndex === -1 ? 0 : newIndex;
        rebuildOrder(next, shuffle, safeIndex);
        setIndex(safeIndex);
        return next;
      });
    },
    [currentId, shuffle, rebuildOrder],
  );

  const jumpTo = useCallback((songId: string) => {
    setQueue((q) => {
      const target = q.findIndex((s) => s.id === songId);
      if (target !== -1) setIndex(target);
      return q;
    });
  }, []);

  const clearQueue = useCallback(() => {
    const audio = audioRef.current;
    detachHls();
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    requestTokenRef.current++;
    playOrderRef.current = [];
    setQueue([]);
    setIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [detachHls]);

  const value = useMemo(
    () => ({
      queue,
      index,
      current,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      loading,
      error,
      quality,
      playQueue,
      shufflePlay,
      togglePlay,
      next: () => advance(1),
      previous: () => advance(-1),
      seekToFraction,
      setVolume,
      toggleMute: () => setMuted((m) => !m),
      toggleShuffle,
      cycleRepeat,
      addToQueue,
      playNext,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      jumpTo,
    }),
    [
      queue, index, current, isPlaying, currentTime, duration, volume, muted,
      shuffle, repeat, loading, error, quality, playQueue, shufflePlay, togglePlay, advance,
      seekToFraction, setVolume, toggleShuffle, cycleRepeat, addToQueue,
      playNext, removeFromQueue, reorderQueue, clearQueue, jumpTo,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
