import React, { createContext, useContext, ReactNode } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { GameState, type MiniGameId } from '../types';
import type { CampaignPath, NightConfig, PathScores } from '../types/campaign';

interface GameContextType {
  gameState: GameState;
  pathScores?: PathScores;
  askQuestion: (field: 'firstName' | 'lastName' | 'time') => void;
  callOutLie: (field: 'size' | 'time' | 'reservation') => void;
  handleDecision: () => void;
  waitInLine: () => void;
  seatParty: () => void;
  toggleCellSelection: (x: number, y: number) => void;
  confirmSeating: () => void;
  refuseSeatedParty: () => void;
  toggleReservationArrived: (id: string) => void;
  setTimeMultiplier: (m: number) => void;
  resetGame: (difficulty: number, persist?: { cash: number; rating: number; morale: number; nightNumber: number }) => void;
  lastCallTable: (partyId: string) => void;
  clearBossEncounter: (outcome: 'WIN' | 'LOSE') => void;
  /** Dev only — set via `useGameEngine` when `import.meta.env.DEV`. */
  devStartBossEncounter?: (miniGame: MiniGameId) => void;
}

interface GameProviderProps {
  children: ReactNode;
  incrementPathScore?: (path: CampaignPath, delta: number) => void;
  pathScores?: PathScores;
  nightConfig?: NightConfig;
  onShowDialogue?: (lines: string[]) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({
  children,
  incrementPathScore,
  pathScores,
  nightConfig,
  onShowDialogue,
}: GameProviderProps) {
  const engine = useGameEngine(incrementPathScore, pathScores, nightConfig, onShowDialogue);

  return (
    <GameContext.Provider value={engine}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
