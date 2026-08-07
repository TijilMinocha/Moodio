"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PlaylistDTO } from "@/lib/user-data";

export function PlaylistManager({ initial }: { initial: PlaylistDTO[] }) {
  const router = useRouter();
  const [playlists, setPlaylists] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function remove(id: string, playlistName: string) {
    if (!confirm(`Delete "${playlistName}"? This cannot be undone.`)) return;

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
      <form onSubmit={create} className="mt-6 flex max-w-md gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name"
          maxLength={100}
          className="flex-1 rounded border border-white/20 bg-black px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-full bg-green-500 px-5 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {playlists.length === 0 ? (
        <p className="mt-8 text-white/50">
          No playlists yet. Create one above, or use the &ldquo;+ Playlist&rdquo;
          button on any song.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-[#181818] p-4 hover:bg-[#242424]"
            >
              <Link href={`/playlist/${p.id}`} className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.name}</div>
                <div className="mt-1 text-xs text-white/50">
                  {p.songCount ?? 0} songs
                </div>
              </Link>
              <button
                onClick={() => void remove(p.id, p.name)}
                aria-label={`Delete ${p.name}`}
                className="shrink-0 px-2 text-white/30 hover:text-red-400"
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
