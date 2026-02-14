import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client.ts';
import type { RosterResponse, RosterEntryResponse, ValidationResponse, SelectedUpgrade } from '../types/index.ts';

export function useCreateRoster() {
  return useMutation<RosterResponse, Error, { name: string; detachment_type: string; points_limit: number }>({
    mutationFn: async (body) => {
      const { data } = await client.post('/api/rosters', body);
      return data;
    },
  });
}

export function useRosterEntries(rosterId: number | null) {
  return useQuery<RosterEntryResponse[]>({
    queryKey: ['roster-entries', rosterId],
    queryFn: async () => {
      const { data } = await client.get(`/api/rosters/${rosterId}/entries`);
      return data;
    },
    enabled: rosterId !== null,
  });
}

export function useAddEntry(rosterId: number | null) {
  const qc = useQueryClient();
  return useMutation<{ id: number; total_cost: number }, Error, { unit_id: number; quantity: number; upgrades?: SelectedUpgrade[] }>({
    mutationFn: async (body) => {
      const { data } = await client.post(`/api/rosters/${rosterId}/entries`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster-entries', rosterId] }),
  });
}

export function useDeleteEntry(rosterId: number | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (entryId) => {
      await client.delete(`/api/rosters/${rosterId}/entries/${entryId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster-entries', rosterId] }),
  });
}

export function useUpdateEntry(rosterId: number | null) {
  const qc = useQueryClient();
  return useMutation<{ id: number; total_cost: number; quantity: number }, Error, { entryId: number; quantity?: number; upgrades?: SelectedUpgrade[] }>({
    mutationFn: async ({ entryId, ...body }) => {
      const { data } = await client.patch(`/api/rosters/${rosterId}/entries/${entryId}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster-entries', rosterId] }),
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
