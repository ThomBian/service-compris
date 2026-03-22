import React from 'react';
import { useGame } from '../../context/GameContext';
import { CellState } from '../../types';
import { GRID_SIZE } from '../../constants';

export const MiniGrid: React.FC = () => {
  const { gameState: { grid } } = useGame();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Floorplan</span>
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
