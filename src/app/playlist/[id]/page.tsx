import Link from "next/link";
import { notFound } from "next/navigation";

import { PlaylistSongs } from "@/components/PlaylistSongs";
import { PlayAlbumButton, ShufflePlayButton } from "@/components/SongList";
import { userHeaderGradient } from "@/lib/tint";
import { getPlaylistWithSongs } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPlaylistWithSongs(id);

  // RLS returns nothing for a playlist this user may not see, so "forbidden"
  // and "does not exist" are indistinguishable from here -- which is exactly
  // what we want to expose.
  if (!result) notFound();
  const { playlist, songs } = result;

  return (
    <div>
      {/* User playlists draw from a separate, cooler palette than the curated
          albums, so your own lists never look like the built-in ones. */}
      <header
        className="px-4 pb-8 pt-6 sm:px-8"
        style={{ backgroundImage: userHeaderGradient(playlist.id) }}
      >
        <Link href="/playlists" className="text-sm text-ink-muted transition hover:text-ink">
          &larr; Playlists
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Playlist
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          {playlist.name}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">{songs.length} songs</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <PlayAlbumButton songs={songs} />
          <ShufflePlayButton songs={songs} />
        </div>
      </header>

      <div className="px-4 pb-8 sm:px-8">
        <PlaylistSongs playlistId={playlist.id} initial={songs} />
      </div>
    </div>
  );
}
