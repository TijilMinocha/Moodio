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
        isDragging ? "z-10 bg-white/15 shadow-lg" : "hover:bg-white/10"
      } ${isCurrent ? "text-green-500" : "text-white/85"}`}
    >
      {/* Drag handle is its own element so clicking the row still plays it.
          dnd-kit's listeners include keyboard, so this is draggable via
          Tab + Space + arrow keys too. */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 text-white/30 hover:text-white/70 active:cursor-grabbing"
        aria-label={`Reorder ${song.title}`}
      >
        ⠿
      </button>

      <button onClick={onPlay} className="min-w-0 flex-1 text-left">
        <div className="truncate">{song.title}</div>
        <div className="truncate text-xs text-white/50">
          {song.artist ?? "Unknown artist"}
        </div>
      </button>

      <span className="text-xs tabular-nums text-white/40">
        {formatTime(song.durationSec)}
      </span>
      <button
        onClick={onRemove}
        className="px-1 text-white/30 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
        aria-label={`Remove ${song.title} from queue`}
      >
        ✕
      </button>
    </li>
  );
}

export function QueuePanel() {
  const { queue, current, jumpTo, removeFromQueue, reorderQueue, clearQueue } =
    usePlayer();

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
          <span className="font-normal text-white/40">({queue.length})</span>
        </h2>
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="text-xs text-white/40 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <p className="px-3 text-xs leading-relaxed text-white/40">
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
