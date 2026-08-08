import Image from "next/image";
import Link from "next/link";

import { cardGradient } from "@/lib/tint";
import type { AlbumDTO } from "@/lib/types";

export function AlbumCard({ album }: { album: AlbumDTO }) {
  return (
    <Link
      href={`/album/${album.slug}`}
      className="group relative overflow-hidden rounded-xl bg-surface p-4 transition-colors duration-200 hover:bg-surface-2"
    >
      {/* Soft colour-to-black wash, deterministic per album. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: cardGradient(album.id) }}
      />

      <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-surface-2 shadow-lg">
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt={album.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1280px) 30vw, 220px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="h-full w-full bg-surface-3" />
        )}

        <span className="absolute bottom-2 right-2 grid h-11 w-11 translate-y-2 place-items-center rounded-full bg-brand opacity-0 shadow-lg transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <Image src="/img/play.svg" alt="" width={17} height={17} />
        </span>
      </div>

      <h3 className="relative truncate font-semibold">{album.title}</h3>
      <p className="relative mt-1 line-clamp-2 text-sm text-ink-muted">
        {album.description}
      </p>
      {album.songCount != null && (
        <p className="relative mt-2 text-xs text-ink-dim">
          {album.songCount} songs
        </p>
      )}
    </Link>
  );
}
