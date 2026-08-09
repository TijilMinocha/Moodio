"use client";

import { useEffect, useRef, useState } from "react";

import { AlbumCard } from "@/components/AlbumCard";
import { SongList } from "@/components/SongList";
import type { AlbumDTO, SongDTO } from "@/lib/types";

const DEBOUNCE_MS = 250;

interface SearchState {
  forQuery: string;
  songs: SongDTO[];
  albums: AlbumDTO[];
}

export function SearchClient() {
  const [query, setQuery] = useState("");
  // Results carry the query they belong to, so "which results are current" is
  // derived at render time rather than cleared by an effect.
  const [data, setData] = useState<SearchState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One in-flight request at a time: a new keystroke aborts the previous
  // fetch, so a slow early response can never overwrite a newer one.
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      abortRef.current?.abort();
      return;
    }

    // Debounce: wait for a pause in typing instead of firing per keystroke.
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error("Search failed");
          return r.json();
        })
        .then((res: { songs: SongDTO[]; albums: AlbumDTO[] }) => {
          setData({ forQuery: trimmed, ...res });
          setError(null);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Something went wrong. Try again.");
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed]);

  // Stale results for a previous query simply do not render.
  const results =
    data && data.forQuery === trimmed && trimmed.length >= 2 ? data : null;
  const showEmpty =
    results && results.songs.length === 0 && results.albums.length === 0;

  return (
    <div className="mt-6">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Songs, artists or albums"
        maxLength={100}
        autoFocus
        aria-label="Search"
        className="w-full max-w-xl rounded-full border border-border bg-surface px-5 py-3 outline-none focus:border-brand"
      />

      {trimmed.length === 1 && (
        <p className="mt-4 text-sm text-ink-dim">Keep typing...</p>
      )}

      {error && <p className="mt-6 text-sm text-danger">{error}</p>}

      {loading && !results && trimmed.length >= 2 && (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-surface-2" />
          ))}
        </div>
      )}

      {showEmpty && (
        <p className="mt-8 text-ink-muted">
          No results for &ldquo;{trimmed}&rdquo;.
        </p>
      )}

      {results && results.albums.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Albums</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {results.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {results && results.songs.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Songs</h2>
          <SongList songs={results.songs} />
        </section>
      )}
    </div>
  );
}
