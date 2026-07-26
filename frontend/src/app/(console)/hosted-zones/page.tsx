'use client';

import { Suspense } from 'react';

import { HostedZoneTable } from '@/components/hosted-zones/HostedZoneTable';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

/**
 * The hosted zones list.
 *
 * The Suspense boundary is required rather than decorative: the table's state
 * lives in the URL via `nuqs`, which reads `useSearchParams`, and that suspends
 * while the page is being prerendered. The fallback is a dimension-matched
 * skeleton, so the boundary earns its place at runtime too.
 */
export default function HostedZonesPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={10} columns={6} />}>
      <HostedZoneTable />
    </Suspense>
  );
}
