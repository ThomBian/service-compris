import { useState, useCallback } from "react";
import { GameState } from "../types";
import { START_TIME, INITIAL_RESERVATIONS } from "../constants";
import { createInitialGrid } from "../logic/gameLogic";
import { generateDailyVips, injectVipReservations } from '../logic/vipLogic';
import { VIP_ROSTER } from '../logic/vipRoster';
import { useGameClock } from "./useGameClock";
import { useClientSpawner } from "./useClientSpawner";
import { useQueueManager } from "./useQueueManager";
import { useQuestionActions } from "./useQuestionActions";
import { useAccusationActions } from "./useAccusationActions";
import { useDecisionActions } from "./useDecisionActions";
import { useReservationActions } from "./useReservationActions";
import { useToast } from "../context/ToastContext";

function buildInitialState(difficulty: number): GameState {
  const dailyVips = generateDailyVips(difficulty, VIP_ROSTER);
  const reservations = injectVipReservations(dailyVips, INITIAL_RESERVATIONS);
  return {
    inGameMinutes: START_TIME,
    timeMultiplier: 1,
    reservations,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: 0,
    rating: 5.0,
    morale: 100,
    logs: ["Welcome to The Maitre D'. The doors are open."],
    dailyVips,
    seatedVipIds: [],
    dailyBanned: [],
    seatedBannedIds: [],
    gameOver: false,
  };
}

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>(() => buildInitialState(1));

  const resetGame = useCallback((difficulty: number) => {
    setGameState(buildInitialState(difficulty));
  }, []);

  const { showToast } = useToast();
  const { setTimeMultiplier } = useGameClock(gameState, setGameState);
  useClientSpawner(gameState, setGameState);
  useQueueManager(gameState, setGameState, showToast);

  const { askQuestion } = useQuestionActions(setGameState, showToast);
  const { callOutLie } = useAccusationActions(setGameState, showToast);
  const {
    handleDecision,
    waitInLine,
    seatParty,
    toggleCellSelection,
    confirmSeating,
    refuseSeatedParty,
  } = useDecisionActions(setGameState, showToast);
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
    refuseSeatedParty,
    toggleReservationArrived,
    setTimeMultiplier,
    resetGame,
  };
}
