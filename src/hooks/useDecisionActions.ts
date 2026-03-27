import { useCallback, Dispatch, SetStateAction } from "react";
import { flushSync } from "react-dom";
import {
  GameState,
  PhysicalState,
  CellState,
  ClientType,
  LieType,
} from "../types";
import { mealDurationForPartySize } from "../constants";
import {
  handleAcceptedClient,
  handleRefusedClient,
  handleSeatingRefusal,
  canSelectCell,
} from "../logic/gameLogic";
import { computeVipRefusalOutcome } from '../logic/vipLogic';
import { type Toast } from "../context/ToastContext";

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
) {
  const handleDecision = useCallback(() => {
    let toastArgs: [string, string | undefined, Toast["variant"]] | null =
      null;

    flushSync(() => {
      setGameState((prev) => {
        if (!prev.currentClient) return prev;

        const deskClient = prev.currentClient;

        // VIP REFUSE — short-circuit normal logic
        if (deskClient.vipId) {
          const vip = prev.dailyVips.find(v => v.id === deskClient.vipId);
          if (vip) {
            const outcome = computeVipRefusalOutcome(vip, {
              cash: prev.cash,
              rating: prev.rating,
              gameOver: prev.gameOver,
            });
            toastArgs = [vip.consequenceDescription, undefined, 'error'];
            return {
              ...prev,
              currentClient: null,
              cash: outcome.cash,
              rating: outcome.rating,
              gameOver: outcome.gameOver,
              timeMultiplier: outcome.gameOver ? 0 : prev.timeMultiplier,
              logs: [`VIP refused: ${vip.name}.`, ...prev.logs].slice(0, 50),
            };
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

        return {
          ...prev,
          currentClient: null,
          rating: nextRating,
          morale: nextMorale,
          logs: nextLogs.slice(0, 50),
        };
      });
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast]);

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

    flushSync(() => {
      setGameState((prev) => {
        if (!prev.currentClient) return prev;
        const selectedCells = prev.grid
          .flat()
          .filter((c) => c.state === CellState.SELECTED);
        if (selectedCells.length === 0) return prev;

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

        const nextSeatedVipIds = client.vipId
          ? [...prev.seatedVipIds, client.vipId]
          : prev.seatedVipIds;

        if (client.vipId) {
          const vip = prev.dailyVips.find(v => v.id === client.vipId);
          if (vip) {
            toastArgs = [`Well handled — ${vip.name} has been seated.`, undefined, 'success'];
          }
        }

        return {
          ...prev,
          currentClient: null,
          grid: nextGrid,
          reservations: nextReservations,
          cash: nextCash,
          rating: nextRating,
          morale: nextMorale,
          logs: nextLogs.slice(0, 50),
          seatedVipIds: nextSeatedVipIds,
          coversSeated: prev.coversSeated + client.truePartySize,
          shiftRevenue: prev.shiftRevenue + Math.max(0, nextCash - prev.cash),
        };
      });
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast]);

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
        return {
          ...prev,
          currentClient: null,
          grid: nextGrid,
          rating: nextRating,
          morale: nextMorale,
          logs: nextLogs.slice(0, 50),
        };
      });
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast]);

  return {
    handleDecision,
    waitInLine,
    seatParty,
    toggleCellSelection,
    confirmSeating,
    refuseSeatedParty,
  };
}
