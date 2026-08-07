import { AlbumCard } from "@/components/AlbumCard";
import { getAlbums } from "@/lib/data";

// Catalogue changes only when the ingest script runs, so a short revalidate
// window is plenty. Day 8 puts Redis in front of this.
export const revalidate = 60;

export default async function HomePage() {
  const albums = await getAlbums();

  return (
    <div className="px-4 py-6 sm:px-8">
      <header className="mb-8 flex items-center justify-between pl-14 lg:pl-0">
        <div>
          <h1 className="text-3xl font-bold">Playlists</h1>
          <p className="mt-1 text-sm text-white/50">
            {albums.length} albums in your library
          </p>
        </div>
      </header>

      {albums.length === 0 ? (
        <p className="text-white/50">
          No albums yet. Run <code className="text-white">npm run ingest</code>{" "}
          to load your library.
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
