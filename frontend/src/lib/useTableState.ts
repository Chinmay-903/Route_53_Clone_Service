'use client';

import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { useCallback } from 'react';

import type { SortOrder } from '@/lib/api/types.gen';

/**
 * Table search, sort, and pagination state, stored in the URL.
 *
 * Keeping it in the query string rather than component state makes a filtered
 * view shareable and gives the back button the behaviour a user expects:
 * returning to the previous filter, not the previous page.
 */

const DEFAULT_COLUMNS = ['name', 'type', 'created_by', 'record_count', 'comment', 'id'];

export interface TableStateOptions {
  defaultSort: string;
  defaultColumns?: string[];
}

export function useTableState({ defaultSort, defaultColumns = DEFAULT_COLUMNS }: TableStateOptions) {
  const [state, setState] = useQueryStates(
    {
      search: parseAsString.withDefault(''),
      sort: parseAsString.withDefault(defaultSort),
      order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('asc'),
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(10),
      columns: parseAsArrayOf(parseAsString).withDefault(defaultColumns),
    },
    // Replaces rather than pushes, so typing in the filter box does not create
    // one history entry per keystroke.
    { history: 'replace', clearOnDefault: true },
  );

  const setSearch = useCallback(
    (search: string) => void setState({ search, page: 1 }),
    [setState],
  );

  const setSorting = useCallback(
    (sort: string, order: SortOrder) => void setState({ sort, order, page: 1 }),
    [setState],
  );

  const setPage = useCallback((page: number) => void setState({ page }), [setState]);

  const setPageSize = useCallback(
    (pageSize: number) => void setState({ pageSize, page: 1 }),
    [setState],
  );

  const setVisibleColumns = useCallback(
    (columns: string[]) => void setState({ columns }),
    [setState],
  );

  return {
    search: state.search,
    sort: state.sort,
    order: state.order as SortOrder,
    page: state.page,
    pageSize: state.pageSize,
    visibleColumns: state.columns,
    setSearch,
    setSorting,
    setPage,
    setPageSize,
    setVisibleColumns,
  };
}
