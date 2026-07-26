'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Header from '@cloudscape-design/components/header';
import Pagination from '@cloudscape-design/components/pagination';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import { useState } from 'react';

import { useIsCompact, useIsPhone } from '@/lib/useMediaQuery';

import { DeleteRecordModal } from '@/components/records/DeleteRecordModal';
import { RecordFormPanel } from '@/components/records/RecordFormPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { HostedZoneResponse, RecordSetResponse } from '@/lib/api/types.gen';
import { useRecords } from '@/lib/queries/records';
import { RECORD_TYPES } from '@/lib/schemas/record';
import { useTableState } from '@/lib/useTableState';

const RECORD_COLUMNS = [
  { id: 'name', label: 'Record name', alwaysVisible: true },
  { id: 'type', label: 'Type' },
  { id: 'routing_policy', label: 'Routing policy' },
  { id: 'set_identifier', label: 'Differentiator' },
  { id: 'alias', label: 'Alias' },
  { id: 'values', label: 'Value/Route traffic to' },
  { id: 'ttl', label: 'TTL (seconds)' },
  { id: 'health_check', label: 'Health check ID' },
  { id: 'evaluate_target_health', label: 'Evaluate target health' },
  { id: 'id', label: 'Record ID' },
];

const DEFAULT_RECORD_COLUMNS = ['name', 'type', 'routing_policy', 'values', 'ttl'];

/**
 * Columns kept as the viewport narrows, in descending order of usefulness.
 *
 * A record is identified by its name and type, and its value is the reason
 * anyone opened the table — so those three survive on a phone.
 */
const PHONE_COLUMNS = ['name', 'type', 'values'];
const TABLET_COLUMNS = ['name', 'type', 'values', 'ttl'];

/** The records table for one hosted zone. */
export function RecordTable({ zone }: { zone: HostedZoneResponse }) {
  const state = useTableState({
    defaultSort: 'name',
    defaultColumns: DEFAULT_RECORD_COLUMNS,
  });
  const isPhone = useIsPhone();
  const isCompact = useIsCompact();

  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selected, setSelected] = useState<RecordSetResponse[]>([]);
  const [deleting, setDeleting] = useState<RecordSetResponse | null>(null);
  const [editing, setEditing] = useState<RecordSetResponse | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useRecords(zone.id, {
    search: state.search || undefined,
    type: typeFilter || undefined,
    sort: state.sort as 'name' | 'type' | 'ttl',
    order: state.order,
    limit: state.pageSize,
    offset: (state.page - 1) * state.pageSize,
  });

  const records = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const selectedRecord = selected[0];
  // System records stay visible and selectable so their values can be read, but
  // every write action against them is disabled.
  const selectionIsSystem = Boolean(selectedRecord?.is_system);

  // Narrow the chosen columns rather than replacing them, so a column the user
  // switched off stays off when the viewport grows again.
  const visibleColumns = isPhone
    ? state.visibleColumns.filter((column) => PHONE_COLUMNS.includes(column))
    : isCompact
      ? state.visibleColumns.filter((column) => TABLET_COLUMNS.includes(column))
      : state.visibleColumns;

  return (
    <>
      <Table<RecordSetResponse>
        items={records}
        loading={query.isLoading}
        loadingText="Loading records"
        trackBy="id"
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected([...detail.selectedItems])}
        resizableColumns
        wrapLines
        columnDefinitions={[
          {
            id: 'name',
            header: 'Record name',
            sortingField: 'name',
            isRowHeader: true,
            cell: (record) => (
              <SpaceBetween direction="horizontal" size="xs">
                <span>{record.name}</span>
                {record.is_system && (
                  <StatusIndicator type="info" colorOverride="grey">
                    System
                  </StatusIndicator>
                )}
              </SpaceBetween>
            ),
          },
          { id: 'type', header: 'Type', sortingField: 'type', cell: (record) => record.type },
          {
            id: 'routing_policy',
            header: 'Routing policy',
            cell: (record) => record.routing_policy,
          },
          {
            id: 'set_identifier',
            header: 'Differentiator',
            cell: (record) => record.set_identifier ?? dash(),
          },
          { id: 'alias', header: 'Alias', cell: () => 'No' },
          {
            id: 'values',
            header: 'Value/Route traffic to',
            cell: (record) => (
              // Values are untrusted text and render as text; React escapes
              // them and nothing here uses dangerouslySetInnerHTML.
              <Box variant="code" fontSize="body-s">
                {record.values.join('\n')}
              </Box>
            ),
          },
          {
            id: 'ttl',
            header: 'TTL (seconds)',
            sortingField: 'ttl',
            cell: (record) => record.ttl,
          },
          { id: 'health_check', header: 'Health check ID', cell: () => dash() },
          { id: 'evaluate_target_health', header: 'Evaluate target health', cell: () => dash() },
          { id: 'id', header: 'Record ID', cell: (record) => <Box variant="code">{record.id}</Box> },
        ]}
        visibleColumns={visibleColumns}
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
            counter={total ? `(${total})` : undefined}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {/* System records are read-only, so both write actions are
                    disabled with the reason stated beneath the table rather
                    than failing on submit. */}
                <Button
                  disabled={!selectedRecord || selectionIsSystem}
                  onClick={() => selectedRecord && setEditing(selectedRecord)}
                  ariaLabel={
                    selectionIsSystem
                      ? 'The zone’s generated records cannot be edited'
                      : 'Edit record'
                  }
                >
                  Edit
                </Button>
                <Button
                  disabled={!selectedRecord || selectionIsSystem}
                  onClick={() => selectedRecord && setDeleting(selectedRecord)}
                  ariaLabel={
                    selectionIsSystem
                      ? 'The zone’s generated SOA and NS records cannot be deleted'
                      : 'Delete record'
                  }
                >
                  Delete
                </Button>
                <Button variant="primary" onClick={() => setCreating(true)}>
                  Create record
                </Button>
              </SpaceBetween>
            }
          >
            Records
          </Header>
        }
        filter={
          // Stacks the search box above the type filter on a narrow screen
          // instead of squeezing both onto one line.
          <SpaceBetween direction={isPhone ? 'vertical' : 'horizontal'} size="xs">
            <TextFilter
              filteringText={state.search}
              filteringPlaceholder="Find records"
              filteringAriaLabel="Filter records by name"
              onChange={({ detail }) => state.setSearch(detail.filteringText)}
              countText={total ? `${total} matches` : ''}
            />
            <Select
              selectedOption={
                typeFilter
                  ? { value: typeFilter, label: typeFilter }
                  : { value: '', label: 'All types' }
              }
              onChange={({ detail }) => {
                setTypeFilter(detail.selectedOption.value ?? '');
                state.setPage(1);
              }}
              options={[
                { value: '', label: 'All types' },
                ...RECORD_TYPES.map((type) => ({ value: type, label: type })),
                { value: 'SOA', label: 'SOA' },
              ]}
              ariaLabel="Filter by record type"
            />
          </SpaceBetween>
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
              contentDisplay: RECORD_COLUMNS.map((column) => ({
                id: column.id,
                visible: state.visibleColumns.includes(column.id),
              })),
            }}
            pageSizePreference={{
              title: 'Page size',
              options: [
                { value: 10, label: '10 records' },
                { value: 25, label: '25 records' },
                { value: 50, label: '50 records' },
              ],
            }}
            contentDisplayPreference={{ title: 'Visible columns', options: RECORD_COLUMNS }}
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
          ) : state.search || typeFilter ? (
            <EmptyState
              variant="search"
              title="No matches"
              description="No record matches the current filter."
              action={
                <Button
                  onClick={() => {
                    state.setSearch('');
                    setTypeFilter('');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="records"
              title="No records yet"
              description="Add a record to decide how traffic for this domain is routed."
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  Create record
                </Button>
              }
            />
          )
        }
        ariaLabels={{
          selectionGroupLabel: 'Record selection',
          itemSelectionLabel: (_data, record) => `Select ${record.name} ${record.type}`,
          tableLabel: 'DNS records',
        }}
      />

      <RecordFormPanel
        zone={zone}
        open={creating || editing !== null}
        record={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <DeleteRecordModal
        zoneId={zone.id}
        record={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => setSelected([])}
      />

      {/* Explains the disabled actions rather than leaving the user guessing. */}
      {selectionIsSystem && (
        <Box padding={{ top: 'xs' }} color="text-status-inactive" fontSize="body-s">
          The zone&apos;s generated SOA and NS records are read-only. Deleting them would leave
          the zone unresolvable.
        </Box>
      )}
    </>
  );
}

function dash() {
  return (
    <Box color="text-status-inactive" variant="span">
      –
    </Box>
  );
}
