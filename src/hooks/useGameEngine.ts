import { useState, useCallback, useRef, useEffect } from "react";
import { GameState } from "../types";
import { buildInitialState, PersistState } from "../logic/gameLogic";
import { CHARACTER_ROSTER } from '../logic/characterRoster';
import type { CampaignPath } from '../types/campaign';
import { createCharacter } from '../logic/characters/factory';
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';
import { useGameClock } from "./useGameClock";
import { useClientSpawner } from "./useClientSpawner";
import { useQueueManager } from "./useQueueManager";
import { useQuestionActions } from "./useQuestionActions";
import { useAccusationActions } from "./useAccusationActions";
import { useDecisionActions } from "./useDecisionActions";
import { useReservationActions } from "./useReservationActions";
import { useToast } from "../context/ToastContext";

export function useGameEngine(incrementPathScore?: (path: CampaignPath, delta: number) => void) {
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
  } = useDecisionActions(setGameState, showToast, characters, incrementPathScore);
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
