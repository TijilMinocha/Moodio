import { PlayAlbumButton, ShufflePlayButton, SongList } from "@/components/SongList";
import { LIKED_TINT, headerFrom } from "@/lib/tint";
import { getLikedSongs } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export default async function LikedPage() {
  const songs = await getLikedSongs();

  return (
    <div>
      {/* Liked Songs always gets the same soft red -- it is one fixed thing,
          not one of the hashed per-item tints. */}
      <header
        className="px-4 pb-8 pt-8 sm:px-8"
        style={{ backgroundImage: headerFrom(LIKED_TINT) }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Playlist
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Liked Songs
        </h1>
        <p className="mt-3 text-sm text-ink-muted">{songs.length} songs</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <PlayAlbumButton songs={songs} />
          <ShufflePlayButton songs={songs} />
        </div>
      </header>

      <div className="px-4 pb-8 sm:px-8">
        {songs.length === 0 ? (
          <p className="mt-8 text-ink-muted">
            Nothing liked yet. Tap the heart next to any song.
          </p>
        ) : (
          <SongList songs={songs} />
        )}
      </div>
    </div>
  );
}
