import { SongListSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="h-48 w-48 shrink-0 animate-pulse rounded-lg bg-surface-2" />
        <div className="flex-1">
          <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
          <div className="mt-3 h-12 w-2/3 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 h-4 w-1/3 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
      <SongListSkeleton />
    </div>
  );
}
