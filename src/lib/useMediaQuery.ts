"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a media query.
 *
 * useSyncExternalStore rather than useState + useEffect: matchMedia is an
 * external store, and this is the API React provides for exactly that. It also
 * avoids the setState-inside-an-effect pattern, and gives a defined value
 * during SSR instead of a render-then-correct flash.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Tailwind's `lg` breakpoint (64rem). */
export const LG_QUERY = "(min-width: 64rem)";
