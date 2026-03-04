import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { type GameConfig, type GameSystemId, getGameConfig, HH3_CONFIG } from './gameConfig.ts';

const GameConfigContext = createContext<GameConfig>(HH3_CONFIG);

export function GameConfigProvider({
  gameSystem,
  children,
}: {
  gameSystem: GameSystemId;
  children: ReactNode;
}) {
  const config = useMemo(() => getGameConfig(gameSystem), [gameSystem]);
  return (
    <GameConfigContext.Provider value={config}>
      {children}
    </GameConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGameConfig(): GameConfig {
  return useContext(GameConfigContext);
}
