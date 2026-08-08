import { AlbumCard } from "@/components/AlbumCard";
import { Landing } from "@/components/Landing";
import { getAlbums } from "@/lib/data";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const albums = await getAlbums();

  // Signed out: the landing page only. The catalogue is behind the login.
  if (!user) {
    return (
      <Landing
        mode="login"
        covers={albums.map((a) => a.coverUrl).filter((c): c is string => !!c)}
      />
    );
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0];

  return (
    <div className="px-4 py-6 sm:px-8">
      <header className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight">
          Good to see you, {displayName}
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {albums.length} curated playlists
        </p>
      </header>

      {albums.length === 0 ? (
        <p className="text-ink-muted">
          No albums yet. Run <code className="text-ink">npm run ingest</code> to
          load your library.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
    </div>
  );
}
