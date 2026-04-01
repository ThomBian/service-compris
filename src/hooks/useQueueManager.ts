import { useEffect, useRef, Dispatch, SetStateAction } from 'react';
import React from 'react';
import { GameState } from '../types';
import { DOORS_CLOSE_TIME } from '../constants';
import { getRule } from '../logic/nightRules';
import { processQueueTick } from '../logic/gameLogic';
import { type Toast } from '../context/ToastContext';
import { SpecialCharacter } from '../logic/characters/SpecialCharacter';
import { tGame } from '../i18n/tGame';

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
        const label = stormedCount === 1 ? tGame('toastStormSingle') : tGame('toastStormMulti', { count: stormedCount });
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
    const closeTime = getRule<number>(gameState.activeRules, 'SHIFT_END_TIME', DOORS_CLOSE_TIME);
    if (gameState.inGameMinutes < closeTime) return;
    if (gameState.queue.length === 0) return;

    setGameState(prev => {
      const prevCloseTime = getRule<number>(prev.activeRules, 'SHIFT_END_TIME', DOORS_CLOSE_TIME);
      if (prev.queue.length === 0 || prev.inGameMinutes < prevCloseTime) return prev;
      return {
        ...prev,
        queue: [],
        logs: [tGame('doorsClosedQueue'), ...prev.logs].slice(0, 50),
      };
    });
  }, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.queue.length, setGameState]);
}
