import { useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { 
  GameState,
  Reservation
} from '../types';
import { generateClientData, createNewClient } from '../logic/gameLogic';

export function useClientSpawner(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  const spawnClient = useCallback((res?: Reservation) => {
    setGameState(prev => {
      const clientData = generateClientData(
        res,
        prev.reservations,
        prev.inGameMinutes,
        prev.spawnedReservationIds,
      );
      const newClient = createNewClient({
        data: clientData,
        currentMinutes: prev.inGameMinutes,
        res,
      });

      const nextSpawned = res
        ? [...prev.spawnedReservationIds, res.id]
        : prev.spawnedReservationIds;
      const nextReservations =
        res != null
          ? prev.reservations.map((r) =>
              r.id === res.id ? { ...r, legitQueuedAt: prev.inGameMinutes } : r,
            )
          : prev.reservations;

      return {
        ...prev,
        queue: [...prev.queue, newClient],
        spawnedReservationIds: nextSpawned,
        reservations: nextReservations,
      };
    });
  }, [setGameState]);

  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;

    const toSpawn = gameState.reservations.filter(res => {
      if (gameState.spawnedReservationIds.includes(res.id)) return false;
      const arrivalOffset = Math.floor(Math.random() * 35) - 5;
      return gameState.inGameMinutes >= res.time + arrivalOffset;
    });

    if (toSpawn.length > 0) {
      toSpawn.forEach(res => spawnClient(res));
    }

    if (Math.random() < 0.05 && gameState.queue.length < 5) {
      spawnClient();
    }
  }, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.reservations, gameState.spawnedReservationIds, gameState.queue.length, spawnClient]);

  return { spawnClient };
}
