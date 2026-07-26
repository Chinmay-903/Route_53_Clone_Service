'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Breakpoints, matching the values the CSS uses.
 *
 * Named rather than inlined so a component asking "am I on a narrow screen"
 * cannot disagree with the stylesheet about where narrow ends.
 */
export const BREAKPOINTS = {
  phone: '(max-width: 688px)',
  tablet: '(max-width: 1024px)',
  desktop: '(min-width: 1025px)',
} as const;

/**
 * Subscribes a component to a media query.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: it returns the
 * server snapshot during rendering and the real value on the client, so the
 * markup React hydrates against always matches what the server produced.
 *
 * Both callbacks are memoised on `query`. React tears down and re-establishes
 * the subscription whenever the `subscribe` identity changes, so an inline
 * arrow would resubscribe on every render — and a `change` event landing inside
 * one of those gaps is dropped, leaving the component stuck on a stale value.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // The server has no viewport. Reporting false means components start in their
  // desktop layout and correct themselves on hydration, which is the safer
  // default for a desktop-first console.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True on phone-sized viewports. */
export function useIsPhone(): boolean {
  return useMediaQuery(BREAKPOINTS.phone);
}

/** True on tablet-sized viewports and narrower. */
export function useIsCompact(): boolean {
  return useMediaQuery(BREAKPOINTS.tablet);
}
