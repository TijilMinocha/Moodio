import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayAlbumButton, SongList } from "@/components/SongList";
import { getAlbumWithSongs } from "@/lib/data";
import { headerGradient } from "@/lib/tint";

export const revalidate = 60;

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getAlbumWithSongs(slug);

  if (!result) notFound();
  const { album, songs } = result;

  return (
    <div>
      {/* Hero: soft colour-to-black wash, the same tint this album gets on its
          card so the two read as the same object. */}
      <header
        className="relative px-4 pb-8 pt-6 sm:px-8"
        style={{ backgroundImage: headerGradient(album.id) }}
      >

        <Link href="/" className="text-sm text-ink-muted transition hover:text-ink">
          &larr; Back
        </Link>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border sm:h-52 sm:w-52">
            {album.coverUrl ? (
              <Image
                src={album.coverUrl}
                alt={album.title}
                fill
                sizes="208px"
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="h-full w-full bg-surface-3" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Album
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">
              {album.title}
            </h1>
            <p className="mt-3 text-sm text-ink-muted">
              {album.description}
              {album.artist && ` · ${album.artist}`} · {songs.length} songs
            </p>
            <div className="mt-6">
              <PlayAlbumButton songs={songs} />
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 pb-8 sm:px-8">
        <SongList songs={songs} />
      </div>
    </div>
  );
}
