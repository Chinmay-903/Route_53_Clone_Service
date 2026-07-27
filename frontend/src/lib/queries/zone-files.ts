'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { bulkDeleteRecords, importZoneFile } from '@/lib/api';
import { CSRF_HEADER_NAME, readCsrfToken } from '@/lib/api-config';
import { notify } from '@/lib/notifications';
import { toUserMessage } from '@/lib/queries/client';
import { queryKeys } from '@/lib/queries/keys';

// Empty means same-origin; see the note in api-config.ts.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Imports a BIND zone file into a hosted zone. */
export function useImportZoneFile(zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const { data, error } = await importZoneFile({
        path: { zone_id: zoneId },
        body: { file },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (summary) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });

      if (summary.created === 0) {
        notify(
          'warning',
          'No records imported',
          `${summary.skipped.length} entr${summary.skipped.length === 1 ? 'y was' : 'ies were'} skipped.`,
        );
        return;
      }
      notify(
        'success',
        `${summary.created} record${summary.created === 1 ? '' : 's'} imported`,
        summary.skipped.length
          ? `${summary.skipped.length} entry/entries were skipped — see the details below.`
          : undefined,
      );
    },
    onError: (error) => notify('error', 'Import failed', toUserMessage(error)),
  });
}

/** Deletes several record sets in one request. */
export function useBulkDeleteRecords(zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordIds: string[]) => {
      const { data, error } = await bulkDeleteRecords({
        path: { zone_id: zoneId },
        body: { record_ids: recordIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (summary) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
      notify(
        'success',
        `${summary.deleted} record${summary.deleted === 1 ? '' : 's'} deleted`,
        summary.refused.length
          ? `${summary.refused.length} generated record${summary.refused.length === 1 ? ' was' : 's were'} kept — SOA and NS cannot be removed.`
          : undefined,
      );
    },
    onError: (error) => notify('error', 'Could not delete the records', toUserMessage(error)),
  });
}

/**
 * Downloads a zone export.
 *
 * Written by hand rather than through the generated client: the response is a
 * file with a Content-Disposition header, not JSON, so it needs the raw blob
 * and an anchor click to reach the user's disk.
 */
export async function downloadZoneExport(
  zoneId: string,
  format: 'bind' | 'json',
  zoneName: string,
): Promise<void> {
  const csrf = readCsrfToken();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/hosted-zones/${zoneId}/export?format=${format}`,
    {
      credentials: 'include',
      headers: csrf ? { [CSRF_HEADER_NAME]: csrf } : undefined,
    },
  );

  if (!response.ok) {
    notify('error', 'Export failed', `The server returned ${response.status}.`);
    return;
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = `${zoneName.replace(/\.$/, '')}.${format === 'json' ? 'json' : 'zone'}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Releasing immediately would cancel the download in some browsers, so the
  // revoke waits for the click to be handled.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

  notify('success', `Exported ${zoneName}`, `Downloaded as ${format.toUpperCase()}.`);
}
