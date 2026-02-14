import { useQuery } from '@tanstack/react-query';
import client from './client.ts';
import type { Unit, Upgrade } from '../types/index.ts';

export function useUnits(category?: string, search?: string) {
  return useQuery<Unit[]>({
    queryKey: ['units', category, search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await client.get('/api/units', { params });
      return data;
    },
  });
}

export function useUnitUpgrades(unitId: number | null) {
  return useQuery<Upgrade[]>({
    queryKey: ['unit-upgrades', unitId],
    queryFn: async () => {
      const { data } = await client.get(`/api/units/${unitId}/upgrades`);
      return data;
    },
    enabled: unitId !== null,
  });
}
