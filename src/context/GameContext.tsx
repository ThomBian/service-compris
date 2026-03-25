import React, { createContext, useContext, ReactNode } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { GameState } from '../types';

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
  resetGame: (difficulty: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const engine = useGameEngine();

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
