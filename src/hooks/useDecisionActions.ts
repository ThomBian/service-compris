import { useCallback, Dispatch, SetStateAction } from 'react';
import { GameState, PhysicalState, CellState } from '../types';
import { mealDurationForPartySize } from '../constants';
import {
  handleAcceptedClient,
  handleRefusedClient,
  handleSeatingRefusal,
  canSelectCell
} from '../logic/gameLogic';

export function useDecisionActions(
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  const handleDecision = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentClient) return prev;

      const {
        nextRating,
        nextMorale,
        nextLogs
      } = handleRefusedClient(
        prev.currentClient,
        prev.rating,
        prev.morale,
        prev.logs
      );

      return {
        ...prev,
        currentClient: null,
        rating: nextRating,
        morale: nextMorale,
        logs: nextLogs.slice(0, 50)
      };
    });
  }, [setGameState]);

  const waitInLine = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentClient) return prev;
      const client = { ...prev.currentClient, physicalState: PhysicalState.IN_QUEUE };
      return {
        ...prev,
        queue: [client, ...prev.queue],
        currentClient: null,
        logs: [`Sent ${client.trueFirstName} back to the line.`, ...prev.logs]
      };
    });
  }, [setGameState]);

  const seatParty = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentClient) return prev;
      return {
        ...prev,
        currentClient: {
          ...prev.currentClient,
          physicalState: PhysicalState.SEATING
        }
      };
    });
  }, [setGameState]);

  const toggleCellSelection = useCallback((x: number, y: number) => {
    setGameState(prev => {
      const cell = prev.grid[y][x];
      const selectedCells = prev.grid.flat().filter(c => c.state === CellState.SELECTED);
      
      const isAlreadySelected = cell.state === CellState.SELECTED;
      
      const nextGrid = prev.grid.map((row, ry) => row.map((c, cx) => {
        if (ry === y && cx === x) {
          if (isAlreadySelected) {
            return { ...c, state: CellState.EMPTY };
          }
          if (canSelectCell(c, selectedCells)) {
            return { ...c, state: CellState.SELECTED };
          }
        }
        return c;
      }));

      return { ...prev, grid: nextGrid };
    });
  }, [setGameState]);

  const confirmSeating = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentClient) return prev;
      const selectedCells = prev.grid.flat().filter(c => c.state === CellState.SELECTED);
      if (selectedCells.length === 0) return prev;

      const {
        nextCash,
        nextRating,
        nextMorale,
        nextLogs
      } = handleAcceptedClient(
        prev.currentClient,
        selectedCells.length,
        prev.cash,
        prev.rating,
        prev.morale,
        prev.logs
      );

      const partyId = prev.currentClient.id;
      const mealMinutes = mealDurationForPartySize(prev.currentClient.truePartySize);
      const nextGrid = prev.grid.map(row => row.map(cell => {
        if (cell.state === CellState.SELECTED) {
          return {
            ...cell,
            state: CellState.OCCUPIED,
            mealDuration: mealMinutes,
            partyId
          };
        }
        return cell;
      }));

      return {
        ...prev,
        currentClient: null,
        grid: nextGrid,
        cash: nextCash,
        rating: nextRating,
        morale: nextMorale,
        logs: nextLogs.slice(0, 50)
      };
    });
  }, [setGameState]);

  const refuseSeatedParty = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentClient || prev.currentClient.physicalState !== PhysicalState.SEATING) return prev;
      const { nextRating, nextMorale, nextLogs } = handleSeatingRefusal(
        prev.currentClient,
        prev.rating,
        prev.morale,
        prev.logs
      );
      const nextGrid = prev.grid.map(row => row.map(cell =>
        cell.state === CellState.SELECTED ? { ...cell, state: CellState.EMPTY } : cell
      ));
      return {
        ...prev,
        currentClient: null,
        grid: nextGrid,
        rating: nextRating,
        morale: nextMorale,
        logs: nextLogs.slice(0, 50)
      };
    });
  }, [setGameState]);

  return {
    handleDecision,
    waitInLine,
    seatParty,
    toggleCellSelection,
    confirmSeating,
    refuseSeatedParty
  };
}
