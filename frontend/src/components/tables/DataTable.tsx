'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, MoreHorizontal, Settings2 } from 'lucide-react';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Button, IconButton } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Select';
import { CheckboxMenu, Menu, Tooltip, type MenuItem } from '@/components/ui/Menu';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { Pagination } from '@/components/tables/Pagination';

/**
 * The console's data table.
 *
 * One generic component behind both the hosted zones list and the records list.
 * Those two tables previously repeated their toolbar, sorting, selection,
 * pagination, and column-preference wiring almost line for line; the divergence
 * that inevitably follows is what this exists to prevent.
 *
 * Sorting, filtering, and pagination are all server-side. This component holds
 * no data state at all — it renders what it is given and reports what the user
 * did, which is what lets the callers keep that state in the URL.
 */

export interface Column<T> {
  id: string;
  header: string;
  /** Enables the sort control. The column id doubles as the sort field. */
  sortable?: boolean;
  cell: (item: T) => React.ReactNode;
  align?: 'left' | 'right';
  /** Marks the cell as the row's header for assistive technology. */
  isRowHeader?: boolean;
  /** Excluded from the column picker; cannot be switched off. */
  alwaysVisible?: boolean;
  /** Applied to both the header cell and every body cell. */
  className?: string;
  /** Keeps the column at its natural width instead of sharing space. */
  shrink?: boolean;
}

export interface DataTableProps<T> {
  items: T[];
  columns: Column<T>[];
  visibleColumns: string[];
  getRowId: (item: T) => string;
  ariaLabel: string;

  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Shown when there is no data, no error, and no request in flight. */
  empty: React.ReactNode;
  /** Rows drawn in the loading skeleton, matched to the page size. */
  skeletonRows?: number;

  sort: string;
  order: 'asc' | 'desc';
  onSortChange: (sort: string, order: 'asc' | 'desc') => void;

  selectionMode?: 'none' | 'single' | 'multi';
  selected?: T[];
  onSelectionChange?: (items: T[]) => void;
  /** Row-level label for the selection control, e.g. "Select example.com". */
  getRowLabel?: (item: T) => string;

  /** Clicking anywhere in the row that is not a control. */
  onRowActivate?: (item: T) => void;
  /** Per-row overflow menu. Returning an empty array hides the control. */
  rowActions?: (item: T) => MenuItem[];
  onRowAction?: (actionId: string, item: T) => void;

  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Noun used in the page-size menu, e.g. "hosted zones". */
  itemNoun?: string;

  onVisibleColumnsChange: (columns: string[]) => void;

  /** Filter controls, rendered on the left of the toolbar. */
  filters?: React.ReactNode;
  /** Buttons, rendered on the right of the toolbar. */
  actions?: React.ReactNode;
  /** A note beneath the table, e.g. explaining why an action is disabled. */
  footnote?: React.ReactNode;
}

export function DataTable<T>({
  items,
  columns,
  visibleColumns,
  getRowId,
  ariaLabel,
  loading,
  error,
  onRetry,
  empty,
  skeletonRows = 8,
  sort,
  order,
  onSortChange,
  selectionMode = 'none',
  selected = [],
  onSelectionChange,
  getRowLabel,
  onRowActivate,
  rowActions,
  onRowAction,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemNoun = 'items',
  onVisibleColumnsChange,
  filters,
  actions,
  footnote,
}: DataTableProps<T>) {
  const shown = columns.filter((column) => visibleColumns.includes(column.id));
  const selectedIds = new Set(selected.map(getRowId));

  const hasSelection = selectionMode !== 'none';
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(getRowId(item)));
  const someSelected = items.some((item) => selectedIds.has(getRowId(item)));

  function toggleRow(item: T) {
    if (!onSelectionChange) return;
    const id = getRowId(item);

    if (selectionMode === 'single') {
      onSelectionChange(selectedIds.has(id) ? [] : [item]);
      return;
    }
    onSelectionChange(
      selectedIds.has(id)
        ? selected.filter((candidate) => getRowId(candidate) !== id)
        : [...selected, item],
    );
  }

  function toggleAll() {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : [...items]);
  }

  function handleSort(columnId: string) {
    // Re-clicking the active column reverses it; a new column starts ascending,
    // which is what a reader expects from a first click on a name.
    onSortChange(columnId, sort === columnId && order === 'asc' ? 'desc' : 'asc');
  }

  // `error` is `unknown`, so it is narrowed to a boolean here rather than used
  // directly in a `&&` — an `unknown` short-circuit is not a valid ReactNode.
  const hasError = Boolean(error);
  const showBody = !loading && !hasError && items.length > 0;
  const showEmpty = !loading && !hasError && items.length === 0;
  const columnCount = shown.length + (hasSelection ? 1 : 0) + (rowActions ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar ---------------------------------------------------------- */}
      {(filters || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2">{filters}</div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}

            <CheckboxMenu
              header="Visible columns"
              items={columns.map((column) => ({
                id: column.id,
                label: column.header,
                checked: visibleColumns.includes(column.id),
                disabled: column.alwaysVisible,
              }))}
              onToggle={(id, checked) =>
                onVisibleColumnsChange(
                  checked
                    ? // Re-inserted in the table's own column order rather than
                      // appended, so switching a column back on returns it to
                      // where it was rather than to the end.
                      columns
                        .filter(
                          (column) => visibleColumns.includes(column.id) || column.id === id,
                        )
                        .map((column) => column.id)
                    : visibleColumns.filter((columnId) => columnId !== id),
                )
              }
              trigger={
                <span>
                  <Tooltip content="Table preferences">
                    <IconButton label="Table preferences" variant="secondary" size="md">
                      <Settings2 aria-hidden="true" />
                    </IconButton>
                  </Tooltip>
                </span>
              }
            />
          </div>
        </div>
      )}

      {/* Selection banner -------------------------------------------------
          Appears only when something is selected, so it costs no vertical space
          the rest of the time. */}
      <AnimatePresence initial={false}>
        {hasSelection && selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line-accent bg-brand-wash px-3 py-2">
              <span className="text-sm font-medium text-brand">
                {selected.length} selected
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onSelectionChange?.([])}
                className="text-brand hover:bg-brand/10"
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table ------------------------------------------------------------ */}
      {loading ? (
        <TableSkeleton rows={skeletonRows} columns={Math.max(shown.length, 3)} toolbar={false} />
      ) : (
        <div
          className={cn(
            'rounded-xl border border-line bg-surface shadow-xs',
            // The scroll container exists only below `md`. Above it the
            // responsive column sets already fit, and an overflow ancestor at
            // any width would stop the header from sticking to the viewport.
            'max-md:overflow-x-auto',
          )}
        >
          <table className="w-full border-collapse text-left" aria-label={ariaLabel}>
            <thead>
              <tr>
                {hasSelection && (
                  <th
                    scope="col"
                    className={cn(headerCell, 'w-10 rounded-tl-xl pl-3.5 pr-0')}
                  >
                    {selectionMode === 'multi' && (
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleAll}
                        label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                      />
                    )}
                    {selectionMode === 'single' && <span className="sr-only">Select</span>}
                  </th>
                )}

                {shown.map((column, index) => {
                  const isSorted = sort === column.id;
                  const isFirst = index === 0 && !hasSelection;
                  const isLast = index === shown.length - 1 && !rowActions;

                  return (
                    <th
                      key={column.id}
                      scope="col"
                      // `aria-sort` is what tells a screen reader the table is
                      // sorted and in which direction; the arrow alone does not.
                      aria-sort={
                        isSorted ? (order === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                      className={cn(
                        headerCell,
                        isFirst && 'rounded-tl-xl',
                        isLast && 'rounded-tr-xl',
                        column.align === 'right' && 'text-right',
                        column.shrink && 'w-px whitespace-nowrap',
                        column.className,
                      )}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column.id)}
                          className={cn(
                            'group -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                            'transition-colors hover:text-ink',
                            // Browsers' own stylesheet sets `text-transform:
                            // none` on form controls, so a button does not
                            // inherit the header's casing and a sortable column
                            // would render in sentence case beside uppercase
                            // neighbours. Restated here rather than fought
                            // with a global reset.
                            'uppercase tracking-wider',
                            isSorted && 'text-ink',
                            column.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {column.header}
                          <motion.span
                            // Rotating one arrow rather than swapping two keeps
                            // the direction change continuous, and the inactive
                            // state is the same glyph at low opacity so the
                            // header does not reflow on first sort.
                            animate={{
                              rotate: isSorted && order === 'desc' ? 180 : 0,
                              opacity: isSorted ? 1 : 0,
                            }}
                            initial={false}
                            transition={spring.snappy}
                            className={cn(
                              'text-brand',
                              !isSorted && 'group-hover:!opacity-40',
                            )}
                            aria-hidden="true"
                          >
                            <ArrowUp className="size-3" />
                          </motion.span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}

                {rowActions && (
                  <th scope="col" className={cn(headerCell, 'w-10 rounded-tr-xl px-2')}>
                    <span className="sr-only">Row actions</span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {showBody &&
                items.map((item, index) => {
                  const id = getRowId(item);
                  const isSelected = selectedIds.has(id);
                  const menuItems = rowActions?.(item) ?? [];

                  return (
                    <motion.tr
                      key={id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.2,
                        // Capped, because past a dozen rows a per-row delay
                        // stops being a flourish and becomes a wait.
                        delay: Math.min(index, 12) * 0.018,
                      }}
                      onClick={(event) => {
                        // A click that landed on a link, button, or the
                        // selection control has already been handled.
                        if ((event.target as HTMLElement).closest('a,button,input,label')) return;
                        if (onRowActivate) onRowActivate(item);
                        else if (hasSelection) toggleRow(item);
                      }}
                      className={cn(
                        'group/row border-t border-line transition-colors duration-100',
                        // The zebra is a very low-alpha tint rather than a
                        // distinct colour, so it groups rows without becoming
                        // a pattern the eye has to read past.
                        'even:bg-surface-muted/40',
                        isSelected
                          ? 'bg-brand-wash even:bg-brand-wash hover:bg-brand-wash'
                          : 'hover:bg-surface-inset/70',
                        (onRowActivate || hasSelection) && 'cursor-pointer',
                      )}
                    >
                      {hasSelection && (
                        <td className="relative w-10 py-2.5 pl-3.5 pr-0 align-middle">
                          {/* A marker on the leading edge, so a selected row is
                              identifiable without relying on the fill alone. */}
                          {isSelected && (
                            <motion.span
                              layoutId={`row-marker-${id}`}
                              className="absolute inset-y-0 left-0 w-0.5 bg-brand"
                              aria-hidden="true"
                            />
                          )}
                          {selectionMode === 'multi' ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(item)}
                              label={getRowLabel?.(item) ?? `Select row ${index + 1}`}
                            />
                          ) : (
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => toggleRow(item)}
                              aria-label={getRowLabel?.(item) ?? `Select row ${index + 1}`}
                              className="size-4 cursor-pointer accent-[var(--brand)]"
                            />
                          )}
                        </td>
                      )}

                      {shown.map((column) =>
                        column.isRowHeader ? (
                          <th
                            key={column.id}
                            scope="row"
                            className={cn(bodyCell, 'font-normal', column.className)}
                          >
                            {column.cell(item)}
                          </th>
                        ) : (
                          <td
                            key={column.id}
                            className={cn(
                              bodyCell,
                              column.align === 'right' && 'text-right tabular-nums',
                              column.shrink && 'whitespace-nowrap',
                              column.className,
                            )}
                          >
                            {column.cell(item)}
                          </td>
                        ),
                      )}

                      {rowActions && (
                        <td className="w-10 px-2 py-2.5 align-middle">
                          {menuItems.length > 0 && (
                            <Menu
                              label="Row actions"
                              items={menuItems}
                              onSelect={(actionId) => onRowAction?.(actionId, item)}
                              trigger={
                                <button
                                  type="button"
                                  aria-label="Row actions"
                                  className={cn(
                                    'flex size-7 items-center justify-center rounded-md text-ink-faint',
                                    'transition-all duration-150',
                                    'hover:bg-surface-inset hover:text-ink',
                                    // Revealed on hover on a pointer device, but
                                    // always present for keyboard and touch —
                                    // hiding it behind hover alone would make it
                                    // unreachable without a mouse.
                                    'opacity-100 md:opacity-0',
                                    'group-hover/row:opacity-100 focus-visible:opacity-100',
                                    'data-[state=open]:bg-surface-inset data-[state=open]:opacity-100',
                                  )}
                                >
                                  <MoreHorizontal className="size-4" aria-hidden="true" />
                                </button>
                              }
                            />
                          )}
                        </td>
                      )}
                    </motion.tr>
                  );
                })}

              {(showEmpty || hasError) && (
                <tr>
                  <td colSpan={columnCount} className="border-t border-line p-0">
                    {hasError ? <ErrorState error={error} onRetry={onRetry} compact /> : empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination sits inside the card so the card reads as one object
              rather than a table with a detached control beneath it. */}
          {showBody && total > 0 && (
            <div className="border-t border-line px-3 py-2.5">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                pageSizeOptions={pageSizeOptions}
                itemNoun={itemNoun}
              />
            </div>
          )}
        </div>
      )}

      {footnote && <p className="px-1 text-sm text-ink-muted">{footnote}</p>}
    </div>
  );
}

/**
 * Header cells stick to the viewport beneath the 56px top bar.
 *
 * The background is opaque rather than translucent: rows scrolling beneath a
 * blurred header are legible enough to read as a rendering fault.
 */
const headerCell = cn(
  'sticky top-14 z-20 bg-surface-muted',
  'px-3 py-2.5 first:pl-4 last:pr-4',
  'text-2xs font-semibold uppercase tracking-wider text-ink-muted',
  'whitespace-nowrap',
  // Drawn with a shadow rather than a border, because a border on a sticky
  // element scrolls away with the cell's own box in some engines.
  'shadow-[inset_0_-1px_0_var(--border)]',
);

const bodyCell = 'px-3 py-2.5 first:pl-4 last:pr-4 align-middle text-base text-ink-secondary';
