'use client';

import { ClientOnly } from '@/components/layout/ClientOnly';
import { HostedZoneTable } from '@/components/hosted-zones/HostedZoneTable';
import { PageContainer } from '@/components/layout/PageHeader';
import { Skeleton, StatSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

/**
 * The hosted zones list.
 *
 * `ClientOnly` rather than `Suspense`: the table's state lives in the URL via
 * `nuqs`, which reads `useSearchParams` and suspends during the server render.
 * A Suspense boundary there is postponed and never resumed, leaving the page on
 * its skeleton permanently — see the note in `ClientOnly` for the detail.
 *
 * The fallback is dimension-matched to what replaces it, so nothing shifts when
 * the real table arrives.
 */
export default function HostedZonesPage() {
  return (
    <ClientOnly fallback={<HostedZonesSkeleton />}>
      <HostedZoneTable />
    </ClientOnly>
  );
}

function HostedZonesSkeleton() {
  return (
    <PageContainer>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-8 w-44" />
        </div>
        <Skeleton className="mt-3 h-4 w-[34rem] max-w-full" />
        <div className="mt-5">
          <StatSkeleton />
        </div>
      </div>
      <TableSkeleton rows={8} columns={5} />
    </PageContainer>
  );
}
