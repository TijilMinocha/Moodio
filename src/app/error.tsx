"use client";

import { useEffect } from "react";

/**
 * Catches render and data-fetch errors below the root layout. Because it sits
 * inside the layout, the player keeps playing while this shows -- the music
 * does not stop just because one page failed to load.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-ink-muted">
        We could not load this page. This is usually temporary.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-ink-dim">
          Reference: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-brand px-6 py-2.5 font-bold text-white transition hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}
