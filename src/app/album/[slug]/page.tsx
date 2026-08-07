import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayAlbumButton, SongList } from "@/components/SongList";
import { getAlbumWithSongs } from "@/lib/data";

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
    <div className="px-4 py-6 sm:px-8">
      <Link
        href="/"
        className="ml-14 text-sm text-white/50 hover:text-white lg:ml-0"
      >
        &larr; Back
      </Link>

      <header className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-lg shadow-2xl">
          {album.coverUrl ? (
            <Image
              src={album.coverUrl}
              alt={album.title}
              fill
              sizes="192px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="h-full w-full bg-white/10" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">
            Album
          </p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">{album.title}</h1>
          <p className="mt-3 text-sm text-white/60">
            {album.description}
            {album.artist && ` · ${album.artist}`} · {songs.length} songs
          </p>
          <div className="mt-5">
            <PlayAlbumButton songs={songs} />
          </div>
        </div>
      </header>

      <SongList songs={songs} />
    </div>
  );
}
