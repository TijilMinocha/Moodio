"use client";

import Image from "next/image";
import { useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import { Playbar } from "@/components/player/Playbar";

/**
 * App frame.
 *
 * A CSS grid rather than fixed positioning: the sidebar and main area share
 * row 1, and the playbar spans row 2. The previous version had the playbar
 * `fixed inset-x-0`, which laid it over the top of the sidebar and forced
 * every page to carry a `pb-28` spacer to avoid being hidden underneath it.
 *
 * The page itself never scrolls -- `main` does. That keeps the playbar and
 * sidebar permanently in view without either of them being position: fixed.
 */
export function AppShell({
  displayName,
  children,
}: {
  displayName: string | null;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative z-10 grid h-dvh grid-rows-[1fr_auto] lg:grid-cols-[19rem_1fr]">
      <Sidebar
        displayName={displayName}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="row-start-1 min-w-0 overflow-y-auto lg:col-start-2">
        {/* Mobile bar. On desktop the sidebar is always present, so this
            collapses away instead of pages hard-coding left padding. */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-bg/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-lg bg-surface-2 p-2"
          >
            <Image
              src="/img/hamburger.svg"
              alt=""
              width={20}
              height={20}
              className="invert"
            />
          </button>
          <Image
            src="/img/logo.svg"
            alt="Moodio"
            width={92}
            height={26}
            className="invert"
          />
        </div>

        {children}
      </main>

      <div className="row-start-2 lg:col-span-2">
        <Playbar />
      </div>
    </div>
  );
}
