'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { SEGMENT_LABELS } from '@/components/navigation/navigationItems';
import { cn } from '@/lib/cn';

/**
 * Breadcrumbs derived from the pathname.
 *
 * Deriving rather than declaring means no page can forget to set them, and the
 * trail can never disagree with the URL. The one thing a path cannot supply is
 * a human name for an opaque id — `/hosted-zones/Z3AADJGX6KTTL2` should read
 * "example.com" — so a page holding that name registers it through the context
 * below and the trail substitutes it.
 */

interface CrumbOverrides {
  /** Maps a path segment to the label that should replace it. */
  labels: Record<string, string>;
  setLabel: (segment: string, label: string) => void;
}

const BreadcrumbContext = createContext<CrumbOverrides | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  /*
   * Stable across renders, which matters because consumers list it as an effect
   * dependency. Built on the functional updater so it never needs to close over
   * `labels`; returning the previous object unchanged makes React bail out of
   * the re-render entirely, so a page registering the same label twice costs
   * nothing.
   */
  const setLabel = useCallback((segment: string, label: string) => {
    setLabels((previous) =>
      previous[segment] === label ? previous : { ...previous, [segment]: label },
    );
  }, []);

  const value = useMemo<CrumbOverrides>(() => ({ labels, setLabel }), [labels, setLabel]);

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/**
 * Registers a human-readable label for one path segment.
 *
 * Called by the zone detail page with the zone's name, so the trail reads
 * "Hosted zones › example.com" rather than showing the raw identifier.
 *
 * The registration happens in an effect rather than during render. Scheduling
 * it from the render pass — even deferred through a microtask — is a side
 * effect during render, and under a Suspense boundary React can replay that
 * render repeatedly, so the update re-fires and the boundary never settles.
 */
export function useBreadcrumbLabel(segment: string | undefined, label: string | undefined) {
  const context = useContext(BreadcrumbContext);
  const setLabel = context?.setLabel;

  useEffect(() => {
    if (!segment || !label) return;
    setLabel?.(segment, label);
  }, [segment, label, setLabel]);
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const context = useContext(BreadcrumbContext);

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return <div className={className} />;

  const crumbs = segments.map((segment, index) => ({
    segment,
    href: `/${segments.slice(0, index + 1).join('/')}`,
    label: context?.labels[segment] ?? SEGMENT_LABELS[segment] ?? segment,
    isLast: index === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className={cn('flex min-w-0 items-center', className)}>
      <ol className="flex min-w-0 items-center gap-0.5 text-sm">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex min-w-0 items-center gap-0.5">
            {index > 0 && (
              <ChevronRight
                className="size-3.5 shrink-0 text-ink-faint"
                aria-hidden="true"
              />
            )}

            {crumb.isLast ? (
              // The current page is not a link. Marking it `aria-current` and
              // leaving it as text is what distinguishes "where you are" from
              // "where you can go".
              <span
                aria-current="page"
                className="truncate font-medium text-ink"
                title={crumb.label}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="truncate rounded px-1 py-0.5 text-ink-muted transition-colors hover:text-ink"
                title={crumb.label}
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
