'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createRecord, deleteRecord, listRecords, replaceRecord } from '@/lib/api';
import type {
  RecordSetResponse,
  RecordSortField,
  SortOrder,
} from '@/lib/api/types.gen';
import type { RecordFormValues } from '@/lib/schemas/record';
import { toRecordRequestBody } from '@/lib/schemas/record';
import { toUserMessage } from '@/lib/queries/client';
import { queryKeys } from '@/lib/queries/keys';
import { notify } from '@/lib/notifications';

export interface RecordListParams {
  search?: string;
  type?: string;
  sort: RecordSortField;
  order: SortOrder;
  limit: number;
  offset: number;
}

/** Fetches one page of a zone's record sets. */
export function useRecords(zoneId: string, params: RecordListParams) {
  return useQuery({
    queryKey: queryKeys.records.list(zoneId, params),
    queryFn: async () => {
      const { data, error } = await listRecords({
        path: { zone_id: zoneId },
        query: params,
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(zoneId),
    placeholderData: (previous) => previous,
  });
}

/**
 * Creates one or more record sets.
 *
 * The console's Quick create view stages several records before submitting, so
 * this accepts a list. Each is sent separately because the API creates one
 * record set per request; a partial failure is reported per record rather than
 * silently discarding the successes.
 */
export function useCreateRecords(zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: RecordFormValues[]) => {
      const failures: string[] = [];

      for (const record of records) {
        const { error } = await createRecord({
          path: { zone_id: zoneId },
          body: toRecordRequestBody(record),
        });
        if (error) failures.push(`${record.name || '(apex)'}: ${toUserMessage(error)}`);
      }
      if (failures.length) throw new Error(failures.join(' — '));
      return records.length;
    },
    onSuccess: (count) => {
      void invalidateZone(queryClient);
      notify('success', count === 1 ? 'Record created' : `${count} records created`);
    },
    onError: (error) => notify('error', 'Could not create the record', toUserMessage(error)),
  });
}

/** Replaces a record set's contents. */
export function useUpdateRecord(zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { recordId: string; values: RecordFormValues }) => {
      const { data, error } = await replaceRecord({
        path: { zone_id: zoneId, record_id: input.recordId },
        body: toRecordRequestBody(input.values),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (record) => {
      void invalidateZone(queryClient);
      notify('success', `Record ${record.name} updated`);
    },
    onError: (error) => notify('error', 'Could not update the record', toUserMessage(error)),
  });
}

/** Deletes a record set. */
export function useDeleteRecord(zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: RecordSetResponse) => {
      const { error } = await deleteRecord({
        path: { zone_id: zoneId, record_id: record.id },
      });
      if (error) throw error;
      return record;
    },
    onSuccess: (record) => {
      void invalidateZone(queryClient);
      notify('success', `Record ${record.name} deleted`);
    },
    onError: (error) => notify('error', 'Could not delete the record', toUserMessage(error)),
  });
}

/**
 * Invalidates every zone query, including the record lists beneath them.
 *
 * Deliberately broader than the record list alone: the zone carries a record
 * count that every record mutation changes, so refreshing only the list would
 * leave a stale count on screen.
 */
function invalidateZone(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
}
