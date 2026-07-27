'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';

/**
 * Pagination for a server-paged table.
 *
 * The window of page numbers is capped at seven slots so the control's width
 * does not depend on how many pages there are — a table with 400 pages and one
 * with 4 get the same footprint.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  itemNoun,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions: number[];
  itemNoun: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink-muted">
          <span className="font-medium tabular-nums text-ink">
            {first}–{last}
          </span>{' '}
          of <span className="font-medium tabular-nums text-ink">{total}</span>
        </p>

        <Menu
          label="Rows per page"
          align="start"
          items={pageSizeOptions.map((option) => ({
            id: String(option),
            label: `${option} ${itemNoun}`,
          }))}
          onSelect={(id) => onPageSizeChange(Number(id))}
          trigger={
            <button
              type="button"
              className={cn(
                'rounded-md px-1.5 py-1 text-sm text-ink-muted transition-colors',
                'hover:bg-surface-inset hover:text-ink',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
              )}
            >
              {pageSize} per page
            </button>
          }
        />
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <IconButton
            label="Previous page"
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </IconButton>

          {pageWindow(page, pageCount).map((entry, index) =>
            entry === null ? (
              <span
                key={`gap-${index}`}
                className="px-1 text-sm text-ink-faint"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === page ? 'page' : undefined}
                className={cn(
                  'h-7 min-w-7 rounded-md px-1.5 text-sm tabular-nums transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
                  entry === page
                    ? 'bg-brand text-brand-contrast font-medium'
                    : 'text-ink-muted hover:bg-surface-inset hover:text-ink',
                )}
              >
                {entry}
              </button>
            ),
          )}

          <IconButton
            label="Next page"
            variant="ghost"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </IconButton>
        </div>
      )}
    </nav>
  );
}

/**
 * The page numbers to show, with `null` standing for an ellipsis.
 *
 * Always includes the first and last page plus a sliding window around the
 * current one, so the two ends stay reachable in a single click no matter how
 * deep into the list the user is.
 */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages: (number | null)[] = [1];

  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) pages.push(null);
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (end < pageCount - 1) pages.push(null);

  pages.push(pageCount);
  return pages;
}
