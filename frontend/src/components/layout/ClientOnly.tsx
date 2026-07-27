'use client';

import { useEffect, useState } from 'react';

/**
 * Renders its children only after the component has mounted in the browser.
 *
 * This exists for one specific failure. The tables keep their filter, sort, and
 * page in the URL through `nuqs`, which reads `useSearchParams`, and that
 * suspends while the server is rendering. The documented answer is a Suspense
 * boundary above it — but a boundary opened during the server render is
 * *postponed*: the server streams the fallback and marks the slot for the
 * client to fill in. In this application that slot is never resumed, and the
 * page sits on its skeleton forever. It looks like a hung request and it is
 * completely silent: no error, no warning, a 200 in the server log.
 *
 * Gating on mount sidesteps the mechanism rather than fighting it. Nothing that
 * reads search params is ever rendered on the server, so no boundary is opened
 * there and there is nothing to resume. The fallback shows for one frame before
 * hydration completes, which is what the skeleton is for anyway.
 *
 * The cost is that this content is never server-rendered. That is no loss here:
 * every one of these pages is behind authentication, excluded from indexing,
 * and its data is fetched client-side regardless.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  // An effect never runs on the server, so this is false through the whole
  // server render and true immediately after hydration.
  useEffect(() => setMounted(true), []);

  return <>{mounted ? children : fallback}</>;
}
