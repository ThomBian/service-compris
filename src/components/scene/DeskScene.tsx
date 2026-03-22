import React from 'react';
import { Users, DoorOpen, DoorClosed } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { PhysicalState } from '../../types';

interface DeskSceneProps {
  onSeatParty: () => void;
}

export const DeskScene: React.FC<DeskSceneProps> = ({ onSeatParty }) => {
  const { gameState: { currentClient, queue } } = useGame();
  const canSeat = currentClient?.physicalState === PhysicalState.AT_DESK;

  return (
    <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-hidden">
      {/* Door */}
      <button
        onClick={canSeat ? onSeatParty : undefined}
        disabled={!canSeat}
        title={canSeat ? 'Seat this party' : 'No party to seat'}
        className={`flex flex-col items-center gap-1 transition-all ${
          canSeat
            ? 'cursor-pointer opacity-100 hover:scale-105'
            : 'cursor-default opacity-40'
        }`}
      >
        {canSeat ? <DoorOpen size={40} /> : <DoorClosed size={40} />}
        <span className="text-[9px] font-bold uppercase tracking-widest">Door</span>
      </button>

      {/* Maître D' */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-end justify-center text-white text-xs pb-1">
          MD
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Maître D'</span>
      </div>

      {/* Current party at desk */}
      <div className="flex flex-col items-center gap-1 min-w-[60px]">
        {currentClient ? (
          <>
            <div className="flex gap-1">
              {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
                <Users key={i} size={20} className="text-[#141414]" />
              ))}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {currentClient.knownFirstName || '???'}
            </span>
          </>
        ) : (
          <div className="opacity-20 text-[10px] uppercase tracking-widest">— empty —</div>
        )}
      </div>

      {/* Queue */}
      <div className="flex items-end gap-2 flex-1 overflow-x-auto pb-1">
        {queue.length === 0 ? (
          <span className="text-xs italic opacity-30">Queue is empty</span>
        ) : (
          queue.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-0.5 shrink-0">
              <Users size={16} className="opacity-60" />
              <div
                className="w-1 rounded-full bg-emerald-500"
                style={{ height: Math.max(2, (c.patience / 100) * 20) }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
