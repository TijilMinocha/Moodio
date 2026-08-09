import { PlaylistManager } from "@/components/PlaylistManager";
import { getPlaylists } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const playlists = await getPlaylists();

  return (
    <div className="px-4 py-6 sm:px-8">
      <header>
        <h1 className="text-3xl font-bold">Your Playlists</h1>
      </header>
      <PlaylistManager initial={playlists} />
    </div>
  );
}
