import axios from 'axios';
import type { GameSystemId } from '../config/gameConfig.ts';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

/** Build a game-system-scoped API path. */
export function gsPath(gs: GameSystemId, path: string): string {
  return `/api/${gs}${path}`;
}

export default client;
