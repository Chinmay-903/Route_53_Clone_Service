import { cn } from '@/lib/cn';

/**
 * A loading placeholder.
 *
 * The shimmer comes from the `.shimmer` component class in globals.css, which
 * animates a gradient's transform rather than its background-position — the
 * former runs on the compositor, the latter repaints on every frame.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shimmer rounded-md', className)} aria-hidden="true" {...props} />;
}

/**
 * A skeleton sized to the table it replaces.
 *
 * Row height and column count match the real table, so nothing jumps when the
 * data arrives. Widths vary per cell because uniform bars read as a progress
 * indicator rather than as text about to appear.
 */
export function TableSkeleton({
  rows = 8,
  columns = 5,
  toolbar = true,
}: {
  rows?: number;
  columns?: number;
  /** Include the filter bar above the rows. */
  toolbar?: boolean;
}) {
  // `as const` plus the modulo below guarantees a hit, but the compiler cannot
  // see that under `noUncheckedIndexedAccess`, so reads fall back explicitly.
  const widths = [88, 46, 68, 54, 76, 60, 82, 50];
  const widthAt = (index: number) => widths[index % widths.length] ?? 70;

  return (
    <div role="status" aria-label="Loading" className="overflow-hidden rounded-xl border border-line bg-surface">
      {toolbar && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <Skeleton className="h-8 w-64 max-w-[50%]" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      )}

      <div className="flex gap-4 border-b border-line bg-surface-muted px-4 py-2.5">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-3 flex-1"
            style={{ maxWidth: `${widthAt(index) * 0.7}px` }}
          />
        ))}
      </div>

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div key={columnIndex} className="flex-1">
              <Skeleton
                className="h-3.5"
                style={{
                  width: `${widthAt(rowIndex + columnIndex)}%`,
                  // Staggering the phase makes the sheen travel across the
                  // table rather than pulsing every cell in unison.
                  animationDelay: `${(rowIndex * columns + columnIndex) * 45}ms`,
                }}
              />
            </div>
          ))}
        </div>
      ))}

      <span className="sr-only">Loading data</span>
    </div>
  );
}

/** Placeholder for the dashboard's statistic row. */
export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-line bg-surface p-4">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="mt-4 h-3 w-24" />
          <Skeleton className="mt-2.5 h-7 w-16" />
          <Skeleton className="mt-2.5 h-3 w-32" />
        </div>
      ))}
      <span className="sr-only">Loading statistics</span>
    </div>
  );
}
