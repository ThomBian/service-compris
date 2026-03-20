import { useCallback, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { GameState } from '../types';
import { TICK_RATE } from '../constants';

export function useGameClock(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tickTime = useCallback(() => {
    setGameState(prev => {
      if (prev.timeMultiplier === 0) return prev;

      const nextMinutes = prev.inGameMinutes + 1;
      
      if (nextMinutes >= 1560) {
        return {
          ...prev,
          timeMultiplier: 0,
          logs: ['Shift ended. Doors closed.', ...prev.logs].slice(0, 50)
        };
      }

      return {
        ...prev,
        inGameMinutes: nextMinutes,
      };
    });
  }, [setGameState]);

  useEffect(() => {
    if (gameState.timeMultiplier > 0) {
      const interval = TICK_RATE / gameState.timeMultiplier;
      tickTimerRef.current = setInterval(tickTime, interval);
    } else {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    }
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    };
  }, [gameState.timeMultiplier, tickTime]);

  const setTimeMultiplier = useCallback((m: number) => {
    setGameState(prev => ({ ...prev, timeMultiplier: m }));
  }, [setGameState]);

  return { setTimeMultiplier };
}
