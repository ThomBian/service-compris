import { useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import React from 'react';
import {
  GameState,
  Reservation,
  Client,
  ClientType,
  PhysicalState,
  DialogueState,
  LieType,
  CellState,
  CharacterDefinition,
} from '../types';
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';
import { generateClientData, createNewClient } from '../logic/gameLogic';
import { CHARACTER_ROSTER } from '../logic/characterRoster';
import { START_TIME, FIRST_NAMES, LAST_NAMES, DOORS_CLOSE_TIME } from '../constants';
import { getRule } from '../logic/nightRules';
import { tGame } from '../i18n/tGame';

export function useClientSpawner(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  characters: React.RefObject<Map<string, SpecialCharacter>>
) {
  const spawnClient = useCallback((res?: Reservation) => {
    setGameState(prev => {
      const dailyCharsFromRoster = prev.dailyCharacterIds
        .map(id => CHARACTER_ROSTER.find(c => c.id === id))
        .filter((c): c is CharacterDefinition => c !== undefined);

      const excludeTraits = dailyCharsFromRoster.map(c => c.visualTraits);

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

      // CHARACTER RESERVATION_ALIAS: override visualTraits + set characterId
      if (res?.id.startsWith('char-res-')) {
        const characterId = res.id.slice('char-res-'.length);
        const charDef = dailyCharsFromRoster.find(c => c.id === characterId);
        if (charDef) {
          newClient = { ...newClient, visualTraits: charDef.visualTraits, characterId: charDef.id };
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

  const spawnCharacterWalkIn = useCallback((def: CharacterDefinition) => {
    setGameState(prev => {
      const walkinKey = 'char-walkin-' + def.id;
      if (prev.spawnedReservationIds.includes(walkinKey)) return prev;
      const newClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        type: ClientType.WALK_IN,
        patience: 100,
        physicalState: PhysicalState.IN_QUEUE,
        dialogueState: DialogueState.AWAITING_GREETING,
        spawnTime: prev.inGameMinutes,
        trueFirstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
        trueLastName: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
        truePartySize: def.expectedPartySize,
        isLate: def.arrivalMO === 'LATE',
        lieType: LieType.NONE,
        hasLied: false,
        visualTraits: def.visualTraits,
        isCaught: false,
        characterId: def.id,
        lastMessage: tGame('waitingInLine'),
        chatHistory: [],
      };
      return {
        ...prev,
        queue: [...prev.queue, newClient],
        spawnedReservationIds: [...prev.spawnedReservationIds, walkinKey],
      };
    });
  }, [setGameState]);

  const spawnBypassCharacter = useCallback((def: CharacterDefinition) => {
    setGameState(prev => {
      const walkinKey = 'char-walkin-' + def.id;
      if (prev.spawnedReservationIds.includes(walkinKey)) return prev;

      const syndicateClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        type: ClientType.WALK_IN,
        patience: 100,
        physicalState: PhysicalState.AT_DESK,
        dialogueState: DialogueState.OPENING_GAMBIT,
        spawnTime: prev.inGameMinutes,
        trueFirstName: def.name,
        trueLastName: '',
        truePartySize: def.expectedPartySize,
        isLate: false,
        lieType: LieType.NONE,
        hasLied: false,
        visualTraits: def.visualTraits,
        isCaught: false,
        characterId: def.id,
        lastMessage: tGame('syndicateDemand'),
        chatHistory: [
          { sender: 'maitre-d', text: tGame('maitreGreeting') },
          { sender: 'guest', text: tGame('syndicateDemand') },
        ],
      };

      const character = characters.current.get(def.id);
      const queueUpdate = character?.onDesk ? character.onDesk(prev) : {};

      return {
        ...prev,
        ...queueUpdate,
        currentClient: syndicateClient,
        spawnedReservationIds: [...prev.spawnedReservationIds, walkinKey],
      };
    });
  }, [setGameState, characters]);

  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;
    if (gameState.inGameMinutes >= DOORS_CLOSE_TIME) return;

    const toSpawn = gameState.reservations.filter(res => {
      if (gameState.spawnedReservationIds.includes(res.id)) return false;
      const arrivalOffset = Math.floor(Math.random() * 35) - 5;
      return gameState.inGameMinutes >= res.time + arrivalOffset;
    });

    const reservationsDisabled = getRule<boolean>(gameState.activeRules, 'RESERVATIONS_DISABLED', false);
    if (!reservationsDisabled && toSpawn.length > 0) {
      toSpawn.forEach(res => spawnClient(res));
    }

    const spawnRateMultiplier = getRule<number>(gameState.activeRules, 'QUEUE_SPAWN_RATE', 1);
    if (Math.random() < 0.05 * spawnRateMultiplier && gameState.queue.length < 5) {
      spawnClient();
    }

    const dailyCharsFromRoster = gameState.dailyCharacterIds
      .map(id => CHARACTER_ROSTER.find(c => c.id === id))
      .filter((c): c is CharacterDefinition => c !== undefined);

    dailyCharsFromRoster
      .filter(c => c.arrivalMO === 'WALK_IN' || c.arrivalMO === 'LATE')
      .forEach(c => {
        const walkinKey = 'char-walkin-' + c.id;
        const spawnAt = c.arrivalMO === 'LATE' ? START_TIME + 91 : START_TIME + 90;
        if (
          gameState.inGameMinutes >= spawnAt &&
          !gameState.spawnedReservationIds.includes(walkinKey)
        ) {
          spawnCharacterWalkIn(c);
        }
      });

    // BYPASS characters — direct desk interrupt
    const bypassChars = dailyCharsFromRoster.filter(c =>
      c.arrivalMO === 'BYPASS' &&
      !gameState.spawnedReservationIds.includes('char-walkin-' + c.id) &&
      gameState.queue.length >= 3 &&
      gameState.grid.flat().filter(cell => cell.state === CellState.EMPTY).length <= 4
    );
    bypassChars.forEach(c => spawnBypassCharacter(c));
  }, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.reservations, gameState.spawnedReservationIds, gameState.queue.length, gameState.dailyCharacterIds, gameState.grid, spawnClient, spawnCharacterWalkIn, spawnBypassCharacter]);

  return { spawnClient, spawnCharacterWalkIn };
}
