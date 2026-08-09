"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/Modal";
import type { PlaylistDTO } from "@/lib/user-data";

/** Small dropdown: add this song to an existing playlist, or a brand new one. */
export function AddToPlaylist({ songId }: { songId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistDTO[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Load lazily -- most songs never get this menu opened.
  useEffect(() => {
    if (!open || playlists) return;
    fetch("/api/playlists")
      .then((r) => (r.ok ? r.json() : { playlists: [] }))
      .then((d: { playlists: PlaylistDTO[] }) => setPlaylists(d.playlists))
      .catch(() => setPlaylists([]));
  }, [open, playlists]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function addTo(playlistId: string) {
    const res = await fetch(`/api/playlists/${playlistId}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    });

    if (res.status === 409) setStatus("Already in that playlist");
    else if (!res.ok) setStatus("Could not add");
    else {
      setStatus("Added");
      router.refresh();
    }
    setTimeout(() => {
      setStatus(null);
      setOpen(false);
    }, 1200);
  }

  async function createAndAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      setStatus("Could not create");
      return;
    }
    const { playlist } = (await res.json()) as { playlist: PlaylistDTO };
    setPlaylists((p) => [playlist, ...(p ?? [])]);
    setNaming(false);
    setNewName("");
    await addTo(playlist.id);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Add to playlist"
        className="rounded-full border border-border px-3 py-1 text-xs text-ink-muted transition hover:border-brand hover:text-ink"
      >
        + Playlist
      </button>

      <Modal open={naming} onClose={() => setNaming(false)} title="New playlist">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void createAndAdd(newName);
          }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name"
            maxLength={100}
            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none placeholder:text-ink-dim focus:border-brand"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNaming(false)}
              className="rounded-full px-4 py-2 text-sm text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim()}
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>

      {open && (
        <div className="absolute bottom-full right-0 z-40 mb-1 w-56 rounded-lg border border-border/60 bg-surface-2 py-1 shadow-xl">
          {status && (
            <p className="px-3 py-2 text-xs text-brand">{status}</p>
          )}
          {playlists === null ? (
            <p className="px-3 py-2 text-xs text-ink-dim">Loading...</p>
          ) : (
            <>
              {playlists.length === 0 && (
                <p className="px-3 py-2 text-xs text-ink-dim">
                  No playlists yet
                </p>
              )}
              <ul className="max-h-48 overflow-y-auto">
                {playlists.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => void addTo(p.id)}
                      className="w-full truncate px-3 py-2 text-left text-sm hover:bg-surface-2"
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setOpen(false);
                  setNaming(true);
                }}
                className="mt-1 w-full border-t border-border/60 px-3 py-2 text-left text-sm text-brand hover:bg-surface-3"
              >
                + New playlist
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
