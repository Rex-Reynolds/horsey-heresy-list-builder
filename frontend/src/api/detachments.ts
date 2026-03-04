import { useQuery } from '@tanstack/react-query';
import client, { gsPath } from './client.ts';
import type { Detachment } from '../types/index.ts';
import { useGameConfig } from '../config/GameConfigContext.tsx';

export function useDetachments() {
  const { id: gameSystem } = useGameConfig();
  return useQuery<Detachment[]>({
    queryKey: ['detachments', gameSystem],
    queryFn: async () => {
      const { data } = await client.get(gsPath(gameSystem, '/detachments'));
      return data;
    },
  });
}
