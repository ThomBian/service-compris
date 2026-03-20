import { useState } from 'react';
import { GameState } from '../types';
import { START_TIME, INITIAL_RESERVATIONS } from '../constants';
import { createInitialGrid } from '../logic/gameLogic';
import { useGameClock } from './useGameClock';
import { useClientSpawner } from './useClientSpawner';
import { useQueueManager } from './useQueueManager';
import { useQuestionActions } from './useQuestionActions';
import { useAccusationActions } from './useAccusationActions';
import { useDecisionActions } from './useDecisionActions';
import { useReservationActions } from './useReservationActions';

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>({
    inGameMinutes: START_TIME,
    timeMultiplier: 1,
    reservations: INITIAL_RESERVATIONS,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: 0,
    rating: 5.0,
    morale: 100,
    logs: ['Welcome to The Maitre D\'. The doors are open.'],
  });

  const { setTimeMultiplier } = useGameClock(gameState, setGameState);
  useClientSpawner(gameState, setGameState);
  useQueueManager(gameState, setGameState);
  
  const { askQuestion } = useQuestionActions(setGameState);
  const { callOutLie } = useAccusationActions(setGameState);
  const { 
    handleDecision, 
    waitInLine, 
    seatParty, 
    toggleCellSelection, 
    confirmSeating, 
    cancelSeating 
  } = useDecisionActions(setGameState);
  const { toggleReservationArrived } = useReservationActions(setGameState);

  return {
    gameState,
    askQuestion,
    callOutLie,
    handleDecision,
    waitInLine,
    seatParty,
    toggleCellSelection,
    confirmSeating,
    cancelSeating,
    toggleReservationArrived,
    setTimeMultiplier
  };
}
