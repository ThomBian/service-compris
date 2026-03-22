import React from 'react';
import { Users, DoorOpen, DoorClosed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { PhysicalState } from '../../types';

interface SpeechBubbleProps {
  text: string | undefined;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text }) => (
  <AnimatePresence>
    {text && (
      <motion.div
        key={text}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="relative bg-white border border-[#141414] rounded-lg px-2 py-1 text-[10px] max-w-[160px] truncate shadow-[2px_2px_0px_0px_rgba(20,20,20,1)] mb-1"
      >
        {text}
        <span
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '6px solid #141414',
          }}
        />
      </motion.div>
    )}
  </AnimatePresence>
);

interface DeskSceneProps {
  onSeatParty: () => void;
}

export const DeskScene: React.FC<DeskSceneProps> = ({ onSeatParty }) => {
  const { gameState: { currentClient, queue } } = useGame();
  const canSeat = currentClient?.physicalState === PhysicalState.AT_DESK;

  const maitreDMessage = currentClient?.chatHistory.filter(m => m.sender === 'maitre-d').at(-1)?.text;
  const guestMessage = currentClient?.lastMessage || undefined;

  return (
    <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-x-hidden">
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
        <SpeechBubble text={maitreDMessage} />
        <div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-center justify-center text-white">
          <span className="text-base leading-none">◆</span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Maître D'</span>
      </div>

      {/* Current party at desk */}
      <AnimatePresence mode="wait">
        {currentClient ? (
          <motion.div
            key={currentClient.id}
            className="flex flex-col items-center gap-1 min-w-[60px]"
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <SpeechBubble text={guestMessage} />
            <div className="flex flex-wrap gap-1 max-w-[120px]">
              {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
                <Users key={i} size={20} className="text-[#141414]" />
              ))}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {currentClient.knownFirstName || '???'}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="flex flex-col items-center gap-1 min-w-[60px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="opacity-20 text-[10px] uppercase tracking-widest">— empty —</div>
          </motion.div>
        )}
      </AnimatePresence>

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
