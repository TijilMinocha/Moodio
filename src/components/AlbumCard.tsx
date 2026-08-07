import Image from "next/image";
import Link from "next/link";

import type { AlbumDTO } from "@/lib/types";

export function AlbumCard({ album }: { album: AlbumDTO }) {
  return (
    <Link
      href={`/album/${album.slug}`}
      className="group rounded-lg bg-[#181818] p-4 transition hover:bg-[#282828]"
    >
      <div className="relative mb-4 aspect-square overflow-hidden rounded">
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt={album.title}
            fill
            sizes="(max-width: 768px) 45vw, 200px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="h-full w-full bg-white/10" />
        )}
        <span className="absolute bottom-2 right-2 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-green-500 opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
          <Image src="/img/play.svg" alt="" width={20} height={20} />
        </span>
      </div>
      <h3 className="truncate font-bold">{album.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-white/60">
        {album.description}
      </p>
      {album.songCount != null && (
        <p className="mt-2 text-xs text-white/40">{album.songCount} songs</p>
      )}
    </Link>
  );
}
