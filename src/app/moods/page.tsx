import Link from "next/link";

import { EnergySlider, MoodMap } from "@/components/MoodMap";
import { getMoodMap } from "@/lib/data";
import { MOOD_LIST } from "@/lib/moods";
import { washFrom } from "@/lib/tint";

export const dynamic = "force-dynamic";

export default async function MoodsPage() {
  const { songs, thresholds } = await getMoodMap();

  const countFor = (slug: string) =>
    songs.filter((s) => s.mood === slug).length;

  return (
    <div className="px-4 py-6 sm:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Moods</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
          Every track is analysed once when it is added: RMS loudness for
          energy, spectral centroid for brightness. Moods are the four quadrants
          of that plane, split at the library median.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <h2 className="relative font-semibold">{mood.name}</h2>
            <p className="relative mt-1 text-xs leading-relaxed text-ink-muted">
              {mood.blurb}
            </p>
            <p className="relative mt-3 text-xs text-ink-dim">
              {countFor(mood.slug)} songs
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border border-border/60 bg-surface p-5">
          <h2 className="font-semibold">Library map</h2>
          <p className="mt-1 text-xs text-ink-muted">
            {songs.length} tracks. Dashed lines are the medians that split the
            moods.
          </p>
          <div className="mt-4">
            <MoodMap songs={songs} thresholds={thresholds} />
          </div>
        </section>

        <EnergySlider songs={songs} />
      </div>

      <p className="mt-8 max-w-2xl text-xs leading-relaxed text-ink-dim">
        These are signal-processing proxies, not a trained mood classifier.
        Loudness is not happiness, so a sad song played loud lands in Hype, and
        the tempo estimate frequently reports half or double the true BPM &mdash;
        a known failure mode of autocorrelation. A production system would train
        on human-labelled data.
      </p>
    </div>
  );
}
