import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { LikesProvider } from "@/components/LikesProvider";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { getCurrentUser } from "@/lib/supabase/server";

import "./globals.css";

// Manrope: geometric but soft-cornered, and it has a genuinely light 200
// weight, which is what carries the landing wordmark.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Moodio - Audio for all your Moods",
  description: "A music streaming app.",
};

/**
 * Signed out, the app chrome is not rendered at all -- the landing page is
 * full-bleed with no sidebar or playbar. Signed in, PlayerProvider and the
 * playbar live here rather than in a page, because the root layout is the only
 * thing that survives navigation; mounting the <audio> element inside a page
 * would stop the music every time you open an album.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    null;

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="h-full font-sans">
        {user ? (
          <PlayerProvider>
            {/* key on auth state so logging in or out remounts with fresh likes */}
            <LikesProvider key={user.id} isSignedIn>
              <AppShell displayName={displayName}>{children}</AppShell>
            </LikesProvider>
          </PlayerProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
