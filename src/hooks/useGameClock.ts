import { useCallback, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { GameState } from '../types';
import { TICK_RATE, OVERTIME_MORALE_DRAIN_PER_MINUTE } from '../constants';
import { applyMoraleGameOver } from '../logic/gameLogic';

export function useGameClock(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tickTime = useCallback(() => {
    setGameState(prev => {
      if (prev.timeMultiplier === 0 || prev.gameOver) return prev;

      const nextMinutes = prev.inGameMinutes + 1;
      const isOvertime = nextMinutes >= 1560;
      const wasOvertime = prev.inGameMinutes >= 1560;

      const nextMultiplier = isOvertime && !wasOvertime && prev.timeMultiplier < 4
        ? 4
        : prev.timeMultiplier;

      let nextMorale = prev.morale;
      let nextLogs = prev.logs;
      if (isOvertime) {
        nextMorale = Math.max(0, prev.morale - OVERTIME_MORALE_DRAIN_PER_MINUTE);
        if (!wasOvertime) {
          nextLogs = ['23:30 — Doors closed. Waiting for the last tables to clear.', ...nextLogs].slice(0, 50);
        }
      }

      const next: GameState = {
        ...prev,
        inGameMinutes: nextMinutes,
        timeMultiplier: nextMultiplier,
        morale: nextMorale,
        logs: nextLogs,
      };

      return applyMoraleGameOver(next);
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
