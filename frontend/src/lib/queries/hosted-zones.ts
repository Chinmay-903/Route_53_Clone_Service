'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createHostedZone,
  deleteHostedZone,
  getHostedZone,
  listHostedZones,
  updateHostedZone,
} from '@/lib/api';
import type {
  HostedZoneCreate,
  HostedZoneResponse,
  ZoneSortField,
  SortOrder,
} from '@/lib/api/types.gen';
import { toUserMessage } from '@/lib/queries/client';
import { queryKeys } from '@/lib/queries/keys';
import { notify } from '@/lib/notifications';

export interface ZoneListParams {
  search?: string;
  sort: ZoneSortField;
  order: SortOrder;
  limit: number;
  offset: number;
}

/** Fetches one page of hosted zones. */
export function useHostedZones(params: ZoneListParams) {
  return useQuery({
    queryKey: queryKeys.zones.list(params),
    queryFn: async () => {
      const { data, error } = await listHostedZones({ query: params });
      if (error) throw error;
      return data;
    },
    // Keeps the previous page visible while the next loads, so paging does not
    // flash an empty table.
    placeholderData: (previous) => previous,
  });
}

/** Fetches one hosted zone by its public identifier. */
export function useHostedZone(zoneId: string) {
  return useQuery({
    queryKey: queryKeys.zones.detail(zoneId),
    queryFn: async () => {
      const { data, error } = await getHostedZone({ path: { zone_id: zoneId } });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(zoneId),
  });
}

/** Creates a hosted zone, then invalidates every zone listing. */
export function useCreateHostedZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: HostedZoneCreate) => {
      const { data, error } = await createHostedZone({ body });
      if (error) throw error;
      return data;
    },
    onSuccess: (zone: HostedZoneResponse) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
      notify(
        'success',
        `Hosted zone ${zone.name} created`,
        'An SOA record and an NS record listing four name servers were created with it.',
      );
    },
    onError: (error) => notify('error', 'Could not create the hosted zone', toUserMessage(error)),
  });
}

/** Updates a hosted zone's description. */
export function useUpdateHostedZone(zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: string | null) => {
      const { data, error } = await updateHostedZone({
        path: { zone_id: zoneId },
        body: { comment },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
      notify('success', 'Description updated');
    },
    onError: (error) => notify('error', 'Could not update the hosted zone', toUserMessage(error)),
  });
}

/** Deletes a hosted zone. */
export function useDeleteHostedZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (zone: HostedZoneResponse) => {
      const { error } = await deleteHostedZone({ path: { zone_id: zone.id } });
      if (error) throw error;
      return zone;
    },
    onSuccess: (zone) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() });
      notify('success', `Hosted zone ${zone.name} deleted`);
    },
    onError: (error) => notify('error', 'Could not delete the hosted zone', toUserMessage(error)),
  });
}
