import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { MiniGameId } from '../types';

export type LaunchMiniGameFn = (id: MiniGameId) => void;

interface DevPlayApiContextValue {
  launchMiniGame: LaunchMiniGameFn | null;
  setLaunchMiniGame: (fn: LaunchMiniGameFn | null) => void;
}

const DevPlayApiContext = createContext<DevPlayApiContextValue | null>(null);

export function DevPlayApiProvider({ children }: { children: React.ReactNode }) {
  const [launchMiniGame, setLaunchMiniGameState] = useState<LaunchMiniGameFn | null>(null);

  const setLaunchMiniGame = useCallback((fn: LaunchMiniGameFn | null) => {
    setLaunchMiniGameState(_prev => fn);
  }, []);

  const value = useMemo(
    () => ({ launchMiniGame, setLaunchMiniGame }),
    [launchMiniGame, setLaunchMiniGame],
  );

  return <DevPlayApiContext.Provider value={value}>{children}</DevPlayApiContext.Provider>;
}

export function useDevPlayApi(): DevPlayApiContextValue {
  const ctx = useContext(DevPlayApiContext);
  if (!ctx) {
    throw new Error('useDevPlayApi must be used within DevPlayApiProvider');
  }
  return ctx;
}
