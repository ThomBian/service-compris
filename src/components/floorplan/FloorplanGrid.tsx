import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useGame } from "../../context/GameContext";
import { useToast } from "../../context/ToastContext";
import { CellState, PhysicalState } from "../../types";
import { canSelectCell } from "../../logic/gameLogic";
import { Check, X, Users } from "lucide-react";
import { GRID_SIZE, TABLE_TURNING_SOON_THRESHOLD } from "../../constants";
import { useContainerSize } from "../../hooks/useContainerSize";
import { getRule } from "../../logic/nightRules";

interface CandleGlowProps {
  mealDuration: number;
  isCritical: boolean;
}

const CandleGlow: React.FC<CandleGlowProps> = ({ mealDuration, isCritical }) => (
  <motion.div
    className="flex flex-col items-center gap-0.5"
    animate={{ opacity: [0.75, 1, 0.8, 0.95, 0.75], scale: [1, 1.06, 0.97, 1.03, 1] }}
    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
  >
    <div
      className="w-1 h-2.5 rounded-full"
      style={{
        background: isCritical
          ? 'linear-gradient(to top, #c41e1e, #ffaa44)'
          : 'linear-gradient(to top, #e8a020, #fff8e0)',
        boxShadow: isCritical
          ? '0 0 8px #ff5533, 0 0 16px rgba(255,60,30,0.3)'
          : '0 0 8px #ffcc44, 0 0 16px rgba(255,180,0,0.3)',
      }}
    />
    <span
      className="text-[7px] font-mono leading-none tabular-nums"
      style={{ color: isCritical ? '#c41e1e' : '#c9a227' }}
    >
      {mealDuration}m
    </span>
  </motion.div>
);

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

  const selectedCells = grid.flat().filter((c) => c.state === CellState.SELECTED);
  const partySize = currentClient?.truePartySize || 0;
  const isCropping = isSeating && selectedCells.length > 0 && selectedCells.length < partySize;
  const canConfirm = isSeating && selectedCells.length > 0;

  const [hoveredPartyId, setHoveredPartyId] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerSize(wrapperRef);
  const gridSize = Math.min(width, height);

  // Drag-to-select state
  const isDragging = useRef(false);
  const dragDirection = useRef<'select' | 'deselect'>('select');

  const handleGridPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Called on pointerdown on a cell — starts drag and performs first toggle
  const handleCellPointerDown = useCallback((x: number, y: number) => {
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
    if (cell.state === CellState.EMPTY && selectedCells.length >= partySize) return;
    dragDirection.current = cell.state === CellState.SELECTED ? 'deselect' : 'select';
    isDragging.current = true;
    toggleCellSelection(x, y);
  }, [isSeating, grid, selectedCells, partySize, toggleCellSelection, showToast]);

  // Called on pointerenter on a cell during drag — continues selection silently
  const handleCellPointerEnter = useCallback((x: number, y: number) => {
    if (!isDragging.current || !isSeating) return;
    const cell = grid[y][x];
    if (cell.state === CellState.OCCUPIED) return;
    const isBlocked = blockedCells.some(([r, c]) => r === y && c === x);
    if (isBlocked) return;
    if (dragDirection.current === 'select' && cell.state !== CellState.SELECTED) {
      if (selectedCells.length < partySize && canSelectCell(cell, selectedCells)) {
        toggleCellSelection(x, y);
      }
    } else if (dragDirection.current === 'deselect' && cell.state === CellState.SELECTED) {
      toggleCellSelection(x, y);
    }
  }, [isSeating, grid, selectedCells, blockedCells, toggleCellSelection]);

  const occupiedPartyIds = [...new Set<string>(
    gameState.grid.flat()
      .filter(c => c.state === CellState.OCCUPIED && c.partyId)
      .map(c => c.partyId!)
  )];

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
    <div className="flex flex-col bg-[#E4E3E0] h-full overflow-hidden" data-tour="floorplan">

      {/* 1. Title header — Art Deco style */}
      <div
        style={{
          background: 'linear-gradient(to bottom, rgba(26,8,8,0.95), rgba(18,8,4,0.92))',
          borderBottom: '2px solid #c9a227',
          position: 'relative',
        }}
        className="flex items-center px-5 py-3 shrink-0"
      >
        {/* Burgundy-gold accent stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(to right, #8b1a1a, #c9a227, #8b1a1a)',
        }} />
        {/* Floorplan icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-2.5 mt-px shrink-0">
          <rect x=".75" y=".75" width="12.5" height="12.5" rx="1" stroke="#c9a227" strokeWidth="1.2"/>
          <rect x="3" y="3" width="3" height="3" fill="#c9a227" opacity="0.7"/>
          <rect x="8" y="3" width="3" height="3" fill="#c9a227" opacity="0.7"/>
          <rect x="3" y="8" width="3" height="3" fill="#c9a227" opacity="0.7"/>
          <rect x="8" y="8" width="3" height="3" fill="#c9a227" opacity="0.3"/>
        </svg>
        <h2 style={{
          color: '#c9a227',
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontWeight: 'normal',
          margin: 0,
        }}>
          Floorplan
        </h2>
      </div>

      {/* 2. Party strip — seating mode only */}
      {isSeating && (
        <div className="flex items-center gap-3 px-6 py-3 bg-[#D6D5D2] border-b border-[#141414]/15 shrink-0">
          {/* Maitre D' silhouette */}
          <div className="w-8 h-11 bg-[#141414] rounded-t-full flex items-end justify-center text-white text-[8px] pb-1 shrink-0">
            MD
          </div>
          {/* Party member icons */}
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {Array.from({ length: partySize }).map((_, i) => (
                <Users
                  key={i}
                  size={16}
                  className={i < selectedCells.length ? 'text-emerald-600' : 'text-[#141414] opacity-30'}
                />
              ))}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {currentClient?.trueFirstName} ({selectedCells.length}/{partySize})
            </span>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2 ml-auto shrink-0">
            <button
              onClick={confirmSeating}
              disabled={!canConfirm}
              className={`
                px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all
                ${canConfirm
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
        </div>
      )}

      {/* 3. Rush row — overtime + not seating only */}
      {isOvertime && !isSeating && occupiedPartyIds.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center shrink-0 px-6 py-2 border-b border-amber-400/40 bg-amber-50/30">
          <span className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Last Call —
          </span>
          {occupiedPartyIds.map((partyId, index) => (
            <button
              key={partyId}
              onClick={() => lastCallTable(partyId)}
              onMouseEnter={() => setHoveredPartyId(partyId)}
              onMouseLeave={() => setHoveredPartyId(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-400 transition-colors"
            >
              {occupiedPartyIds.length === 1 ? 'Rush table' : `Rush table ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* 4. Grid — fills remaining height */}
      <div
        ref={wrapperRef}
        className="flex-1 min-h-0 flex items-center justify-center p-6"
      >
        <div
          className={`
            grid gap-1 bg-[#141414]/10 p-1 rounded-xl border-2 border-[#141414]/20
            ${!isSeating && !hoveredPartyId ? "opacity-80 grayscale-[0.2]" : ""}
            ${!isSeating && hoveredPartyId ? "opacity-100" : ""}
            ${isSeating ? "ring-4 ring-emerald-500/20" : ""}
          `}
          style={{
            width: gridSize || "100%",
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            touchAction: 'none',
          }}
          onPointerUp={handleGridPointerUp}
          onPointerLeave={handleGridPointerUp}
          onPointerCancel={handleGridPointerUp}
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
                  onPointerDown={(e) => {
                    e.preventDefault(); // prevent focus ring flicker on drag
                    !isBlocked && handleCellPointerDown(x, y);
                  }}
                  onPointerEnter={() => !isBlocked && handleCellPointerEnter(x, y)}
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
                    ${hoveredPartyId && cell.partyId === hoveredPartyId ? "ring-2 ring-amber-400 ring-inset brightness-125 scale-105" : ""}
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
