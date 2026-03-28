import React from 'react';
import { Users } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { CellState } from '../../types';

export const FloorplanScene: React.FC = () => {
  const { gameState: { currentClient, grid } } = useGame();

  const selectedCount = grid.flat().filter(c => c.state === CellState.SELECTED).length;
  const occupiedCount = grid.flat().filter(c => c.state === CellState.OCCUPIED).length;
  const partySize = currentClient?.truePartySize ?? 0;

  return (
    <div className="h-full flex items-end gap-8 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-hidden">
      {/* Maitre d' */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-end justify-center text-white text-xs pb-1">
          MD
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Maitre D'</span>
      </div>

      {/* Current party being seated — members highlight as placed */}
      {currentClient && (
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex gap-1">
            {Array.from({ length: partySize }).map((_, i) => (
              <Users
                key={i}
                size={20}
                className={i < selectedCount ? 'text-emerald-600' : 'text-[#141414] opacity-30'}
              />
            ))}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">
            {currentClient.trueFirstName} ({selectedCount}/{partySize})
          </span>
        </div>
      )}

      {/* Seated guests indicator */}
      <div className="flex flex-col items-center gap-1 flex-1">
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: occupiedCount }).map((_, i) => (
            <Users key={i} size={14} className="text-stone-400" />
          ))}
        </div>
        {occupiedCount > 0 && (
          <span className="text-[9px] opacity-50 uppercase tracking-widest">{occupiedCount} seated</span>
        )}
      </div>
    </div>
  );
};
