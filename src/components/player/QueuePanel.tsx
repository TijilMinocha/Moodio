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

import { usePlayer } from "@/components/player/PlayerProvider";
import { formatTime } from "@/lib/format";
import type { SongDTO } from "@/lib/types";

function QueueRow({
  song,
  isCurrent,
  onPlay,
  onRemove,
}: {
  song: SongDTO;
  isCurrent: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 rounded px-2 py-2 text-sm ${
        isDragging ? "z-10 bg-surface-3 shadow-lg" : "hover:bg-surface-2"
      } ${isCurrent ? "text-brand" : "text-ink"}`}
    >
      {/* Drag handle is its own element so clicking the row still plays it.
          dnd-kit's listeners include keyboard, so this is draggable via
          Tab + Space + arrow keys too. */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 text-ink-dim hover:text-ink-muted active:cursor-grabbing"
        aria-label={`Reorder ${song.title}`}
      >
        ⠿
      </button>

      <button onClick={onPlay} className="min-w-0 flex-1 text-left">
        <div className="truncate">{song.title}</div>
        <div className="truncate text-xs text-ink-muted">
          {song.artist ?? "Unknown artist"}
        </div>
      </button>

      <span className="text-xs tabular-nums text-ink-dim">
        {formatTime(song.durationSec)}
      </span>
      <button
        onClick={onRemove}
        className="px-1 text-ink-dim opacity-0 transition hover:text-danger group-hover:opacity-100"
        aria-label={`Remove ${song.title} from queue`}
      >
        ✕
      </button>
    </li>
  );
}

export function QueuePanel() {
  const {
    queue, current, shuffle, jumpTo, removeFromQueue, reorderQueue,
    clearQueue, toggleShuffle,
  } = usePlayer();

  const sensors = useSensors(
    // A small distance threshold means a click still registers as a click
    // rather than starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderQueue(String(active.id), String(over.id));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-sm font-bold tracking-wide">
          Queue{" "}
          <span className="font-normal text-ink-dim">({queue.length})</span>
        </h2>
        {queue.length > 0 && (
          <div className="flex items-center gap-1">
            {/* Reorders playback, not the list below -- the queue stays in the
                order you arranged it, so turning shuffle off restores it. */}
            <button
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              title={
                shuffle
                  ? "Smart shuffle on - same artists spread apart"
                  : "Smart shuffle"
              }
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                shuffle
                  ? "bg-brand/20 text-brand"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink"
              }`}
            >
              ⤮ Shuffle
            </button>
            <button
              onClick={clearQueue}
              className="rounded-full px-2 py-1 text-xs text-ink-dim transition hover:bg-surface-2 hover:text-ink"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {queue.length === 0 ? (
        <p className="px-3 text-xs leading-relaxed text-ink-dim">
          Nothing queued yet. Pick an album to start listening.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext
            items={queue.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex-1 overflow-y-auto px-1 pb-4">
              {queue.map((song) => (
                <QueueRow
                  key={song.id}
                  song={song}
                  isCurrent={song.id === current?.id}
                  onPlay={() => jumpTo(song.id)}
                  onRemove={() => removeFromQueue(song.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
