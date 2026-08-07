"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface LikesValue {
  liked: Set<string>;
  isSignedIn: boolean;
  toggle: (songId: string) => Promise<void>;
}

const LikesContext = createContext<LikesValue | null>(null);

export function useLikes() {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error("useLikes must be used inside <LikesProvider>");
  return ctx;
}

export function LikesProvider({
  isSignedIn,
  children,
}: {
  isSignedIn: boolean;
  children: React.ReactNode;
}) {
  const [liked, setLiked] = useState<Set<string>>(new Set());

  // One request for the whole set, rather than a "is this liked?" call per row.
  // No signed-out reset needed: the layout keys this provider on auth state,
  // so logging out remounts it with a fresh empty set.
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    fetch("/api/likes")
      .then((r) => (r.ok ? r.json() : { songIds: [] }))
      .then((data: { songIds: string[] }) => {
        if (!cancelled) setLiked(new Set(data.songIds));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  /**
   * Optimistic: flip the heart immediately, roll back if the request fails.
   * A like is cheap and reversible, so waiting for the round-trip would make
   * the UI feel broken for no safety benefit.
   */
  const toggle = useCallback(
    async (songId: string) => {
      if (!isSignedIn) return;

      const wasLiked = liked.has(songId);
      setLiked((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(songId);
        else next.add(songId);
        return next;
      });

      try {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        });
        if (!res.ok) throw new Error("request failed");

        // Trust the server's answer over our guess.
        const { liked: nowLiked } = (await res.json()) as { liked: boolean };
        setLiked((prev) => {
          const next = new Set(prev);
          if (nowLiked) next.add(songId);
          else next.delete(songId);
          return next;
        });
      } catch {
        setLiked((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(songId);
          else next.delete(songId);
          return next;
        });
      }
    },
    [isSignedIn, liked],
  );

  const value = useMemo(
    () => ({ liked, isSignedIn, toggle }),
    [liked, isSignedIn, toggle],
  );

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
}

export function LikeButton({ songId }: { songId: string }) {
  const { liked, isSignedIn, toggle } = useLikes();
  const isLiked = liked.has(songId);

  if (!isSignedIn) return null;

  return (
    <button
      onClick={() => void toggle(songId)}
      aria-pressed={isLiked}
      aria-label={isLiked ? "Remove from liked songs" : "Add to liked songs"}
      className={`shrink-0 px-1 text-lg transition ${
        isLiked ? "text-green-500" : "text-white/30 hover:text-white"
      }`}
    >
      {isLiked ? "♥" : "♡"}
    </button>
  );
}
