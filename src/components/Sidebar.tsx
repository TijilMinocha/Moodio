"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { signOut } from "@/app/auth/actions";
import { QueuePanel } from "@/components/player/QueuePanel";

export function Sidebar({ displayName }: { displayName: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded bg-[#252525] p-2 lg:hidden"
        aria-label="Open menu"
      >
        <Image src="/img/hamburger.svg" alt="" width={24} height={24} className="invert" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-2 p-2 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="rounded-lg bg-[#121212] p-4">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={() => setOpen(false)}>
              <Image src="/img/logo.svg" alt="Moodio" width={110} height={32} className="invert" />
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden"
              aria-label="Close menu"
            >
              <Image src="/img/close.svg" alt="" width={22} height={22} className="invert" />
            </button>
          </div>

          <nav className="mt-5 space-y-3 text-sm font-bold">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 text-white/70 hover:text-white"
            >
              <Image src="/img/home.svg" alt="" width={22} height={22} className="invert" />
              Home
            </Link>
            <span className="flex cursor-not-allowed items-center gap-4 text-white/30">
              <Image src="/img/search.svg" alt="" width={22} height={22} className="invert opacity-50" />
              Search
            </span>
            {displayName && (
              <>
                <Link
                  href="/liked"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-4 text-white/70 hover:text-white"
                >
                  <span className="w-[22px] text-center text-lg text-green-500">♥</span>
                  Liked Songs
                </Link>
                <Link
                  href="/playlists"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-4 text-white/70 hover:text-white"
                >
                  <Image src="/img/playlist.svg" alt="" width={22} height={22} className="invert" />
                  Playlists
                </Link>
              </>
            )}
          </nav>

          <div className="mt-5 border-t border-white/10 pt-4 text-sm">
            {displayName ? (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-white/70">{displayName}</span>
                <form action={signOut}>
                  <button className="shrink-0 text-xs text-white/40 hover:text-white">
                    Log out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full border border-white/30 px-3 py-1.5 text-center text-xs hover:border-white"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full bg-white px-3 py-1.5 text-center text-xs font-bold text-black"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-[#121212]">
          <QueuePanel />
        </div>
      </aside>
    </>
  );
}
