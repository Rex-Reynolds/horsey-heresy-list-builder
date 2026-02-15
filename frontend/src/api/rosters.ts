import { useMutation, useQuery } from '@tanstack/react-query';
import client from './client.ts';
import type { RosterResponse, ValidationResponse, SelectedUpgrade } from '../types/index.ts';

export function useCreateRoster() {
  return useMutation<RosterResponse, Error, { name: string; points_limit: number }>({
    mutationFn: async (body) => {
      const { data } = await client.post('/api/rosters', body);
      return data;
    },
  });
}

export function useRoster(rosterId: number | null) {
  return useQuery<RosterResponse>({
    queryKey: ['roster', rosterId],
    queryFn: async () => {
      const { data } = await client.get(`/api/rosters/${rosterId}`);
      return data;
    },
    enabled: rosterId !== null,
  });
}

export function useAddDetachment(rosterId: number | null) {
  return useMutation<any, Error, { detachment_id: number; detachment_type: string }>({
    mutationFn: async (body) => {
      const { data } = await client.post(`/api/rosters/${rosterId}/detachments`, body);
      return data;
    },
  });
}

export function useRemoveDetachment(rosterId: number | null) {
  return useMutation<void, Error, number>({
    mutationFn: async (detId) => {
      await client.delete(`/api/rosters/${rosterId}/detachments/${detId}`);
    },
  });
}

export function useAddEntry(rosterId: number | null, detachmentId: number | null) {
  return useMutation<
    { id: number; total_cost: number },
    Error,
    { unit_id: number; quantity: number; upgrades?: SelectedUpgrade[] }
  >({
    mutationFn: async (body) => {
      const { data } = await client.post(
        `/api/rosters/${rosterId}/detachments/${detachmentId}/entries`,
        body,
      );
      return data;
    },
  });
}

export function useDeleteEntry(rosterId: number | null, detachmentId: number | null) {
  return useMutation<void, Error, number>({
    mutationFn: async (entryId) => {
      await client.delete(
        `/api/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}`,
      );
    },
  });
}

export function useUpdateEntry(rosterId: number | null, detachmentId: number | null) {
  return useMutation<
    { id: number; total_cost: number; quantity: number },
    Error,
    { entryId: number; quantity?: number; upgrades?: SelectedUpgrade[] }
  >({
    mutationFn: async ({ entryId, ...body }) => {
      const { data } = await client.patch(
        `/api/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}`,
        body,
      );
      return data;
    },
  });
}

export function useValidateRoster(rosterId: number | null) {
  return useMutation<ValidationResponse, Error>({
    mutationFn: async () => {
      const { data } = await client.post(`/api/rosters/${rosterId}/validate`);
      return data;
    },
  });
}

export function useSetDoctrine(rosterId: number | null) {
  return useMutation<RosterResponse, Error, { doctrine_id: string | null }>({
    mutationFn: async (body) => {
      const { data } = await client.patch(`/api/rosters/${rosterId}/doctrine`, body);
      return data;
    },
  });
}

export interface DoctrineInfo {
  id: string;
  name: string;
  tercio?: string;
  effect?: string;
  flavour?: string;
}

export function useDoctrines() {
  return useQuery<DoctrineInfo[]>({
    queryKey: ['doctrines'],
    queryFn: async () => {
      const { data } = await client.get('/api/doctrines');
      return data;
    },
  });
}
