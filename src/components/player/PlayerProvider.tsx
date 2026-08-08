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

  /** Fetch a fresh signed URL and point the audio element at it. */
  const loadSong = useCallback(async (song: SongDTO, autoplay: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;

    const token = ++requestTokenRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/songs/${song.id}/stream`);
      if (!res.ok) throw new Error(`Could not load "${song.title}"`);
      const { url } = (await res.json()) as { url: string };

      // A newer request landed while we were waiting -- discard this one.
      if (token !== requestTokenRef.current) return;

      audio.src = url;
      if (autoplay) await audio.play();
    } catch (err) {
      if (token !== requestTokenRef.current) return;
      setError(err instanceof Error ? err.message : "Playback failed");
      setIsPlaying(false);
    } finally {
      if (token === requestTokenRef.current) setLoading(false);
    }
  }, []);

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
        void audio.play();
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

  // Load whenever the current song changes.
  const currentId = current?.id ?? null;
  useEffect(() => {
    if (!current) return;
    void loadSong(current, true);
    // Keyed on id so re-renders with an equal object don't reload the track.
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
    if (audio.paused) void audio.play();
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
  }, []);

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
      shuffle, repeat, loading, error, playQueue, shufflePlay, togglePlay, advance,
      seekToFraction, setVolume, toggleShuffle, cycleRepeat, addToQueue,
      playNext, removeFromQueue, reorderQueue, clearQueue, jumpTo,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
