import { useCallback, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { GameState, CellState } from '../types';
import { TICK_RATE, OVERTIME_MORALE_DRAIN_PER_MINUTE, DOORS_CLOSE_TIME } from '../constants';
import { applyMoraleGameOver } from '../logic/gameLogic';
import { getRule } from '../logic/nightRules';
import { tGame } from '../i18n/tGame';

export function useGameClock(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tickTime = useCallback(() => {
    setGameState(prev => {
      if (prev.timeMultiplier === 0 || prev.gameOver) return prev;

      // Shift ended for P&L: past closing with no tables still dining — freeze time so
      // overtime morale drain does not continue under the summary overlay.
      if (prev.inGameMinutes >= DOORS_CLOSE_TIME) {
        const hasOccupied = prev.grid.some(row =>
          row.some(c => c.state === CellState.OCCUPIED),
        );
        if (!hasOccupied) {
          return prev.timeMultiplier === 0 ? prev : { ...prev, timeMultiplier: 0 };
        }
      }

      const nextMinutes = prev.inGameMinutes + 1;
      const isOvertime = nextMinutes >= DOORS_CLOSE_TIME;
      const wasOvertime = prev.inGameMinutes >= DOORS_CLOSE_TIME;

      const nextMultiplier =
        isOvertime && !wasOvertime && prev.timeMultiplier < 4
          ? prev.difficulty === 3
            ? 3
            : 4
          : prev.timeMultiplier;

      let nextMorale = prev.morale;
      let nextLogs = prev.logs;
      if (isOvertime) {
        nextMorale = Math.max(0, prev.morale - OVERTIME_MORALE_DRAIN_PER_MINUTE);
        if (!wasOvertime) {
          nextLogs = [tGame('doorsClosedOvertime'), ...nextLogs].slice(0, 50);
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
      const clockSpeed = getRule<number>(gameState.activeRules, 'CLOCK_SPEED', 1);
      const interval = TICK_RATE / gameState.timeMultiplier / clockSpeed;
      tickTimerRef.current = setInterval(tickTime, interval);
    } else {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    }
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    };
  }, [gameState.timeMultiplier, tickTime]);

  const setTimeMultiplier = useCallback((m: number) => {
    setGameState(prev => ({
      ...prev,
      timeMultiplier: prev.difficulty === 3 ? 3 : m,
    }));
  }, [setGameState]);

  return { setTimeMultiplier };
}
