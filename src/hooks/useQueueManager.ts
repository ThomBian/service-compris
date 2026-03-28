import { useEffect, useRef, Dispatch, SetStateAction } from 'react';
import React from 'react';
import { GameState } from '../types';
import { DOORS_CLOSE_TIME } from '../constants';
import { processQueueTick } from '../logic/gameLogic';
import { type Toast } from '../context/ToastContext';
import { SpecialCharacter } from '../logic/characters/SpecialCharacter';

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
  characters: React.RefObject<Map<string, SpecialCharacter>>,
) {
  const prevQueueLenRef = useRef(gameState.queue.length);

  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;

    setGameState(prev => {
      const { state: next, stormedCount, stormedOutClientIds } = processQueueTick(prev);

      // Apply onStormOut for any special character who stormed out
      let result = next;
      stormedOutClientIds.forEach(clientId => {
        const client = prev.queue.find(c => c.id === clientId);
        if (client?.characterId) {
          const ch = characters.current.get(client.characterId);
          if (ch?.onStormOut) {
            result = { ...result, ...ch.onStormOut(result) };
          }
        }
      });

      if (stormedCount > 0) {
        const ratingLoss = (0.5 * stormedCount).toFixed(1);
        const label = stormedCount === 1 ? 'A guest stormed out!' : `${stormedCount} guests stormed out!`;
        queueMicrotask(() => showToast(label, `★ −${ratingLoss}`, 'warning'));
      }
      return result;
    });
  }, [gameState.inGameMinutes, gameState.timeMultiplier, setGameState, showToast]);

  useEffect(() => {
    prevQueueLenRef.current = gameState.queue.length;
  }, [gameState.queue.length]);

  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;
    if (gameState.inGameMinutes < DOORS_CLOSE_TIME) return;
    if (gameState.queue.length === 0) return;

    setGameState(prev => {
      if (prev.queue.length === 0 || prev.inGameMinutes < DOORS_CLOSE_TIME) return prev;
      return {
        ...prev,
        queue: [],
        logs: ['Remaining guests in queue sent away — doors closed.', ...prev.logs].slice(0, 50),
      };
    });
  }, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.queue.length, setGameState]);
}
