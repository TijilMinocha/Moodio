import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { getLikedSongs, getPlaylists } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Faccount");

  const [playlists, liked] = await Promise.all([
    getPlaylists(),
    getLikedSongs(),
  ]);

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "You";

  const joined = new Date(user.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="px-4 py-6 sm:px-8">
      <header className="flex items-center gap-5">
        <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-surface-3 text-2xl font-bold uppercase">
          {displayName.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Profile
          </p>
          <h1 className="mt-1.5 truncate text-4xl font-bold tracking-tight">
            {displayName}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{user.email}</p>
        </div>
      </header>

      <dl className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
        {[
          { label: "Playlists", value: playlists.length },
          { label: "Liked songs", value: liked.length },
          { label: "Member since", value: joined },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/60 bg-surface p-5"
          >
            <dt className="text-xs uppercase tracking-wide text-ink-dim">
              {stat.label}
            </dt>
            <dd className="mt-2 text-xl font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10 max-w-2xl rounded-2xl border border-border/60 bg-surface p-6">
        <h2 className="font-semibold">Account</h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Signing out ends this session on this device only.
        </p>
        <form action={signOut} className="mt-5">
          <button className="rounded-full border border-danger/40 px-5 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10">
            Log out
          </button>
        </form>
      </section>
    </div>
  );
}
