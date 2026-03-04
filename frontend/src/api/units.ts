import { useQuery } from '@tanstack/react-query';
import client, { gsPath } from './client.ts';
import type { Unit, UnitUpgradesResponse } from '../types/index.ts';
import type { GameSystemId } from '../config/gameConfig.ts';
import { useGameConfig } from '../config/GameConfigContext.tsx';

export function useUnits(category?: string, search?: string) {
  const { id: gameSystem } = useGameConfig();
  return useQuery<Unit[]>({
    queryKey: ['units', gameSystem, category, search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await client.get(gsPath(gameSystem, '/units'), { params });
      return data;
    },
  });
}

export function useUnitUpgrades(unitId: number | null) {
  return useQuery<UnitUpgradesResponse>({
    queryKey: ['unit-upgrades', unitId],
    queryFn: async () => {
      const { data } = await client.get(`/api/units/${unitId}/upgrades`);
      return data;
    },
    enabled: unitId !== null,
  });
}

/** Fetch units for a specific game system (non-hook version for imperative use). */
export async function fetchUnits(gameSystem: GameSystemId, params?: Record<string, string>): Promise<Unit[]> {
  const { data } = await client.get(gsPath(gameSystem, '/units'), { params });
  return data;
}
