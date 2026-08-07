"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { PlaylistDTO } from "@/lib/user-data";

/** Small dropdown: add this song to an existing playlist, or a brand new one. */
export function AddToPlaylist({ songId }: { songId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistDTO[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
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

  async function createAndAdd() {
    const name = prompt("New playlist name")?.trim();
    if (!name) return;

    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setStatus("Could not create");
      return;
    }
    const { playlist } = (await res.json()) as { playlist: PlaylistDTO };
    setPlaylists((p) => [playlist, ...(p ?? [])]);
    await addTo(playlist.id);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Add to playlist"
        className="rounded border border-white/20 px-2 py-1 text-xs text-white/70 hover:border-white hover:text-white"
      >
        + Playlist
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-40 mb-1 w-56 rounded-lg border border-white/10 bg-[#1c1c1c] py-1 shadow-xl">
          {status && (
            <p className="px-3 py-2 text-xs text-green-400">{status}</p>
          )}
          {playlists === null ? (
            <p className="px-3 py-2 text-xs text-white/40">Loading...</p>
          ) : (
            <>
              {playlists.length === 0 && (
                <p className="px-3 py-2 text-xs text-white/40">
                  No playlists yet
                </p>
              )}
              <ul className="max-h-48 overflow-y-auto">
                {playlists.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => void addTo(p.id)}
                      className="w-full truncate px-3 py-2 text-left text-sm hover:bg-white/10"
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => void createAndAdd()}
                className="mt-1 w-full border-t border-white/10 px-3 py-2 text-left text-sm text-green-400 hover:bg-white/10"
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
