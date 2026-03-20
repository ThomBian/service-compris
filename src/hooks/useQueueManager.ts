import { useEffect, Dispatch, SetStateAction } from 'react';
import { GameState } from '../types';
import { processQueueTick } from '../logic/gameLogic';

export function useQueueManager(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;

    setGameState(prev => processQueueTick(prev));
  }, [gameState.inGameMinutes, gameState.timeMultiplier, setGameState]);
}
