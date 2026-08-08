"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/Modal";
import { userCardGradient } from "@/lib/tint";
import type { PlaylistDTO } from "@/lib/user-data";

export function PlaylistManager({ initial }: { initial: PlaylistDTO[] }) {
  const router = useRouter();
  const [playlists, setPlaylists] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<PlaylistDTO | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { playlist } = (await res.json()) as { playlist: PlaylistDTO };
      setPlaylists((p) => [playlist, ...p]);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setConfirming(null);

    const previous = playlists;
    setPlaylists((p) => p.filter((x) => x.id !== id));

    const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setPlaylists(previous);
      setError("Could not delete playlist");
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Delete playlist?"
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          &ldquo;{confirming?.name}&rdquo; will be removed permanently. The
          songs stay in your library.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setConfirming(null)}
            className="rounded-full px-4 py-2 text-sm text-ink-muted transition hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={() => confirming && void remove(confirming.id)}
            className="rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Delete
          </button>
        </div>
      </Modal>

      <form onSubmit={create} className="mt-6 flex max-w-md gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name"
          maxLength={100}
          className="flex-1 rounded border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {playlists.length === 0 ? (
        <p className="mt-8 text-ink-muted">
          No playlists yet. Create one above, or use the &ldquo;+ Playlist&rdquo;
          button on any song.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-surface p-4 transition-colors hover:bg-surface-2"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: userCardGradient(p.id) }}
              />
              <Link href={`/playlist/${p.id}`} className="relative min-w-0 flex-1">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="mt-1 text-xs text-ink-muted">
                  {p.songCount ?? 0} songs
                </div>
              </Link>
              <button
                onClick={() => setConfirming(p)}
                aria-label={`Delete ${p.name}`}
                className="relative shrink-0 px-2 text-ink-dim opacity-0 transition hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
