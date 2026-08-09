import Link from "next/link";

import { MoodMeter } from "@/components/MoodMeter";
import { getMoodMap } from "@/lib/data";
import { MOOD_LIST } from "@/lib/moods";
import { washFrom } from "@/lib/tint";

export const dynamic = "force-dynamic";

export default async function MoodsPage() {
  const { songs } = await getMoodMap();

  const countFor = (slug: string) =>
    songs.filter((s) => s.mood === slug).length;

  return (
    <div className="px-4 py-6 sm:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Moods</h1>
      </header>

      <h2 className="mb-3 mt-7 text-lg font-semibold">Pick a mood</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOOD_LIST.map((mood) => (
          <Link
            key={mood.slug}
            href={`/mood/${mood.slug}`}
            className="relative overflow-hidden rounded-xl bg-surface p-5 transition-colors hover:bg-surface-2"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: washFrom(mood.tint) }}
            />
            <h3 className="relative font-semibold">{mood.name}</h3>
            <p className="relative mt-1 text-xs leading-relaxed text-ink-muted">
              {mood.blurb}
            </p>
            <p className="relative mt-3 text-xs text-ink-dim">
              {countFor(mood.slug)} songs
            </p>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Or dial it in</h2>
      <MoodMeter songs={songs} />
    </div>
  );
}
