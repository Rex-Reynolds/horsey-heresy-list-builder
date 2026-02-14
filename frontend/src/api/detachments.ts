import { useQuery } from '@tanstack/react-query';
import client from './client.ts';
import type { Detachment } from '../types/index.ts';

export function useDetachments() {
  return useQuery<Detachment[]>({
    queryKey: ['detachments'],
    queryFn: async () => {
      const { data } = await client.get('/api/detachments');
      return data;
    },
  });
}
