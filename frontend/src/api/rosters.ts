import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const qc = useQueryClient();
  return useMutation<any, Error, { detachment_id: number; detachment_type: string }>({
    mutationFn: async (body) => {
      const { data } = await client.post(`/api/rosters/${rosterId}/detachments`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster', rosterId] }),
  });
}

export function useRemoveDetachment(rosterId: number | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (detId) => {
      await client.delete(`/api/rosters/${rosterId}/detachments/${detId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster', rosterId] }),
  });
}

export function useAddEntry(rosterId: number | null, detachmentId: number | null) {
  const qc = useQueryClient();
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster', rosterId] }),
  });
}

export function useDeleteEntry(rosterId: number | null, detachmentId: number | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (entryId) => {
      await client.delete(
        `/api/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}`,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster', rosterId] }),
  });
}

export function useUpdateEntry(rosterId: number | null, detachmentId: number | null) {
  const qc = useQueryClient();
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster', rosterId] }),
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
  const qc = useQueryClient();
  return useMutation<RosterResponse, Error, { doctrine_id: string | null }>({
    mutationFn: async (body) => {
      const { data } = await client.patch(`/api/rosters/${rosterId}/doctrine`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster', rosterId] }),
  });
}

export function useDoctrines() {
  return useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['doctrines'],
    queryFn: async () => {
      const { data } = await client.get('/api/doctrines');
      return data;
    },
  });
}
