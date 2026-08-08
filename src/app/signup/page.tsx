import { Landing } from "@/components/Landing";
import { getAlbums } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const albums = await getAlbums();

  return (
    <Landing
      mode="signup"
      covers={albums.map((a) => a.coverUrl).filter((c): c is string => !!c)}
    />
  );
}
