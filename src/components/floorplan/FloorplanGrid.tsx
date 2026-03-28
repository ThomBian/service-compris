import React, { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useGame } from "../../context/GameContext";
import { useToast } from "../../context/ToastContext";
import { CellState, PhysicalState } from "../../types";
import { canSelectCell } from "../../logic/gameLogic";
import { Check, X, Users } from "lucide-react";
import { GRID_SIZE, TABLE_TURNING_SOON_THRESHOLD } from "../../constants";
import { useContainerSize } from "../../hooks/useContainerSize";
import { getRule } from "../../logic/nightRules";

interface FloorplanGridProps {
  isOvertime?: boolean;
}

export const FloorplanGrid: React.FC<FloorplanGridProps> = ({ isOvertime = false }) => {
  const { gameState, toggleCellSelection, confirmSeating, refuseSeatedParty, lastCallTable } =
    useGame();
  const { showToast } = useToast();

  const { grid, currentClient, activeRules } = gameState;
  const isSeating = currentClient?.physicalState === PhysicalState.SEATING;
  const blockedCells = getRule<[number, number][]>(activeRules, 'BLOCKED_GRID_CELLS', []);

  const selectedCells = grid
    .flat()
    .filter((c) => c.state === CellState.SELECTED);
  const partySize = currentClient?.truePartySize || 0;
  const isCropping =
    isSeating && selectedCells.length > 0 && selectedCells.length < partySize;
  const canConfirm = isSeating && selectedCells.length > 0;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerSize(wrapperRef);
  const gridSize = Math.min(width, height);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!isSeating) return;
    const cell = grid[y][x];
    if (cell.state === CellState.OCCUPIED) {
      showToast('Table is occupied', `${cell.mealDuration ?? 0}m remaining`, 'info', 1500);
      return;
    }
    if (cell.state === CellState.EMPTY && !canSelectCell(cell, selectedCells)) {
      showToast('Must be adjacent', 'Select a cell next to an existing selection', 'info', 1500);
      return;
    }
    toggleCellSelection(x, y);
  }, [isSeating, grid, selectedCells, toggleCellSelection, showToast]);

  // Auto-confirm when party size is reached
  useEffect(() => {
    if (isSeating && selectedCells.length === partySize && partySize > 0) {
      const timer = setTimeout(() => {
        confirmSeating();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedCells.length, partySize, isSeating, confirmSeating]);

  const occupiedPartyIds = [...new Set<string>(
    gameState.grid.flat()
      .filter(c => c.state === CellState.OCCUPIED && c.partyId)
      .map(c => c.partyId!)
  )];

  return (
    <div className="flex flex-col gap-4 bg-[#E4E3E0] p-6 h-full overflow-hidden" data-tour="floorplan">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#141414]/20 pb-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-[#141414] flex items-center gap-2">
            <Users className="w-5 h-5" />
            Floorplan
          </h2>
          {isSeating ? (
            <p
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isCropping ? "text-amber-500" : "text-emerald-600 animate-pulse"}`}
            >
              {isCropping && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
              Seating: {currentClient?.trueFirstName} ({selectedCells.length}/
              {partySize})
            </p>
          ) : (
            <p className="text-xs text-[#141414]/40 font-medium uppercase tracking-wider">
              Viewing mode — numbers are in-game minutes left at the table
            </p>
          )}
        </div>
        {/* Action buttons — right side, only in seating mode */}
        {isSeating && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={confirmSeating}
              disabled={!canConfirm}
              className={`
                px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all
                ${
                  canConfirm
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[2px_2px_0_0_#141414] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    : "bg-[#141414]/10 text-[#141414]/30 cursor-not-allowed"
                }
              `}
              id="confirm-seating-btn"
            >
              <Check className="w-3 h-3" />
              {isCropping ? "Crop & Seat" : "Confirm"}
            </button>
            <button
              onClick={refuseSeatedParty}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[#141414]/20 text-[#141414]/60 hover:bg-[#141414]/10 transition-colors flex items-center gap-1.5"
              id="refuse-party-btn"
            >
              <X className="w-3 h-3" />
              Refuse Party
            </button>
          </div>
        )}
      </div>

      {isOvertime && occupiedPartyIds.length > 0 && (
        <div className="flex flex-wrap gap-2 shrink-0 border-b border-amber-400/40 pb-3">
          <span className="text-xs font-bold uppercase tracking-wide text-amber-700 w-full">
            Last Call — rush a table
          </span>
          {occupiedPartyIds.map((partyId, index) => (
            <button
              key={partyId}
              onClick={() => lastCallTable(partyId)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-400 transition-colors"
            >
              {occupiedPartyIds.length === 1
                ? 'Rush table'
                : `Rush table ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Grid wrapper — flex-1 gives it all remaining height; hook measures it */}
      <div
        ref={wrapperRef}
        className="flex-1 min-h-0 flex items-center justify-center"
      >
        <div
          className={`
            grid gap-1 bg-[#141414]/10 p-1 rounded-xl border-2 border-[#141414]/20
            ${!isSeating ? "opacity-80 grayscale-[0.2]" : "ring-4 ring-emerald-500/20"}
          `}
          style={{
            width: gridSize || "100%",
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
          id="floorplan-grid"
        >
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const isAboutToFree =
                cell.state === CellState.OCCUPIED &&
                cell.mealDuration !== undefined &&
                cell.mealDuration <= TABLE_TURNING_SOON_THRESHOLD;
              const isBlocked = blockedCells.some(([r, c]) => r === y && c === x);
              return (
                <button
                  key={cell.id}
                  onClick={() => !isBlocked && handleCellClick(x, y)}
                  disabled={!isSeating || isBlocked}
                  className={`
                    aspect-square rounded-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5
                    ${isBlocked ? "bg-[#141414]/70 cursor-not-allowed opacity-60" : ""}
                    ${!isBlocked && cell.state === CellState.EMPTY ? "bg-white" : ""}
                    ${!isBlocked && cell.state === CellState.EMPTY && isSeating ? "hover:bg-emerald-100 cursor-pointer" : ""}
                    ${!isBlocked && cell.state === CellState.SELECTED ? "bg-emerald-500 shadow-inner scale-95" : ""}
                    ${!isBlocked && cell.state === CellState.OCCUPIED && !isAboutToFree ? "bg-[#141414] cursor-not-allowed" : ""}
                    ${!isBlocked && isAboutToFree ? "bg-amber-400 cursor-not-allowed" : ""}
                    ${!isSeating ? "cursor-default" : ""}
                  `}
                  id={`cell-${x}-${y}`}
                >
                  {cell.state === CellState.SELECTED && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                  {cell.state === CellState.OCCUPIED && (
                    <>
                      <Users
                        className={`w-3 h-3 shrink-0 ${isAboutToFree ? "text-amber-900" : "text-[#E4E3E0]/50"}`}
                      />
                      {cell.mealDuration !== undefined && (
                        <span
                          className={`text-[9px] font-mono font-bold leading-none tabular-nums ${isAboutToFree ? "text-stone-900" : "text-amber-400/90"}`}
                          title={`${cell.mealDuration} in-game minutes remaining`}
                        >
                          {cell.mealDuration}m
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
};
