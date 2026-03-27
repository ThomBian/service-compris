import { useState, useCallback } from "react";
import { GameState } from "../types";
import { START_TIME, INITIAL_RESERVATIONS } from "../constants";
import { createInitialGrid } from "../logic/gameLogic";
import { generateDailyVips, injectVipReservations } from '../logic/vipLogic';
import { generateDailyBanned, injectBannedReservations } from '../logic/bannedLogic';
import { VIP_ROSTER } from '../logic/vipRoster';
import { BANNED_ROSTER } from '../logic/bannedRoster';
import { generateReservations } from '../logic/reservationGenerator';
import { useGameClock } from "./useGameClock";
import { useClientSpawner } from "./useClientSpawner";
import { useQueueManager } from "./useQueueManager";
import { useQuestionActions } from "./useQuestionActions";
import { useAccusationActions } from "./useAccusationActions";
import { useDecisionActions } from "./useDecisionActions";
import { useReservationActions } from "./useReservationActions";
import { useToast } from "../context/ToastContext";

type PersistState = { cash: number; rating: number; morale: number; nightNumber: number };

function buildInitialState(difficulty: number, persist?: PersistState): GameState {
  const nightNumber = persist?.nightNumber ?? 1;
  const rating = persist ? Math.max(1.0, persist.rating) : 5.0;

  const dailyVips = generateDailyVips(difficulty, VIP_ROSTER);
  const dailyBanned = generateDailyBanned(difficulty, BANNED_ROSTER);

  const baseReservations = nightNumber === 1
    ? INITIAL_RESERVATIONS
    : generateReservations({ nightNumber, rating });
  const reservations = injectBannedReservations(
    dailyBanned,
    injectVipReservations(dailyVips, baseReservations),
  );

  return {
    inGameMinutes: START_TIME,
    timeMultiplier: 1,
    reservations,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: persist?.cash ?? 0,
    rating,
    morale: persist ? Math.max(0, persist.morale) : 100,
    logs: ["Welcome to The Maitre D'. The doors are open."],
    dailyVips,
    seatedVipIds: [],
    dailyBanned,
    seatedBannedIds: [],
    gameOver: false,
    nightNumber,
    coversSeated: 0,
    shiftRevenue: 0,
  };
}

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>(() => buildInitialState(0));

  const resetGame = useCallback((difficulty: number, persist?: PersistState) => {
    setGameState(buildInitialState(difficulty, persist));
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
    lastCallTable,
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
    lastCallTable,
  };
}
