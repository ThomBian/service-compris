import { useCallback, Dispatch, SetStateAction } from 'react';
import { GameState } from '../types';

export function useReservationActions(
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  const toggleReservationArrived = useCallback((id: string) => {
    setGameState(prev => ({
      ...prev,
      reservations: prev.reservations.map(r => 
        r.id === id ? { ...r, arrived: !r.arrived } : r
      )
    }));
  }, [setGameState]);

  return { toggleReservationArrived };
}
