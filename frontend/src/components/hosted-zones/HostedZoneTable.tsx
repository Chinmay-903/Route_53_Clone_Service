'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import Pagination from '@cloudscape-design/components/pagination';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DeleteZoneModal } from '@/components/hosted-zones/DeleteZoneModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { HostedZoneResponse } from '@/lib/api/types.gen';
import { useHostedZones } from '@/lib/queries/hosted-zones';
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
  const isPhone = useIsPhone();
  const isCompact = useIsCompact();
  const [selected, setSelected] = useState<HostedZoneResponse[]>([]);
  const [deleting, setDeleting] = useState<HostedZoneResponse | null>(null);

  const query = useHostedZones({
    search: state.search || undefined,
    sort: state.sort as 'name' | 'type' | 'record_count' | 'created_at',
    order: state.order,
    limit: state.pageSize,
    offset: (state.page - 1) * state.pageSize,
  });

  const zones = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const selectedZone = selected[0];

  // Narrow the chosen columns rather than replacing them, so a column the user
  // switched off stays off when the viewport grows again.
  const visibleColumns = isPhone
    ? state.visibleColumns.filter((column) => PHONE_COLUMNS.includes(column))
    : isCompact
      ? state.visibleColumns.filter((column) => TABLET_COLUMNS.includes(column))
      : state.visibleColumns;

  return (
    <>
      <Table<HostedZoneResponse>
        items={zones}
        // Cloudscape reserves the table's height while loading, so rows do not
        // shift into place when the request settles.
        loading={query.isLoading}
        loadingText="Loading hosted zones"
        trackBy="id"
        // Radio selection, matching the console's single-select pattern.
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected([...detail.selectedItems])}
        variant="full-page"
        stickyHeader
        resizableColumns
        columnDefinitions={[
          {
            id: 'name',
            header: 'Hosted zone name',
            sortingField: 'name',
            isRowHeader: true,
            cell: (zone) => (
              <Link
                href={`/hosted-zones/${zone.id}`}
                onFollow={(event) => {
                  event.preventDefault();
                  router.push(`/hosted-zones/${zone.id}`);
                }}
              >
                {zone.name}
              </Link>
            ),
          },
          { id: 'type', header: 'Type', sortingField: 'type', cell: (zone) => zone.type },
          { id: 'created_by', header: 'Created by', cell: (zone) => zone.created_by },
          {
            id: 'record_count',
            header: 'Record count',
            sortingField: 'record_count',
            cell: (zone) => zone.record_count,
          },
          {
            id: 'comment',
            header: 'Description',
            cell: (zone) =>
              zone.comment ?? (
                <Box color="text-status-inactive" variant="span">
                  –
                </Box>
              ),
          },
          {
            id: 'id',
            header: 'Hosted zone ID',
            cell: (zone) => <Box variant="code">{zone.id}</Box>,
          },
        ]}
        visibleColumns={visibleColumns}
        // Keeps the zone name in view while the rest of a wide row scrolls
        // sideways, so a horizontal scroll never loses the row's identity.
        stickyColumns={{ first: isCompact ? 0 : 1 }}
        sortingColumn={{ sortingField: state.sort }}
        sortingDescending={state.order === 'desc'}
        onSortingChange={({ detail }) =>
          state.setSorting(
            detail.sortingColumn.sortingField ?? 'name',
            detail.isDescending ? 'desc' : 'asc',
          )
        }
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={total ? `(${total})` : undefined}
            description="A hosted zone holds the DNS records that define how traffic is routed for a domain."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {/* Four side-by-side buttons wrap into a ragged stack on a
                    narrow screen, so the secondary three collapse into one
                    overflow menu and only the primary action stays visible. */}
                {isCompact ? (
                  <ButtonDropdown
                    disabled={!selectedZone}
                    ariaLabel="Actions for the selected hosted zone"
                    items={[
                      { id: 'view', text: 'View details' },
                      { id: 'edit', text: 'Edit' },
                      { id: 'delete', text: 'Delete' },
                    ]}
                    onItemClick={({ detail }) => {
                      if (!selectedZone) return;
                      if (detail.id === 'delete') setDeleting(selectedZone);
                      else if (detail.id === 'edit')
                        router.push(`/hosted-zones/${selectedZone.id}?tab=details`);
                      else router.push(`/hosted-zones/${selectedZone.id}`);
                    }}
                  >
                    Actions
                  </ButtonDropdown>
                ) : (
                  <>
                    <Button
                      disabled={!selectedZone}
                      onClick={() => router.push(`/hosted-zones/${selectedZone?.id}`)}
                    >
                      View details
                    </Button>
                    <Button
                      disabled={!selectedZone}
                      onClick={() => router.push(`/hosted-zones/${selectedZone?.id}?tab=details`)}
                    >
                      Edit
                    </Button>
                    <Button
                      disabled={!selectedZone}
                      onClick={() => setDeleting(selectedZone ?? null)}
                    >
                      Delete
                    </Button>
                  </>
                )}
                <Button variant="primary" onClick={() => router.push('/hosted-zones/create')}>
                  Create hosted zone
                </Button>
              </SpaceBetween>
            }
          >
            Hosted zones
          </Header>
        }
        filter={
          <TextFilter
            filteringText={state.search}
            filteringPlaceholder="Find hosted zones"
            filteringAriaLabel="Filter hosted zones by name"
            onChange={({ detail }) => state.setSearch(detail.filteringText)}
            countText={total ? `${total} matches` : ''}
          />
        }
        pagination={
          <Pagination
            currentPageIndex={state.page}
            pagesCount={Math.max(1, Math.ceil(total / state.pageSize))}
            onChange={({ detail }) => state.setPage(detail.currentPageIndex)}
            ariaLabels={{
              nextPageLabel: 'Next page',
              previousPageLabel: 'Previous page',
              pageLabel: (pageNumber) => `Page ${pageNumber}`,
            }}
          />
        }
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={{
              pageSize: state.pageSize,
              contentDisplay: ALL_COLUMNS.map((column) => ({
                id: column.id,
                visible: state.visibleColumns.includes(column.id),
              })),
            }}
            pageSizePreference={{
              title: 'Page size',
              options: [
                { value: 10, label: '10 hosted zones' },
                { value: 20, label: '20 hosted zones' },
                { value: 50, label: '50 hosted zones' },
              ],
            }}
            contentDisplayPreference={{ title: 'Visible columns', options: ALL_COLUMNS }}
            onConfirm={({ detail }) => {
              state.setPageSize(detail.pageSize ?? 10);
              state.setVisibleColumns(
                (detail.contentDisplay ?? [])
                  .filter((column) => column.visible)
                  .map((column) => column.id),
              );
            }}
          />
        }
        empty={
          query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : state.search ? (
            <EmptyState
              variant="search"
              title="No matches"
              description={`No hosted zone name contains "${state.search}".`}
              action={<Button onClick={() => state.setSearch('')}>Clear filter</Button>}
            />
          ) : (
            <EmptyState
              variant="zones"
              title="No hosted zones yet"
              description="Create a hosted zone to start managing DNS records for a domain."
              action={
                <Button variant="primary" onClick={() => router.push('/hosted-zones/create')}>
                  Create hosted zone
                </Button>
              }
            />
          )
        }
        ariaLabels={{
          selectionGroupLabel: 'Hosted zone selection',
          itemSelectionLabel: (_data, zone) => `Select ${zone.name}`,
          tableLabel: 'Hosted zones',
        }}
      />

      <DeleteZoneModal zone={deleting} onClose={() => setDeleting(null)} onDeleted={() => setSelected([])} />
    </>
  );
}

const ALL_COLUMNS = [
  { id: 'name', label: 'Hosted zone name', alwaysVisible: true },
  { id: 'type', label: 'Type' },
  { id: 'created_by', label: 'Created by' },
  { id: 'record_count', label: 'Record count' },
  { id: 'comment', label: 'Description' },
  { id: 'id', label: 'Hosted zone ID' },
];
