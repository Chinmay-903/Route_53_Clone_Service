'use client';

import { useMemo } from 'react';

import { useHostedZones } from '@/lib/queries/hosted-zones';

/**
 * How many zones the summary reads before it stops counting.
 *
 * The API paginates and offers no aggregate endpoint, and adding one would mean
 * changing the backend. One page of this size covers any realistic account in
 * this build; past it, `truncated` goes true and the UI says the record figure
 * is a partial count rather than quietly under-reporting.
 */
const SUMMARY_LIMIT = 100;

export interface ZoneStats {
  /** Authoritative: comes from the list response's own total. */
  zoneCount: number;
  recordCount: number;
  publicCount: number;
  privateCount: number;
  /** True when there are more zones than the summary read. */
  truncated: boolean;
  loading: boolean;
}

/**
 * Aggregate figures for the hosted zone summary cards.
 *
 * Uses the existing list endpoint rather than a new one. React Query dedupes it
 * against any other caller asking for the same parameters, so the dashboard and
 * the zones page share a single request.
 */
export function useHostedZoneStats(): ZoneStats {
  const query = useHostedZones({
    sort: 'name',
    order: 'asc',
    limit: SUMMARY_LIMIT,
    offset: 0,
  });

  return useMemo(() => {
    const zones = query.data?.items ?? [];
    const zoneCount = query.data?.total ?? 0;

    return {
      zoneCount,
      recordCount: zones.reduce((sum, zone) => sum + zone.record_count, 0),
      publicCount: zones.filter((zone) => zone.type === 'Public').length,
      privateCount: zones.filter((zone) => zone.type === 'Private').length,
      truncated: zoneCount > zones.length,
      loading: query.isLoading,
    };
  }, [query.data, query.isLoading]);
}
