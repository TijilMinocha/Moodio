import Link from "next/link";
import { notFound } from "next/navigation";

import { PlaylistSongs } from "@/components/PlaylistSongs";
import { PlayAlbumButton } from "@/components/SongList";
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
    <div className="px-4 py-6 sm:px-8">
      <Link
        href="/playlists"
        className="ml-14 text-sm text-white/50 hover:text-white lg:ml-0"
      >
        &larr; Playlists
      </Link>

      <header className="mt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">
          Playlist
        </p>
        <h1 className="mt-2 text-4xl font-black sm:text-5xl">{playlist.name}</h1>
        <p className="mt-3 text-sm text-white/60">{songs.length} songs</p>
        <div className="mt-5">
          <PlayAlbumButton songs={songs} />
        </div>
      </header>

      <PlaylistSongs playlistId={playlist.id} initial={songs} />
    </div>
  );
}
