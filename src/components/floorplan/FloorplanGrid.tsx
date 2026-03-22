import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { CellState, PhysicalState } from '../../types';
import { Check, X, Users } from 'lucide-react';
import { GRID_SIZE } from '../../constants';
import { useContainerSize } from '../../hooks/useContainerSize';

export const FloorplanGrid: React.FC = () => {
  const {
    gameState,
    toggleCellSelection,
    confirmSeating,
    refuseSeatedParty
  } = useGame();

  const { grid, currentClient } = gameState;
  const isSeating = currentClient?.physicalState === PhysicalState.SEATING;

  const selectedCells = grid.flat().filter(c => c.state === CellState.SELECTED);
  const partySize = currentClient?.truePartySize || 0;
  const isCropping = isSeating && selectedCells.length > 0 && selectedCells.length < partySize;
  const canConfirm = isSeating && selectedCells.length > 0;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerSize(wrapperRef);
  const gridSize = Math.min(width, height);

  // Auto-confirm when party size is reached
  useEffect(() => {
    if (isSeating && selectedCells.length === partySize && partySize > 0) {
      const timer = setTimeout(() => {
        confirmSeating();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedCells.length, partySize, isSeating, confirmSeating]);

  return (
    <div className="flex flex-col gap-4 bg-stone-100 p-6 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-stone-200 pb-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Floorplan
          </h2>
          {isSeating ? (
            <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isCropping ? 'text-amber-500' : 'text-emerald-600 animate-pulse'}`}>
              {isCropping && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
              Seating: {currentClient?.trueFirstName} ({selectedCells.length}/{partySize})
            </p>
          ) : (
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">
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
                px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all border-b-2 active:border-b-0 active:translate-y-px
                ${canConfirm
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-800'
                  : 'bg-stone-200 text-stone-400 border-stone-300 cursor-not-allowed'}
              `}
              id="confirm-seating-btn"
            >
              <Check className="w-3 h-3" />
              {isCropping ? 'Crop & Seat' : 'Confirm'}
            </button>
            <button
              onClick={refuseSeatedParty}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-all flex items-center gap-1.5"
              id="refuse-party-btn"
            >
              <X className="w-3 h-3" />
              Refuse Party
            </button>
          </div>
        )}
      </div>

      {/* Grid wrapper — flex-1 gives it all remaining height; hook measures it */}
      <div ref={wrapperRef} className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className={`
            grid gap-1 bg-stone-300 p-1 rounded-lg border-2 border-stone-400
            ${!isSeating ? 'opacity-80 grayscale-[0.2]' : 'ring-4 ring-emerald-500/20'}
          `}
          style={{
            width: gridSize || '100%',
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
          id="floorplan-grid"
        >
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={cell.id}
                onClick={() => isSeating && toggleCellSelection(x, y)}
                disabled={!isSeating || cell.state === CellState.OCCUPIED}
                className={`
                  aspect-square rounded-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5
                  ${cell.state === CellState.EMPTY ? 'bg-white' : ''}
                  ${cell.state === CellState.EMPTY && isSeating ? 'hover:bg-emerald-100 cursor-pointer' : ''}
                  ${cell.state === CellState.SELECTED ? 'bg-emerald-500 shadow-inner scale-95' : ''}
                  ${cell.state === CellState.OCCUPIED ? 'bg-stone-800 cursor-not-allowed' : ''}
                  ${!isSeating ? 'cursor-default' : ''}
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
                    <Users className="w-3 h-3 text-stone-500 shrink-0" />
                    {cell.mealDuration !== undefined && (
                      <span
                        className="text-[9px] font-mono font-bold leading-none text-amber-400/90 tabular-nums"
                        title={`${cell.mealDuration} in-game minutes remaining`}
                      >
                        {cell.mealDuration}m
                      </span>
                    )}
                  </>
                )}
              </button>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
