import { Landing } from "@/components/Landing";
import { getAlbums } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const albums = await getAlbums();

  return (
    <Landing
      mode="login"
      next={next}
      covers={albums.map((a) => a.coverUrl).filter((c): c is string => !!c)}
    />
  );
}
