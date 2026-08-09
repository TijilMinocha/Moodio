"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  HeartIcon,
  HomeIcon,
  MoodIcon,
  PlaylistIcon,
  SearchIcon,
} from "@/components/icons";
import { QueuePanel } from "@/components/player/QueuePanel";
import { UserStrip } from "@/components/UserStrip";
import { LG_QUERY, useMediaQuery } from "@/lib/useMediaQuery";

function NavLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3.5 rounded-xl px-3 py-3 text-[0.95rem] font-bold tracking-tight transition ${
        active
          ? "bg-brand/15 text-brand"
          : "text-ink-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      <span className="grid w-5 shrink-0 place-items-center">{icon}</span>
      {label}
    </Link>
  );
}

export function Sidebar({
  displayName,
  open,
  onClose,
}: {
  displayName: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const isDesktop = useMediaQuery(LG_QUERY);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* The drawer offset is an inline style driven by React state rather
          than a CSS class. Both the Tailwind translate utilities and a plain
          CSS rule failed to apply reliably here -- the closed state worked but
          the open state never took, leaving the menu unopenable on mobile.
          An inline style has no cascade to lose against, and on desktop the
          sidebar is a plain grid child with no transform at all. */}
      <aside
        style={
          isDesktop
            ? undefined
            : {
                transform: open ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 200ms ease",
              }
        }
        className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[17rem]"
      >
        <div className="rounded-2xl border border-border/60 bg-surface p-4">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={onClose}>
              <Image
                src="/img/logo.svg"
                alt="Moodio"
                width={104}
                height={30}
                className="invert"
              />
            </Link>
            <button onClick={onClose} className="lg:hidden" aria-label="Close menu">
              <Image src="/img/close.svg" alt="" width={20} height={20} className="invert" />
            </button>
          </div>

          <nav className="mt-4 space-y-1">
            <NavLink
              href="/"
              onNavigate={onClose}
              label="Home"
              icon={<HomeIcon />}
            />
            <NavLink
              href="/moods"
              onNavigate={onClose}
              label="Moods"
              icon={<MoodIcon />}
            />
            <NavLink
              href="/search"
              onNavigate={onClose}
              label="Search"
              icon={<SearchIcon />}
            />
            {displayName && (
              <>
                <NavLink
                  href="/liked"
                  onNavigate={onClose}
                  label="Liked Songs"
                  icon={<HeartIcon className="text-danger" />}
                />
                <NavLink
                  href="/playlists"
                  onNavigate={onClose}
                  label="Playlists"
                  icon={<PlaylistIcon />}
                />
              </>
            )}
          </nav>

        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-surface">
          <QueuePanel />
        </div>

        {displayName && <UserStrip displayName={displayName} />}
      </aside>
    </>
  );
}
