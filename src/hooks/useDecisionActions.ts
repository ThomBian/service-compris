import React, { useCallback, Dispatch, SetStateAction } from "react";
import { flushSync } from "react-dom";
import {
  GameState,
  PhysicalState,
  CellState,
  ClientType,
  LieType,
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
} from "../logic/gameLogic";
import { type Toast } from "../context/ToastContext";
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';

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
      cashDelta > 0
        ? `+$${Math.round(cashDelta)}`
        : `-$${Math.round(Math.abs(cashDelta))}`,
    );
  }
  if (ratingDelta !== 0) {
    parts.push(
      ratingDelta > 0
        ? `★ +${ratingDelta.toFixed(1)}`
        : `★ ${ratingDelta.toFixed(1)}`,
    );
  }
  if (moraleDelta !== 0) {
    parts.push(
      moraleDelta > 0 ? `♥ +${moraleDelta}` : `♥ ${moraleDelta}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
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

        // CHARACTER REFUSE — short-circuit normal logic
        if (deskClient.characterId) {
          const ch = characters.current.get(deskClient.characterId);
          if (ch) {
            const outcome = ch.onRefused(prev);
            const def = ch.def;
            if (def.role === 'BANNED') {
              toastArgs = [def.refusalDescription ?? 'Banned guest turned away.', undefined, 'success'];
            } else {
              toastArgs = [def.consequenceDescription, undefined, 'error'];
            }
            pathScoreEvent = { key: `${deskClient.characterId}:refused` };
            const next = {
              ...prev,
              ...outcome,
              currentClient: null,
              logs: [`${def.role === 'VIP' ? 'VIP' : 'Banned'} refused: ${def.name}.`, ...prev.logs].slice(0, 50),
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
            ? ["Justified Refusal", detail, "success"]
            : ["Unjustified Refusal", detail, "error"];
        }

        return applyMoraleGameOver({
          ...prev,
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
        queue: [client, ...prev.queue],
        currentClient: null,
        logs: [`Sent ${client.trueFirstName} back to the line.`, ...prev.logs],
      };
    });
  }, [setGameState]);

  const seatParty = useCallback(() => {
    setGameState((prev) => {
      if (!prev.currentClient) return prev;
      return {
        ...prev,
        currentClient: {
          ...prev.currentClient,
          physicalState: PhysicalState.SEATING,
        },
      };
    });
  }, [setGameState]);

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
            toastArgs = [def.consequenceDescription, undefined, 'error'];
            const next = {
              ...prev,
              ...outcome,
              currentClient: null,
              grid: gridClearedSelection,
              seatedCharacterIds: [...prev.seatedCharacterIds, def.id],
              logs: [`Banned customer seated: ${def.name}.`, ...prev.logs].slice(0, 50),
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
          toastArgs = ["Grateful Liar — well played!", detail, "success"];
        } else if (client.hasLied && client.type === ClientType.SCAMMER) {
          toastArgs = ["Fooled! Seated a scammer", detail, "error"];
        } else if (client.hasLied) {
          toastArgs = ["Rule-breaker slipped through", detail, "error"];
        } else {
          toastArgs = [`✓ Accepted ${client.trueFirstName}`, detail, "success"];
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
            toastArgs = [`Well handled — ${ch.def.name} has been seated.`, undefined, 'success'];
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
        toastArgs = ["Refused after seating", detail, "error"];

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
        logs: ['Rushed table — party asked to leave early.', ...prev.logs].slice(0, 50),
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
  };
}
