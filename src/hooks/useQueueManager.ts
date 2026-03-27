import { useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { GameState } from '../types';
import { processQueueTick } from '../logic/gameLogic';
import { type Toast } from '../context/ToastContext';

type ShowToast = (
  title: string,
  detail?: string,
  variant?: Toast['variant'],
  duration?: number,
) => void;

export function useQueueManager(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  showToast: ShowToast,
) {
  const prevQueueLenRef = useRef(gameState.queue.length);

  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;

    setGameState(prev => {
      const { state: next, stormedCount } = processQueueTick(prev);
      if (stormedCount > 0) {
        const ratingLoss = (0.5 * stormedCount).toFixed(1);
        const label = stormedCount === 1 ? 'A guest stormed out!' : `${stormedCount} guests stormed out!`;
        queueMicrotask(() => showToast(label, `★ −${ratingLoss}`, 'warning'));
      }
      return next;
    });
  }, [gameState.inGameMinutes, gameState.timeMultiplier, setGameState, showToast]);

  useEffect(() => {
    prevQueueLenRef.current = gameState.queue.length;
  }, [gameState.queue.length]);

  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;
    if (gameState.inGameMinutes < 1560) return;
    if (gameState.queue.length === 0) return;

    setGameState(prev => {
      if (prev.queue.length === 0 || prev.inGameMinutes < 1560) return prev;
      return {
        ...prev,
        queue: [],
        logs: ['Remaining guests in queue sent away — doors closed.', ...prev.logs].slice(0, 50),
      };
    });
  }, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.queue.length, setGameState]);
}
