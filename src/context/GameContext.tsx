import React, { createContext, useContext, ReactNode } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { GameState } from '../types';
import type { CampaignPath } from '../types/campaign';

interface GameContextType {
  gameState: GameState;
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
}

interface GameProviderProps {
  children: ReactNode;
  incrementPathScore?: (path: CampaignPath, delta: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children, incrementPathScore }: GameProviderProps) {
  const engine = useGameEngine(incrementPathScore);

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
