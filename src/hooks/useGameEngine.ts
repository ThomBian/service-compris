import { useState, useCallback, useRef, useEffect } from "react";
import { GameState, type BossDefinition } from "../types";
import { buildInitialState, PersistState } from "../logic/gameLogic";
import { CHARACTER_ROSTER } from '../logic/characterRoster';
import type { CampaignPath, NightConfig, PathScores } from '../types/campaign';
import { createCharacter } from '../logic/characters/factory';
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';
import { useGameClock } from "./useGameClock";
import { useClientSpawner } from "./useClientSpawner";
import { useScriptedEvents } from "./useScriptedEvents";
import { useQueueManager } from "./useQueueManager";
import { useQuestionActions } from "./useQuestionActions";
import { useAccusationActions } from "./useAccusationActions";
import { useDecisionActions } from "./useDecisionActions";
import { useReservationActions } from "./useReservationActions";
import { useToast } from "../context/ToastContext";

export function useGameEngine(
  incrementPathScore?: (path: CampaignPath, delta: number) => void,
  pathScores?: PathScores,
  nightConfig?: NightConfig,
  onShowDialogue?: (lines: string[]) => void,
  onBossWarning?: (boss: BossDefinition) => void,
) {
  const [gameState, setGameState] = useState<GameState>(() => buildInitialState(0));

  const resetGame = useCallback(
    (difficulty: number, persist?: PersistState) => {
      setGameState(
        buildInitialState(
          difficulty,
          persist,
          nightConfig?.rules ?? [],
          nightConfig?.characterIds,
          pathScores,
        ),
      );
    },
    [pathScores, nightConfig],
  );

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
  const { spawnScriptedCharacter } = useClientSpawner(gameState, setGameState, characters, onBossWarning);
  useQueueManager(gameState, setGameState, showToast, characters);

  useScriptedEvents(
    gameState,
    setGameState,
    nightConfig,
    onShowDialogue ?? (() => {}),
    spawnScriptedCharacter,
  );

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
    clearBossEncounter,
    devStartBossEncounter,
  } = useDecisionActions(setGameState, showToast, characters, incrementPathScore);
  const { toggleReservationArrived } = useReservationActions(setGameState);

  return {
    gameState,
    pathScores,
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
    clearBossEncounter,
    ...(import.meta.env.DEV ? { devStartBossEncounter } : {}),
  };
}
