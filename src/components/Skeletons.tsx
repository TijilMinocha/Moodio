export function AlbumGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg bg-surface p-4">
          <div className="mb-4 aspect-square animate-pulse rounded bg-surface-2" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export function SongListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="mt-6 space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-3 py-2.5">
          <div className="h-4 w-4 animate-pulse rounded bg-surface-2" />
          <div className="flex-1">
            <div className="h-4 w-1/3 animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-3 w-1/5 animate-pulse rounded bg-surface-2" />
          </div>
          <div className="h-3 w-10 animate-pulse rounded bg-surface-2" />
        </li>
      ))}
    </ul>
  );
}
