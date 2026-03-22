import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { CellState } from '../../types';
import { GRID_SIZE } from '../../constants';

export const MiniGrid: React.FC = () => {
  const { gameState: { grid } } = useGame();

  return (
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 self-start overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <LayoutGrid size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Floorplan</span>
      </div>
      <div
        className="grid gap-0.5 bg-stone-300 p-0.5 rounded border border-stone-400"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const isOccupied = cell.state === CellState.OCCUPIED;
            return (
              <div
                key={`mini-${x}-${y}`}
                className={`rounded-sm ${isOccupied ? 'bg-stone-800' : 'bg-white'}`}
                style={{ width: 14, height: 14 }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
