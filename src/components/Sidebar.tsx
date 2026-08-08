"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
      className={`flex items-center gap-3.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-brand/15 text-brand"
          : "text-ink-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      <span className="grid w-5 place-items-center">{icon}</span>
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

      {/* Positioning is scoped to max-lg so the mobile drawer and the desktop
          grid placement never apply at once. The open/closed offset is an
          inline style rather than a Tailwind translate utility: it is dynamic
          state, and the utility version resolved unreliably against the
          desktop override (the sidebar ended up sitting on top of the page
          content on mobile). `lg:!translate-none` guards the desktop case. */}
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
        className="flex flex-col gap-2 p-2 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[17rem]"
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
              icon={<Image src="/img/home.svg" alt="" width={18} height={18} className="invert" />}
            />
            <NavLink
              href="/search"
              onNavigate={onClose}
              label="Search"
              icon={<Image src="/img/search.svg" alt="" width={18} height={18} className="invert" />}
            />
            {displayName && (
              <>
                <NavLink
                  href="/liked"
                  onNavigate={onClose}
                  label="Liked Songs"
                  icon={<span className="text-base text-danger">♥</span>}
                />
                <NavLink
                  href="/playlists"
                  onNavigate={onClose}
                  label="Playlists"
                  icon={
                    <Image src="/img/playlist.svg" alt="" width={18} height={18} className="invert" />
                  }
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
