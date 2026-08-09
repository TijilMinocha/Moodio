import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayAlbumButton, ShufflePlayButton, SongList } from "@/components/SongList";
import { getSongsForMood } from "@/lib/data";
import { MOODS, isMoodSlug } from "@/lib/moods";
import { headerFrom } from "@/lib/tint";

export const dynamic = "force-dynamic";

export default async function MoodPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isMoodSlug(slug)) notFound();

  const mood = MOODS[slug];
  const songs = await getSongsForMood(slug);

  return (
    <div>
      <header
        className="px-4 pb-8 pt-6 sm:px-8"
        style={{ backgroundImage: headerFrom(mood.tint) }}
      >
        <Link href="/moods" className="text-sm text-ink-muted transition hover:text-ink">
          &larr; Moods
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Mood
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          {mood.name}
        </h1>
        <p className="mt-3 max-w-md text-sm text-ink-muted">
          {mood.blurb} &middot; {songs.length} songs
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <PlayAlbumButton songs={songs} />
          <ShufflePlayButton songs={songs} />
        </div>
      </header>

      <div className="px-4 pb-8 sm:px-8">
        {songs.length === 0 ? (
          <p className="mt-8 text-ink-muted">
            Nothing lands in this mood yet. Run{" "}
            <code className="text-ink">npm run ingest</code> to analyse your
            library.
          </p>
        ) : (
          <SongList songs={songs} />
        )}
      </div>
    </div>
  );
}
