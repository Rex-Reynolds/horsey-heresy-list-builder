import { useMutation, useQuery } from '@tanstack/react-query';
import client, { gsPath } from './client.ts';
import { useGameConfig } from '../config/GameConfigContext.tsx';
import type { RosterResponse, RosterDetachmentResponse, ValidationResponse, SelectedUpgrade } from '../types/index.ts';

export function useRosters() {
  return useQuery<RosterResponse[]>({
    queryKey: ['rosters'],
    queryFn: async () => {
      const { data } = await client.get('/api/rosters');
      return data;
    },
  });
}

export function useDeleteRoster() {
  return useMutation<void, Error, number>({
    mutationFn: async (rosterId) => {
      await client.delete(`/api/rosters/${rosterId}`);
    },
  });
}

export function useCreateRoster() {
  const { id: gameSystem } = useGameConfig();
  return useMutation<RosterResponse, Error, { name: string; points_limit: number }>({
    mutationFn: async (body) => {
      const { data } = await client.post(gsPath(gameSystem, '/rosters'), body);
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
  return useMutation<RosterDetachmentResponse, Error, { detachment_id: number; detachment_type: string }>({
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

// 40k leader attachment
export function useAttachLeader(rosterId: number | null, detachmentId: number | null) {
  return useMutation<
    { id: number; leader_id: number; bodyguard_id: number },
    Error,
    { entryId: number; bodyguard_entry_id: number }
  >({
    mutationFn: async ({ entryId, bodyguard_entry_id }) => {
      const { data } = await client.post(
        `/api/40k10e/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}/attach`,
        { bodyguard_entry_id },
      );
      return data;
    },
  });
}

export function useDetachLeader(rosterId: number | null, detachmentId: number | null) {
  return useMutation<{ ok: boolean }, Error, number>({
    mutationFn: async (entryId) => {
      const { data } = await client.delete(
        `/api/40k10e/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}/detach`,
      );
      return data;
    },
  });
}
