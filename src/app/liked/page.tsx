import { PlayAlbumButton, SongList } from "@/components/SongList";
import { getLikedSongs } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export default async function LikedPage() {
  const songs = await getLikedSongs();

  return (
    <div className="px-4 py-6 sm:px-8">
      <header className="pl-14 lg:pl-0">
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">
          Playlist
        </p>
        <h1 className="mt-2 text-4xl font-black sm:text-5xl">Liked Songs</h1>
        <p className="mt-3 text-sm text-white/60">{songs.length} songs</p>
        <div className="mt-5">
          <PlayAlbumButton songs={songs} />
        </div>
      </header>

      {songs.length === 0 ? (
        <p className="mt-10 text-white/50">
          Nothing liked yet. Tap the heart next to any song.
        </p>
      ) : (
        <SongList songs={songs} />
      )}
    </div>
  );
}
