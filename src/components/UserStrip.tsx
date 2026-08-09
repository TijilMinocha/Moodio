"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/auth/actions";

/**
 * Account strip that sits at the bottom of the sidebar. Clicking it opens a
 * small menu rather than exposing "Log out" permanently -- signing out is
 * destructive enough that it should take two clicks, not sit next to the
 * things you press all the time.
 */
export function UserStrip({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-border bg-surface-2 py-1 shadow-2xl">
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink transition hover:bg-surface-3"
          >
            Visit profile
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="block w-full px-4 py-2.5 text-left text-sm text-danger transition hover:bg-surface-3"
            >
              Log out
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3 text-left transition hover:bg-surface-2"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold uppercase text-ink">
          {displayName.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {displayName}
        </span>
        <span className="shrink-0 text-xs text-ink-dim">{open ? "▾" : "▸"}</span>
      </button>
    </div>
  );
}
