import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import { LikesProvider } from "@/components/LikesProvider";
import { Sidebar } from "@/components/Sidebar";
import { Playbar } from "@/components/player/Playbar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { getCurrentUser } from "@/lib/supabase/server";

import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Moodio - Audio for all your Moods",
  description: "A music streaming app.",
};

/**
 * PlayerProvider and Playbar live here rather than in a page, because the root
 * layout is the only thing that survives navigation. Mounting the <audio>
 * element inside a page would stop the music every time you open an album.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    null;

  return (
    <html lang="en" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full bg-black font-sans text-white">
        <PlayerProvider>
          {/* key on auth state so logging in or out remounts with fresh likes */}
          <LikesProvider key={user?.id ?? "anon"} isSignedIn={Boolean(user)}>
            <div className="flex min-h-screen">
              <Sidebar displayName={displayName} />
              <main className="min-w-0 flex-1 pb-28">{children}</main>
            </div>
            <Playbar />
          </LikesProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}
