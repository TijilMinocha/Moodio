import { AlbumGridSkeleton } from "@/components/Skeletons";

/**
 * Streamed instantly while the page's server component awaits its data.
 * Without this the browser sits on the previous page during navigation.
 */
export default function Loading() {
  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mb-8">
        <div className="h-9 w-40 animate-pulse rounded bg-surface-2" />
      </div>
      <AlbumGridSkeleton />
    </div>
  );
}
