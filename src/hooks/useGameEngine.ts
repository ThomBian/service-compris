import { useState, useCallback, useRef, useEffect } from "react";
import { GameState } from "../types";
import { START_TIME, INITIAL_RESERVATIONS } from "../constants";
import { createInitialGrid } from "../logic/gameLogic";
import { generateDailyCharacters, injectCharacterReservations, CHARACTER_ROSTER } from '../logic/characterRoster';
import { createCharacter } from '../logic/characters/factory';
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';
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

  const dailyChars = generateDailyCharacters(difficulty, CHARACTER_ROSTER);

  const baseReservations = nightNumber === 1
    ? INITIAL_RESERVATIONS
    : generateReservations({ nightNumber, rating });
  const reservations = injectCharacterReservations(dailyChars, baseReservations);

  return {
    inGameMinutes: START_TIME,
    timeMultiplier: difficulty === 3 ? 3 : 1,
    difficulty,
    reservations,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: persist?.cash ?? 0,
    rating,
    morale: persist ? Math.max(0, persist.morale) : 100,
    logs: ["Welcome to The Maitre D'. The doors are open."],
    dailyCharacterIds: dailyChars.map(c => c.id),
    seatedCharacterIds: [],
    gameOverCharacterId: null,
    strikeActive: false,
    gameOver: false,
    gameOverReason: null,
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

  // Runtime character instances — never serialized, rebuilt on each session start
  const characters = useRef<Map<string, SpecialCharacter>>(new Map());

  // Populate characters ref whenever dailyCharacterIds changes (i.e., on session start)
  useEffect(() => {
    const map = new Map<string, SpecialCharacter>();
    gameState.dailyCharacterIds.forEach(id => {
      const def = CHARACTER_ROSTER.find(c => c.id === id);
      if (def) map.set(id, createCharacter(def));
    });
    characters.current = map;
  }, [gameState.dailyCharacterIds]);

  const { showToast } = useToast();
  const { setTimeMultiplier } = useGameClock(gameState, setGameState);
  useClientSpawner(gameState, setGameState, characters);
  useQueueManager(gameState, setGameState, showToast, characters);

  const { askQuestion } = useQuestionActions(setGameState, showToast);
  const { callOutLie } = useAccusationActions(setGameState, showToast, characters);
  const {
    handleDecision,
    waitInLine,
    seatParty,
    toggleCellSelection,
    confirmSeating,
    refuseSeatedParty,
    lastCallTable,
  } = useDecisionActions(setGameState, showToast, characters);
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
