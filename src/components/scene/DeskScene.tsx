import React, { useState, useRef, useEffect } from 'react';
import { Users, DoorOpen, DoorClosed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { PhysicalState } from '../../types';

const STORM_OUT_LINES = [
  "This is outrageous!",
  "I'm never coming back!",
  "What a disgrace!",
  "Absolutely unacceptable!",
  "You'll be hearing from my lawyer!",
];

interface SpeechBubbleProps {
  text: string | undefined;
  variant?: 'default' | 'storm';
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, variant = 'default' }) => {
  const isStorm = variant === 'storm';
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          title={text}
          className={`relative rounded-lg px-2 py-1 text-[10px] max-w-[160px] whitespace-normal break-words leading-snug mb-1 ${
            isStorm
              ? 'bg-red-50 border border-red-600 text-red-700 font-semibold shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]'
              : 'bg-white border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]'
          }`}
        >
          {text}
          <span
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: isStorm ? '6px solid #dc2626' : '6px solid #141414',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface DeskSceneProps {
  onSeatParty: () => void;
}

export const DeskScene: React.FC<DeskSceneProps> = ({ onSeatParty }) => {
  const { gameState: { currentClient, queue } } = useGame();
  const canSeat = currentClient?.physicalState === PhysicalState.AT_DESK;

  const maitreDMessage = currentClient?.chatHistory.filter(m => m.sender === 'maitre-d').at(-1)?.text;
  const guestMessage = currentClient?.lastMessage || undefined;

  const [stormedOut, setStormedOut] = useState<{ message: string } | null>(null);
  const prevQueueRef = useRef<typeof queue>([]);
  const stormTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevQueueRef.current;
    const currentIds = new Set(queue.map(c => c.id));

    for (const client of prev) {
      if (!currentIds.has(client.id) && client.patience <= 1 && currentClient?.id !== client.id) {
        if (stormTimerRef.current) clearTimeout(stormTimerRef.current);
        const message = STORM_OUT_LINES[Math.floor(Math.random() * STORM_OUT_LINES.length)];
        setStormedOut({ message });
        stormTimerRef.current = setTimeout(() => setStormedOut(null), 2000);
        break;
      }
    }

    prevQueueRef.current = queue;
    // No cleanup return here — returning a cleanup would cancel the timer
    // on every queue tick. The unmount cleanup is in a separate effect (Step 5).
  }, [queue, currentClient]);

  useEffect(() => {
    return () => {
      if (stormTimerRef.current) clearTimeout(stormTimerRef.current);
    };
  }, []); // empty deps — runs cleanup only on unmount

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
        <svg width="48" height="72" viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <circle cx="24" cy="12" r="10" fill="#141414"/>
          {/* Neck */}
          <rect x="21" y="21" width="6" height="5" fill="#141414"/>
          {/* Bow tie */}
          <polygon points="18,26 24,29 18,32" fill="#555"/>
          <polygon points="30,26 24,29 30,32" fill="#555"/>
          <circle cx="24" cy="29" r="1.5" fill="#333"/>
          {/* Suit body */}
          <rect x="14" y="26" width="20" height="26" rx="3" fill="#141414"/>
          {/* White shirt front */}
          <rect x="21" y="28" width="6" height="20" rx="1" fill="white"/>
          {/* Arms */}
          <line x1="14" y1="30" x2="6" y2="48" stroke="#141414" strokeWidth="5" strokeLinecap="round"/>
          <line x1="34" y1="30" x2="42" y2="48" stroke="#141414" strokeWidth="5" strokeLinecap="round"/>
          {/* Legs */}
          <line x1="19" y1="52" x2="14" y2="70" stroke="#141414" strokeWidth="5" strokeLinecap="round"/>
          <line x1="29" y1="52" x2="34" y2="70" stroke="#141414" strokeWidth="5" strokeLinecap="round"/>
        </svg>
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
      <div className="flex flex-col flex-1 overflow-x-hidden pb-1 gap-1">
        <SpeechBubble text={stormedOut?.message} variant="storm" />
        <div className="flex items-end gap-2 overflow-x-auto">
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
    </div>
  );
};
