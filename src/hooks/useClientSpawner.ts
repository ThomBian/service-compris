import { useCallback, useEffect, useRef, Dispatch, SetStateAction } from 'react';
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
import { BOSS_ROSTER } from '../data/bossRoster';
import { START_TIME, FIRST_NAMES, LAST_NAMES, DOORS_CLOSE_TIME, BOSS_WARN_DELAY_MS } from '../constants';
import type { BossDefinition } from '../types';
import { getRule } from '../logic/nightRules';
import { tGame } from '../i18n/tGame';

export function useClientSpawner(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  characters: React.RefObject<Map<string, SpecialCharacter>>,
  onBossWarning?: (boss: BossDefinition) => void,
) {
  const warnedBossIdsRef = useRef<Set<string>>(new Set());
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

  const spawnScriptedCharacter = useCallback(
    (characterId: string) => {
      const charDef = CHARACTER_ROSTER.find(c => c.id === characterId);
      if (charDef) {
        spawnCharacterWalkIn(charDef);
        return;
      }

      if (characterId === 'n1-walkIn-couple') {
        setGameState(prev => {
          const spawnKey = 'scripted-' + characterId;
          if (prev.spawnedReservationIds.includes(spawnKey)) return prev;
          const newClient: Client = {
            id: Math.random().toString(36).slice(2, 11),
            type: ClientType.WALK_IN,
            patience: 100,
            physicalState: PhysicalState.IN_QUEUE,
            dialogueState: DialogueState.AWAITING_GREETING,
            spawnTime: prev.inGameMinutes,
            trueFirstName: 'Marie',
            trueLastName: 'Leblanc',
            truePartySize: 2,
            isLate: false,
            lieType: LieType.NONE,
            hasLied: false,
            visualTraits: {
              skinTone: 2,
              hairStyle: 1,
              hairColor: 2,
              clothingStyle: 2,
              clothingColor: 0,
              height: 1,
            },
            isCaught: false,
            characterId: 'n1-walkIn-couple',
            lastMessage: tGame('waitingInLine'),
            chatHistory: [],
          };
          return {
            ...prev,
            queue: [...prev.queue, newClient],
            spawnedReservationIds: [...prev.spawnedReservationIds, spawnKey],
          };
        });
        return;
      }

      if (!characterId.startsWith('n1-res-')) return;

      setGameState(prev => {
        const res = prev.reservations.find(r => r.id === characterId);
        if (!res || prev.spawnedReservationIds.includes(res.id)) return prev;

        if (characterId === 'n1-res-late-group') {
          const scammer: Client = {
            id: Math.random().toString(36).slice(2, 11),
            type: ClientType.SCAMMER,
            patience: 100,
            physicalState: PhysicalState.IN_QUEUE,
            dialogueState: DialogueState.AWAITING_GREETING,
            spawnTime: prev.inGameMinutes,
            trueFirstName: res.firstName,
            trueLastName: res.lastName,
            truePartySize: 4,
            trueReservationId: res.id,
            isLate: true,
            lieType: LieType.SIZE,
            hasLied: false,
            visualTraits: {
              skinTone: 3,
              hairStyle: 0,
              hairColor: 3,
              clothingStyle: 1,
              clothingColor: 2,
              height: 1,
            },
            isCaught: false,
            characterId: 'n1-res-late-group',
            lastMessage: tGame('waitingInLine'),
            chatHistory: [],
          };
          return {
            ...prev,
            queue: [...prev.queue, scammer],
            spawnedReservationIds: [...prev.spawnedReservationIds, res.id],
          };
        }

        if (characterId === 'n1-res-businessman') {
          const newClient: Client = {
            id: Math.random().toString(36).slice(2, 11),
            type: ClientType.LEGITIMATE,
            patience: 100,
            physicalState: PhysicalState.IN_QUEUE,
            dialogueState: DialogueState.AWAITING_GREETING,
            spawnTime: prev.inGameMinutes,
            trueFirstName: res.firstName,
            trueLastName: res.lastName,
            truePartySize: res.partySize,
            trueReservationId: res.id,
            isLate: false,
            lieType: LieType.NONE,
            hasLied: false,
            visualTraits: {
              skinTone: 1,
              hairStyle: 2,
              hairColor: 3,
              clothingStyle: 3,
              clothingColor: 1,
              height: 2,
            },
            isCaught: false,
            characterId: 'n1-res-businessman',
            lastMessage: tGame('waitingInLine'),
            chatHistory: [],
          };
          return {
            ...prev,
            queue: [...prev.queue, newClient],
            spawnedReservationIds: [...prev.spawnedReservationIds, res.id],
            reservations: prev.reservations.map(r =>
              r.id === res.id ? { ...r, legitQueuedAt: prev.inGameMinutes } : r,
            ),
          };
        }

        if (characterId === 'n1-res-phantom') {
          const phantomDef = CHARACTER_ROSTER.find(c => c.id === 'n1-phantom-eater-night1');
          const newClient: Client = {
            id: Math.random().toString(36).slice(2, 11),
            type: ClientType.SCAMMER,
            patience: 100,
            physicalState: PhysicalState.IN_QUEUE,
            dialogueState: DialogueState.AWAITING_GREETING,
            spawnTime: prev.inGameMinutes,
            trueFirstName: 'Fantôme',
            trueLastName: 'Inconnu',
            truePartySize: 1,
            trueReservationId: res.id,
            isLate: false,
            lieType: LieType.IDENTITY,
            hasLied: false,
            visualTraits: phantomDef?.visualTraits ?? {
              skinTone: 0,
              hairStyle: 3,
              hairColor: 2,
              clothingStyle: 1,
              clothingColor: 4,
              height: 1,
              glasses: 0,
            },
            isCaught: false,
            characterId: 'n1-phantom-eater-night1',
            lastMessage: tGame('waitingInLine'),
            chatHistory: [],
          };
          return {
            ...prev,
            queue: [...prev.queue, newClient],
            spawnedReservationIds: [...prev.spawnedReservationIds, res.id],
          };
        }

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
        if (res.id.startsWith('char-res-')) {
          const rosterId = res.id.slice('char-res-'.length);
          const def = dailyCharsFromRoster.find(c => c.id === rosterId);
          if (def) {
            newClient = { ...newClient, visualTraits: def.visualTraits, characterId: def.id };
          }
        } else if (res.id.startsWith('n1-res-')) {
          newClient = { ...newClient, characterId: res.id };
        }
        return {
          ...prev,
          queue: [...prev.queue, newClient],
          spawnedReservationIds: [...prev.spawnedReservationIds, res.id],
          reservations: prev.reservations.map(r =>
            r.id === res.id ? { ...r, legitQueuedAt: prev.inGameMinutes } : r,
          ),
        };
      });
    },
    [setGameState, spawnCharacterWalkIn],
  );

  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;
    const closeTime = getRule<number>(gameState.activeRules, 'SHIFT_END_TIME', DOORS_CLOSE_TIME);
    if (gameState.inGameMinutes >= closeTime) return;

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
    if (!reservationsDisabled && Math.random() < 0.05 * spawnRateMultiplier && gameState.queue.length < 5) {
      spawnClient();
    }

    const dailyCharsFromRoster = gameState.dailyCharacterIds
      .map(id => CHARACTER_ROSTER.find(c => c.id === id))
      .filter((c): c is CharacterDefinition => c !== undefined);

    dailyCharsFromRoster
      .filter(
        c =>
          (c.arrivalMO === 'WALK_IN' || c.arrivalMO === 'LATE') &&
          !c.id.startsWith('n1-'),
      )
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

    // BOSS CHARACTERS — warn first, spawn after delay
    BOSS_ROSTER.forEach(boss => {
      const spawnKey = 'char-walkin-' + boss.id;
      if (gameState.spawnedReservationIds.includes(spawnKey)) return;
      if (warnedBossIdsRef.current.has(boss.id)) return;
      if (!boss.spawnCondition(gameState)) return;

      warnedBossIdsRef.current.add(boss.id);
      onBossWarning?.(boss);
      setTimeout(() => spawnCharacterWalkIn(boss), BOSS_WARN_DELAY_MS);
    });
  }, [
    gameState.inGameMinutes,
    gameState.timeMultiplier,
    gameState.reservations,
    gameState.spawnedReservationIds,
    gameState.queue,
    gameState.queue.length,
    gameState.dailyCharacterIds,
    gameState.grid,
    gameState.cash,
    gameState.rating,
    gameState.shiftRevenue,
    gameState.morale,
    onBossWarning,
    spawnClient,
    spawnCharacterWalkIn,
    spawnBypassCharacter,
  ]);

  return { spawnClient, spawnCharacterWalkIn, spawnScriptedCharacter };
}
