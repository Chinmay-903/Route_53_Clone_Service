'use client';

import {
  Eye,
  Globe,
  ListTree,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { StatCard } from '@/components/cards/StatCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { DeleteZoneModal } from '@/components/hosted-zones/DeleteZoneModal';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { SegmentedControl } from '@/components/ui/Tabs';
import type { HostedZoneResponse } from '@/lib/api/types.gen';
import { cn } from '@/lib/cn';
import { useHostedZones } from '@/lib/queries/hosted-zones';
import { useHostedZoneStats } from '@/lib/queries/zone-stats';
import { useIsCompact, useIsPhone } from '@/lib/useMediaQuery';
import { useTableState } from '@/lib/useTableState';

/**
 * Columns kept as the viewport narrows, in descending order of usefulness.
 *
 * A six-column table on a phone is a horizontal scrollbar with extra steps, so
 * the ones that identify a zone survive and the rest drop. The user's own
 * column choice stays in the URL and returns when the viewport widens.
 */
const PHONE_COLUMNS = ['name', 'record_count'];
const TABLET_COLUMNS = ['name', 'type', 'record_count', 'id'];

/**
 * The hosted zones list.
 *
 * Table state lives in the URL, so a filtered view is shareable and the back
 * button returns to the previous filter rather than the previous page.
 */
export function HostedZoneTable() {
  const router = useRouter();
  const state = useTableState({ defaultSort: 'name' });
  const stats = useHostedZoneStats();
  const isPhone = useIsPhone();
  const isCompact = useIsCompact();

  const [selected, setSelected] = useState<HostedZoneResponse[]>([]);
  const [deleting, setDeleting] = useState<HostedZoneResponse | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'Public' | 'Private'>('all');

  const query = useHostedZones({
    search: state.search || undefined,
    sort: state.sort as 'name' | 'type' | 'record_count' | 'created_at',
    order: state.order,
    limit: state.pageSize,
    offset: (state.page - 1) * state.pageSize,
  });

  const allZones = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  // The API has no type parameter, so this filter is applied to the page the
  // server returned rather than to the whole collection. It is offered anyway
  // because it is genuinely useful on a page of results, but the count beneath
  // the search box keeps reporting the server's total so the two never appear
  // to contradict each other.
  const zones =
    typeFilter === 'all' ? allZones : allZones.filter((zone) => zone.type === typeFilter);

  // Narrow the chosen columns rather than replacing them, so a column the user
  // switched off stays off when the viewport grows again.
  const visibleColumns = isPhone
    ? state.visibleColumns.filter((column) => PHONE_COLUMNS.includes(column))
    : isCompact
      ? state.visibleColumns.filter((column) => TABLET_COLUMNS.includes(column))
      : state.visibleColumns;

  const columns: Column<HostedZoneResponse>[] = [
    {
      id: 'name',
      header: 'Hosted zone name',
      sortable: true,
      isRowHeader: true,
      alwaysVisible: true,
      cell: (zone) => (
        <Link
          href={`/hosted-zones/${zone.id}`}
          className={cn(
            'group/link inline-flex items-center gap-2 rounded font-medium text-ink',
            'transition-colors hover:text-brand',
          )}
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface-inset text-ink-faint transition-colors group-hover/link:border-line-accent group-hover/link:bg-brand-wash group-hover/link:text-brand"
            aria-hidden="true"
          >
            {zone.type === 'Private' ? (
              <Lock className="size-3" />
            ) : (
              <Globe className="size-3" />
            )}
          </span>
          <span className="truncate">{zone.name}</span>
        </Link>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      sortable: true,
      shrink: true,
      cell: (zone) => (
        <Badge tone={zone.type === 'Private' ? 'warning' : 'info'} size="sm">
          {zone.type}
        </Badge>
      ),
    },
    {
      id: 'created_by',
      header: 'Created by',
      cell: (zone) => <span className="text-ink-muted">{zone.created_by}</span>,
    },
    {
      id: 'record_count',
      header: 'Records',
      sortable: true,
      align: 'right',
      shrink: true,
      cell: (zone) => <span className="font-medium text-ink">{zone.record_count}</span>,
    },
    {
      id: 'comment',
      header: 'Description',
      cell: (zone) =>
        zone.comment ? (
          <span className="line-clamp-1 text-ink-muted" title={zone.comment}>
            {zone.comment}
          </span>
        ) : (
          <Dash />
        ),
    },
    {
      id: 'id',
      header: 'Hosted zone ID',
      shrink: true,
      cell: (zone) => (
        <code className="rounded border border-line bg-surface-inset px-1.5 py-0.5 text-xs text-ink-muted">
          {zone.id}
        </code>
      ),
    },
  ];

  const hasFilters = Boolean(state.search) || typeFilter !== 'all';

  return (
    <PageContainer>
      <PageHeader
        title="Hosted zones"
        icon={<Globe />}
        badge={
          total > 0 && (
            <Badge tone="neutral" className="tabular-nums">
              {total}
            </Badge>
          )
        }
        description="A hosted zone holds the DNS records that define how traffic is routed for a domain."
        actions={
          <Button variant="primary" onClick={() => router.push('/hosted-zones/create')}>
            <Plus aria-hidden="true" />
            Create hosted zone
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Hosted zones"
            value={stats.zoneCount}
            hint="Across this account"
            icon={<Globe />}
            tone="brand"
            loading={stats.loading}
          />
          <StatCard
            label="Record sets"
            value={stats.recordCount}
            hint={
              stats.truncated
                ? 'Across the first 100 zones'
                : 'Including generated SOA and NS'
            }
            icon={<ListTree />}
            tone="info"
            loading={stats.loading}
          />
          <StatCard
            label="Public zones"
            value={stats.publicCount}
            hint="Answer queries from the internet"
            icon={<Globe />}
            tone="success"
            loading={stats.loading}
          />
          <StatCard
            label="Private zones"
            value={stats.privateCount}
            hint="Answer inside associated networks"
            icon={<Lock />}
            tone="warning"
            loading={stats.loading}
          />
        </div>
      </PageHeader>

      <DataTable<HostedZoneResponse>
        items={zones}
        columns={columns}
        visibleColumns={visibleColumns}
        getRowId={(zone) => zone.id}
        ariaLabel="Hosted zones"
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        skeletonRows={Math.min(state.pageSize, 8)}
        empty={
          hasFilters ? (
            <EmptyState
              variant="search"
              title="No matches"
              description={
                state.search
                  ? `No hosted zone name contains “${state.search}”.`
                  : `No ${typeFilter.toLowerCase()} zone on this page.`
              }
              action={
                <Button
                  onClick={() => {
                    state.setSearch('');
                    setTypeFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="zones"
              title="No hosted zones yet"
              description="Create a hosted zone to start managing DNS records for a domain."
              action={
                <Button variant="primary" onClick={() => router.push('/hosted-zones/create')}>
                  <Plus aria-hidden="true" />
                  Create hosted zone
                </Button>
              }
            />
          )
        }
        sort={state.sort}
        order={state.order}
        onSortChange={state.setSorting}
        selectionMode="single"
        selected={selected}
        onSelectionChange={setSelected}
        getRowLabel={(zone) => `Select ${zone.name}`}
        onRowActivate={(zone) => router.push(`/hosted-zones/${zone.id}`)}
        rowActions={() => [
          { id: 'view', label: 'View details', icon: <Eye /> },
          { id: 'edit', label: 'Edit description', icon: <Pencil /> },
          { id: 'delete', label: 'Delete', icon: <Trash2 />, danger: true, separatorBefore: true },
        ]}
        onRowAction={(action, zone) => {
          if (action === 'delete') setDeleting(zone);
          else if (action === 'edit') router.push(`/hosted-zones/${zone.id}?tab=details`);
          else router.push(`/hosted-zones/${zone.id}`);
        }}
        page={state.page}
        pageSize={state.pageSize}
        total={total}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
        pageSizeOptions={[10, 20, 50]}
        itemNoun="hosted zones"
        onVisibleColumnsChange={state.setVisibleColumns}
        filters={
          <>
            <SearchInput
              value={state.search}
              onValueChange={state.setSearch}
              placeholder="Find hosted zones"
              aria-label="Filter hosted zones by name"
              countText={state.search && total ? `${total} matches` : undefined}
              containerClassName="w-full max-w-xs"
            />
            {!isPhone && (
              <SegmentedControl
                label="Filter by zone type"
                value={typeFilter}
                onValueChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'Public', label: 'Public' },
                  { value: 'Private', label: 'Private' },
                ]}
                className="mt-0.5"
              />
            )}
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={selected.length !== 1}
              onClick={() => router.push(`/hosted-zones/${selected[0]?.id}`)}
            >
              <Eye aria-hidden="true" />
              <span className="hidden sm:inline">View details</span>
            </Button>
            <Button
              variant="secondary"
              disabled={selected.length !== 1}
              onClick={() => setDeleting(selected[0] ?? null)}
            >
              <Trash2 aria-hidden="true" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </>
        }
      />

      <DeleteZoneModal
        zone={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => setSelected([])}
      />
    </PageContainer>
  );
}

function Dash() {
  return (
    <span className="text-ink-faint" aria-label="Not set">
      –
    </span>
  );
}
