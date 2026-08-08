"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

import { LikeButton } from "@/components/LikesProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { formatTime } from "@/lib/format";
import type { SongDTO } from "@/lib/types";

function Row({
  song,
  songs,
  playlistId,
  onRemove,
}: {
  song: SongDTO;
  songs: SongDTO[];
  playlistId: string;
  onRemove: (songId: string) => void;
}) {
  const { playQueue, current, isPlaying, togglePlay } = usePlayer();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id });

  const isCurrent = current?.id === song.id;
  const index = songs.findIndex((s) => s.id === song.id);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-3 rounded px-3 py-2.5 ${
        isDragging ? "z-10 bg-surface-3 shadow-lg" : "hover:bg-surface-2"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${song.title}`}
        className="cursor-grab px-1 text-ink-dim hover:text-ink-muted active:cursor-grabbing"
      >
        ⠿
      </button>

      <button
        onClick={() => (isCurrent ? togglePlay() : playQueue(songs, index))}
        className="min-w-0 flex-1 text-left"
      >
        <div className={`truncate font-medium ${isCurrent ? "text-brand" : ""}`}>
          {song.title}
          {isCurrent && <span className="ml-2 text-xs">{isPlaying ? "♪" : "❚❚"}</span>}
        </div>
        <div className="truncate text-sm text-ink-muted">
          {song.artist ?? "Unknown artist"}
        </div>
      </button>

      <LikeButton songId={song.id} />

      <span className="w-12 shrink-0 text-right text-sm tabular-nums text-ink-dim">
        {formatTime(song.durationSec)}
      </span>

      <button
        onClick={() => onRemove(song.id)}
        aria-label={`Remove ${song.title} from playlist`}
        className="px-1 text-ink-dim opacity-0 transition hover:text-danger group-hover:opacity-100"
        data-playlist={playlistId}
      >
        ✕
      </button>
    </li>
  );
}

export function PlaylistSongs({
  playlistId,
  initial,
}: {
  playlistId: string;
  initial: SongDTO[];
}) {
  const [songs, setSongs] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * Reorder optimistically, then tell the server where the song landed by
   * naming its new predecessor. The server computes the midpoint position, so
   * this is one UPDATE rather than rewriting every row.
   */
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = songs;
    const from = songs.findIndex((s) => s.id === active.id);
    const to = songs.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;

    const next = [...songs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSongs(next);

    const landedAt = next.findIndex((s) => s.id === active.id);
    const afterSongId = landedAt === 0 ? null : next[landedAt - 1].id;

    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: active.id, afterSongId }),
      });
      if (!res.ok) throw new Error("reorder failed");
      setError(null);
    } catch {
      setSongs(previous);
      setError("Could not save the new order.");
    }
  }

  async function remove(songId: string) {
    const previous = songs;
    setSongs((s) => s.filter((x) => x.id !== songId));

    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
      if (!res.ok) throw new Error("remove failed");
      setError(null);
    } catch {
      setSongs(previous);
      setError("Could not remove that song.");
    }
  }

  if (songs.length === 0) {
    return (
      <p className="mt-10 text-ink-muted">
        This playlist is empty. Add songs with the &ldquo;+ Playlist&rdquo;
        button on any track.
      </p>
    );
  }

  return (
    <>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext
          items={songs.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-6">
            {songs.map((song) => (
              <Row
                key={song.id}
                song={song}
                songs={songs}
                playlistId={playlistId}
                onRemove={(id) => void remove(id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
