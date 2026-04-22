import React, { useCallback, Dispatch, SetStateAction } from "react";
import { flushSync } from "react-dom";
import {
  GameState,
  PhysicalState,
  CellState,
  ClientType,
  DialogueState,
  LieType,
  type BossDefinition,
  type Client,
  type MiniGameId,
} from "../types";
import { mealDurationForPartySize, LAST_CALL_RATING_PENALTY } from "../constants";
import { getRule } from "../logic/nightRules";
import { PATH_SCORE_WEIGHTS } from '../data/pathScoreWeights';
import type { CampaignPath } from '../types/campaign';
import {
  handleAcceptedClient,
  handleRefusedClient,
  handleSeatingRefusal,
  canSelectCell,
  applyMoraleGameOver,
  clearFloorplanSelection,
} from "../logic/gameLogic";
import { type Toast } from "../context/ToastContext";
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';
import { tGame, tCharacter } from '../i18n/tGame';
import { BOSS_ROSTER, bossForMiniGame } from '../data/bossRoster';
import { createCharacter } from '../logic/characters/factory';

function deskClientForBossEncounter(prev: GameState, boss: BossDefinition): Client {
  return {
    id: `dev-boss-${boss.id}-${Math.random().toString(36).slice(2, 9)}`,
    type: ClientType.WALK_IN,
    patience: 100,
    physicalState: PhysicalState.AT_DESK,
    dialogueState: DialogueState.OPENING_GAMBIT,
    spawnTime: prev.inGameMinutes,
    trueFirstName: boss.name,
    trueLastName: '',
    truePartySize: boss.expectedPartySize,
    isLate: false,
    lieType: LieType.NONE,
    hasLied: false,
    visualTraits: boss.visualTraits,
    isCaught: false,
    characterId: boss.id,
    lastMessage: '',
    chatHistory: [],
  };
}

type ShowToast = (
  title: string,
  detail?: string,
  variant?: Toast["variant"],
  duration?: number,
) => void;

function buildDeltaDetail(
  cashDelta: number,
  ratingDelta: number,
  moraleDelta: number,
): string | undefined {
  const parts: string[] = [];
  if (cashDelta !== 0) {
    parts.push(
      tGame(cashDelta > 0 ? 'delta.cashPos' : 'delta.cashNeg', {
        amount: Math.round(Math.abs(cashDelta)),
      }),
    );
  }
  if (ratingDelta !== 0) {
    parts.push(
      tGame(ratingDelta > 0 ? 'delta.ratingPos' : 'delta.ratingNeg', {
        v: ratingDelta.toFixed(1),
      }),
    );
  }
  if (moraleDelta !== 0) {
    parts.push(
      tGame(moraleDelta > 0 ? 'delta.moralePos' : 'delta.moraleNeg', {
        v: String(moraleDelta),
      }),
    );
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function useDecisionActions(
  setGameState: Dispatch<SetStateAction<GameState>>,
  showToast: ShowToast,
  characters: React.RefObject<Map<string, SpecialCharacter>>,
  incrementPathScore?: (path: CampaignPath, delta: number) => void,
) {
  const handleDecision = useCallback(() => {
    let toastArgs: [string, string | undefined, Toast["variant"]] | null =
      null;
    let pathScoreEvent: { key: string } | null = null;

    flushSync(() => {
      setGameState((prev) => {
        if (!prev.currentClient) return prev;

        const deskClient = prev.currentClient;

        // BOSS BANNED interception — gate the refuse behind a mini-game
        if (deskClient.characterId) {
          const boss = BOSS_ROSTER.find(
            b => b.id === deskClient.characterId && b.role === 'BANNED',
          );
          if (boss) {
            return {
              ...prev,
              activeBossEncounter: {
                bossId: boss.id,
                interceptedAction: 'REFUSE' as const,
                miniGame: boss.miniGame,
                previousTimeMultiplier: prev.timeMultiplier,
              },
              timeMultiplier: 0,
            };
          }
        }

        // CHARACTER REFUSE — short-circuit normal logic
        if (deskClient.characterId) {
          const ch = characters.current.get(deskClient.characterId);
          if (ch) {
            const outcome = ch.onRefused(prev);
            const def = ch.def;
            if (def.role === 'BANNED') {
              toastArgs = [tCharacter(def.id, 'refusalDescription', def.refusalDescription ?? tGame('toast.bannedTurnedAway')), undefined, 'success'];
            } else {
              toastArgs = [tCharacter(def.id, 'consequenceDescription', def.consequenceDescription), undefined, 'error'];
            }
            pathScoreEvent = { key: `${deskClient.characterId}:refused` };
            const next = {
              ...prev,
              ...outcome,
              grid: clearFloorplanSelection(prev.grid),
              currentClient: null,
              logs: [tGame('logVipRefused', { role: tGame(def.role === 'VIP' ? 'roleVip' : 'roleBanned'), name: def.name }), ...prev.logs].slice(0, 50),
            };
            return applyMoraleGameOver(next);
          }
        }

        const { nextRating, nextMorale, nextLogs } = handleRefusedClient(
          deskClient,
          prev.rating,
          prev.morale,
          prev.logs,
        );

        // No toast for walk-in refusal (silent decline).
        if (deskClient.type !== ClientType.WALK_IN) {
          // Mirrors the isJustified logic inside handleRefusedClient (gameLogic.ts).
          const isJustified =
            deskClient.type === ClientType.SCAMMER ||
            deskClient.lieType === LieType.SIZE ||
            deskClient.isLate;

          const detail = buildDeltaDetail(
            0,
            nextRating - prev.rating,
            nextMorale - prev.morale,
          );
          toastArgs = isJustified
            ? [tGame('toast.justifiedTitle'), detail, 'success']
            : [tGame('toast.unjustifiedTitle'), detail, 'error'];
        }

        return applyMoraleGameOver({
          ...prev,
          grid: clearFloorplanSelection(prev.grid),
          currentClient: null,
          rating: nextRating,
          morale: nextMorale,
          logs: nextLogs.slice(0, 50),
        });
      });
    });

    if (toastArgs) showToast(...toastArgs);
    if (pathScoreEvent && incrementPathScore) {
      const weight = PATH_SCORE_WEIGHTS[(pathScoreEvent as { key: string }).key];
      if (weight) incrementPathScore(weight.path, weight.delta);
    }
  }, [setGameState, showToast, characters, incrementPathScore]);

  const waitInLine = useCallback(() => {
    setGameState((prev) => {
      if (!prev.currentClient) return prev;
      const client = {
        ...prev.currentClient,
        physicalState: PhysicalState.IN_QUEUE,
      };
      return {
        ...prev,
        grid: clearFloorplanSelection(prev.grid),
        queue: [client, ...prev.queue],
        currentClient: null,
        logs: [tGame('logSentBack', { name: client.trueFirstName }), ...prev.logs],
      };
    });
  }, [setGameState]);

  const seatParty = useCallback(() => {
    setGameState((prev) => {
      if (!prev.currentClient) return prev;
      const boss = prev.currentClient.characterId
        ? BOSS_ROSTER.find(
            b => b.id === prev.currentClient!.characterId && b.role === 'VIP',
          )
        : undefined;
      if (boss) {
        return {
          ...prev,
          activeBossEncounter: {
            bossId: boss.id,
            interceptedAction: 'SEAT' as const,
            miniGame: boss.miniGame,
            previousTimeMultiplier: prev.timeMultiplier,
          },
          timeMultiplier: 0,
        };
      }
      return {
        ...prev,
        grid: clearFloorplanSelection(prev.grid),
        currentClient: {
          ...prev.currentClient,
          physicalState: PhysicalState.SEATING,
        },
      };
    });
  }, [setGameState]);

  const clearBossEncounter = useCallback(
    (outcome: 'WIN' | 'LOSE') => {
      let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

      flushSync(() => {
        setGameState((prev) => {
          if (!prev.activeBossEncounter) return prev;
          const { bossId, interceptedAction, previousTimeMultiplier } =
            prev.activeBossEncounter;
          const boss = BOSS_ROSTER.find(b => b.id === bossId);
          const base = {
            ...prev,
            activeBossEncounter: null,
            timeMultiplier: previousTimeMultiplier,
          };
          if (!boss) return base;

          const ch = createCharacter(boss);

          if (outcome === 'WIN') {
            if (interceptedAction === 'SEAT') {
              toastArgs = [
                tGame('boss.winSeat', { name: boss.name }),
                undefined,
                'success',
              ];
              return {
                ...base,
                grid: clearFloorplanSelection(prev.grid),
                currentClient: prev.currentClient
                  ? { ...prev.currentClient, physicalState: PhysicalState.SEATING }
                  : null,
              };
            }
            const charOutcome = ch.onRefused(prev);
            toastArgs = [
              tGame('boss.winRefuse', { name: boss.name }),
              undefined,
              'success',
            ];
            return applyMoraleGameOver({
              ...base,
              ...charOutcome,
              currentClient: null,
              logs: [
                tGame('logVipRefused', {
                  role: tGame('roleBanned'),
                  name: boss.name,
                }),
                ...base.logs,
              ].slice(0, 50),
            });
          }
          if (interceptedAction === 'SEAT') {
            toastArgs = [
              tGame('boss.loseSeat', { name: boss.name }),
              undefined,
              'error',
            ];
            return {
              ...base,
              grid: clearFloorplanSelection(prev.grid),
              currentClient: prev.currentClient
                ? { ...prev.currentClient, physicalState: PhysicalState.SEATING }
                : null,
            };
          }
          toastArgs = [
            tGame('boss.loseRefuse', { name: boss.name }),
            undefined,
            'error',
          ];
          return {
            ...base,
            grid: clearFloorplanSelection(prev.grid),
            currentClient: prev.currentClient
              ? { ...prev.currentClient, physicalState: PhysicalState.SEATING }
              : null,
          };
        });
      });

      if (toastArgs) showToast(...toastArgs);
    },
    [setGameState, showToast],
  );

  const toggleCellSelection = useCallback(
    (x: number, y: number) => {
      setGameState((prev) => {
        const cell = prev.grid[y][x];
        const selectedCells = prev.grid
          .flat()
          .filter((c) => c.state === CellState.SELECTED);

        const isAlreadySelected = cell.state === CellState.SELECTED;

        const nextGrid = prev.grid.map((row, ry) =>
          row.map((c, cx) => {
            if (ry === y && cx === x) {
              if (isAlreadySelected) {
                return { ...c, state: CellState.EMPTY };
              }
              if (canSelectCell(c, selectedCells)) {
                return { ...c, state: CellState.SELECTED };
              }
            }
            return c;
          }),
        );

        return { ...prev, grid: nextGrid };
      });
    },
    [setGameState],
  );

  const confirmSeating = useCallback(() => {
    let toastArgs: [string, string | undefined, Toast["variant"]] | null =
      null;
    let seatPathKey: string | null = null;

    flushSync(() => {
      setGameState((prev) => {
        if (!prev.currentClient) return prev;
        const selectedCells = prev.grid
          .flat()
          .filter((c) => c.state === CellState.SELECTED);
        if (selectedCells.length === 0) return prev;

        const deskClient = prev.currentClient;
        if (deskClient.characterId) {
          seatPathKey = `${deskClient.characterId}:seated`;
        }

        // BANNED CHARACTER SEATED — game-over path
        if (deskClient.characterId) {
          const ch = characters.current.get(deskClient.characterId);
          const def = ch?.def;
          if (ch && def?.role === 'BANNED') {
            const outcome = ch.onSeated(prev);
            const gridClearedSelection = prev.grid.map((row) =>
              row.map((c) =>
                c.state === CellState.SELECTED ? { ...c, state: CellState.EMPTY } : c,
              ),
            );
            toastArgs = [tCharacter(def.id, 'consequenceDescription', def.consequenceDescription), undefined, 'error'];
            const next = {
              ...prev,
              ...outcome,
              currentClient: null,
              grid: gridClearedSelection,
              seatedCharacterIds: [...prev.seatedCharacterIds, def.id],
              logs: [tGame('logBannedSeated', { name: def.name }), ...prev.logs].slice(0, 50),
            };
            return applyMoraleGameOver(next);
          }
        }

        const { nextCash, nextRating, nextMorale, nextLogs } =
          handleAcceptedClient(
            prev.currentClient,
            selectedCells.length,
            prev.cash,
            prev.rating,
            prev.morale,
            prev.logs,
          );

        const client = prev.currentClient;
        const detail = buildDeltaDetail(
          nextCash - prev.cash,
          nextRating - prev.rating,
          nextMorale - prev.morale,
        );

        if (client.hasLied && client.isCaught) {
          toastArgs = [tGame('toast.gratefulLiar'), detail, 'success'];
        } else if (client.hasLied && client.type === ClientType.SCAMMER) {
          toastArgs = [tGame('toast.fooledScammer'), detail, 'error'];
        } else if (client.hasLied) {
          toastArgs = [tGame('toast.fooledRulebreaker'), detail, 'error'];
        } else {
          toastArgs = [tGame('toast.accepted', { name: client.trueFirstName }), detail, 'success'];
        }

        const partyId = client.id;
        const mealMinutes = mealDurationForPartySize(client.truePartySize);
        const nextGrid = prev.grid.map((row) =>
          row.map((cell) => {
            if (cell.state === CellState.SELECTED) {
              return {
                ...cell,
                state: CellState.OCCUPIED,
                mealDuration: mealMinutes,
                partyId,
              };
            }
            return cell;
          }),
        );

        const seatedReservationId =
          client.trueReservationId ?? client.claimedReservationId;
        const nextReservations = seatedReservationId
          ? prev.reservations.map((r) =>
              r.id === seatedReservationId ? { ...r, partySeated: true } : r,
            )
          : prev.reservations;

        const nextSeatedCharacterIds = client.characterId
          ? [...prev.seatedCharacterIds, client.characterId]
          : prev.seatedCharacterIds;

        const finalState: Partial<GameState> = {
          cash: nextCash,
          rating: nextRating,
          morale: nextMorale,
        };

        if (client.characterId) {
          const ch = characters.current.get(client.characterId);
          if (ch) {
            // onSeated receives prev, so character cash outcomes replace (not augment) base revenue
            const outcome = ch.onSeated(prev);
            Object.assign(finalState, outcome);
            toastArgs = [tGame('toast.vipSeatedWell', { name: ch.def.name }), undefined, 'success'];
          }
        }

        const nextCoversSeated = prev.coversSeated + client.truePartySize;
        const coversTarget = getRule<number>(prev.activeRules, 'COVERS_TARGET', 0);
        const coversTargetHit = coversTarget > 0 && nextCoversSeated >= coversTarget;

        return applyMoraleGameOver({
          ...prev,
          ...finalState,
          currentClient: null,
          grid: nextGrid,
          reservations: nextReservations,
          logs: nextLogs.slice(0, 50),
          seatedCharacterIds: nextSeatedCharacterIds,
          coversSeated: nextCoversSeated,
          shiftRevenue: prev.shiftRevenue + Math.max(0, nextCash - prev.cash),
          ...(coversTargetHit ? { gameOver: true, gameOverReason: 'COVERS_TARGET' as const } : {}),
        });
      });
    });

    if (toastArgs) showToast(...toastArgs);
    if (seatPathKey && incrementPathScore) {
      const weight = PATH_SCORE_WEIGHTS[seatPathKey];
      if (weight) incrementPathScore(weight.path, weight.delta);
    }
  }, [setGameState, showToast, characters, incrementPathScore]);

  const refuseSeatedParty = useCallback(() => {
    let toastArgs: [string, string | undefined, Toast["variant"]] | null =
      null;

    flushSync(() => {
      setGameState((prev) => {
        if (
          !prev.currentClient ||
          prev.currentClient.physicalState !== PhysicalState.SEATING
        ) {
          return prev;
        }
        const { nextRating, nextMorale, nextLogs } = handleSeatingRefusal(
          prev.currentClient,
          prev.rating,
          prev.morale,
          prev.logs,
        );

        const detail = buildDeltaDetail(
          0,
          nextRating - prev.rating,
          nextMorale - prev.morale,
        );
        toastArgs = [tGame('toast.refusedAfterSeating'), detail, 'error'];

        const nextGrid = prev.grid.map((row) =>
          row.map((cell) =>
            cell.state === CellState.SELECTED
              ? { ...cell, state: CellState.EMPTY }
              : cell,
          ),
        );
        return applyMoraleGameOver({
          ...prev,
          currentClient: null,
          grid: nextGrid,
          rating: nextRating,
          morale: nextMorale,
          logs: nextLogs.slice(0, 50),
        });
      });
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast]);

  const lastCallTable = useCallback((partyId: string) => {
    setGameState(prev => {
      const nextGrid = prev.grid.map(row =>
        row.map(cell =>
          cell.state === CellState.OCCUPIED && cell.partyId === partyId
            ? {
                ...cell,
                state: CellState.EMPTY,
                mealDuration: undefined,
                partyId: undefined,
              }
            : cell
        )
      );
      // Floor at 1.0 (not 0) to avoid a death-spiral during overtime — rushing tables
      // shouldn't be more punishing than normal rating penalties from bad decisions.
      const nextRating = Math.max(1.0, prev.rating - LAST_CALL_RATING_PENALTY);
      return {
        ...prev,
        grid: nextGrid,
        rating: nextRating,
        logs: [tGame('logRushedTable'), ...prev.logs].slice(0, 50),
      };
    });
  }, [setGameState]);

  const devStartBossEncounter = useCallback((miniGame: MiniGameId) => {
    if (!import.meta.env.DEV) return;
    setGameState(prev => {
      const boss = bossForMiniGame(miniGame);
      const interceptedAction = boss.role === "VIP" ? ("SEAT" as const) : ("REFUSE" as const);
      const needsDesk =
        !prev.currentClient || prev.currentClient.characterId !== boss.id;
      return {
        ...prev,
        currentClient: needsDesk
          ? deskClientForBossEncounter(prev, boss)
          : prev.currentClient,
        activeBossEncounter: {
          bossId: boss.id,
          interceptedAction,
          miniGame: boss.miniGame,
          previousTimeMultiplier: prev.timeMultiplier,
        },
        timeMultiplier: 0,
      };
    });
  }, [setGameState]);

  return {
    handleDecision,
    waitInLine,
    seatParty,
    toggleCellSelection,
    confirmSeating,
    refuseSeatedParty,
    lastCallTable,
    clearBossEncounter,
    devStartBossEncounter,
  };
}
