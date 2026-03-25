import { useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import {
  GameState,
  Reservation,
  Client,
  ClientType,
  PhysicalState,
  DialogueState,
  LieType,
  Vip,
} from '../types';
import { generateClientData, createNewClient } from '../logic/gameLogic';
import { START_TIME } from '../constants';

export function useClientSpawner(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  const spawnClient = useCallback((res?: Reservation) => {
    setGameState(prev => {
      const excludeTraits = prev.dailyVips.map(v => v.visualTraits);
      const clientData = generateClientData(
        res,
        prev.reservations,
        prev.inGameMinutes,
        prev.spawnedReservationIds,
        excludeTraits,
      );
      let newClient = createNewClient({
        data: clientData,
        currentMinutes: prev.inGameMinutes,
        res,
      });

      // VIP RESERVATION_ALIAS: override visualTraits + set vipId
      if (res?.id.startsWith('vip-res-')) {
        const vipId = res.id.slice('vip-res-'.length);
        const vip = prev.dailyVips.find(v => v.id === vipId);
        if (vip) {
          newClient = { ...newClient, visualTraits: vip.visualTraits, vipId: vip.id };
        }
      }

      const nextSpawned = res
        ? [...prev.spawnedReservationIds, res.id]
        : prev.spawnedReservationIds;
      const nextReservations = res != null
        ? prev.reservations.map(r => r.id === res.id ? { ...r, legitQueuedAt: prev.inGameMinutes } : r)
        : prev.reservations;

      return {
        ...prev,
        queue: [...prev.queue, newClient],
        spawnedReservationIds: nextSpawned,
        reservations: nextReservations,
      };
    });
  }, [setGameState]);

  const spawnVipWalkIn = useCallback((v: Vip) => {
    setGameState(prev => {
      const walkinKey = 'vip-walkin-' + v.id;
      if (prev.spawnedReservationIds.includes(walkinKey)) return prev;
      const newClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        type: ClientType.WALK_IN,
        patience: 100,
        physicalState: PhysicalState.IN_QUEUE,
        dialogueState: DialogueState.AWAITING_GREETING,
        spawnTime: prev.inGameMinutes,
        trueFirstName: v.name,
        trueLastName: '',
        truePartySize: v.expectedPartySize,
        isLate: v.arrivalMO === 'LATE',
        lieType: LieType.NONE,
        hasLied: false,
        visualTraits: v.visualTraits,
        isCaught: false,
        vipId: v.id,
        lastMessage: 'Waiting in line...',
        chatHistory: [],
      };
      return {
        ...prev,
        queue: [...prev.queue, newClient],
        spawnedReservationIds: [...prev.spawnedReservationIds, walkinKey],
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

    gameState.dailyVips
      .filter(v => v.arrivalMO === 'WALK_IN' || v.arrivalMO === 'LATE')
      .forEach(v => {
        const walkinKey = 'vip-walkin-' + v.id;
        const spawnAt = v.arrivalMO === 'LATE' ? START_TIME + 91 : START_TIME + 90;
        if (
          gameState.inGameMinutes >= spawnAt &&
          !gameState.spawnedReservationIds.includes(walkinKey)
        ) {
          spawnVipWalkIn(v);
        }
      });
  }, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.reservations, gameState.spawnedReservationIds, gameState.queue.length, gameState.dailyVips, spawnClient, spawnVipWalkIn]);

  return { spawnClient, spawnVipWalkIn };
}
