import React, { useState, useRef, useEffect } from 'react';
import { Users, DoorClosed, DoorOpen } from 'lucide-react';
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

// Rendered absolutely above each character — floats without affecting layout height.
// key={text} gives a clean fade-out → fade-in on every new message.
const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, variant = 'default' }) => {
  const isStorm = variant === 'storm';
  const words = text?.split(' ') ?? [];
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          title={text}
          className={`relative rounded-lg px-2 py-1 text-[10px] max-w-[160px] leading-snug ${
            isStorm
              ? 'bg-red-50 border border-red-600 text-red-700 font-semibold shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]'
              : 'bg-white border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]'
          }`}
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07, duration: 0.05 }}
            >
              {word}{i < words.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
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
  const { gameState: { currentClient, queue }, callOutLie } = useGame();
  const isClientAtDesk = currentClient?.physicalState === PhysicalState.AT_DESK;
  const canSeat = isClientAtDesk; // used by the door/seat button

  const [isPartyHovered, setIsPartyHovered] = useState(false);

  const maitreDMessage = currentClient?.chatHistory.filter(m => m.sender === 'maitre-d').at(-1)?.text;
  const guestMessage = currentClient?.lastMessage || undefined;

  const [stormedOut, setStormedOut] = useState<{ message: string } | null>(null);
  const prevQueueRef = useRef<typeof queue>([]);
  const stormTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delayed guest message — shows after maitre-d speaks, like a real conversation
  const [displayedGuestMessage, setDisplayedGuestMessage] = useState<string | undefined>(undefined);
  const guestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Immediately clear when a new client arrives at the desk
  useEffect(() => {
    if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
    setDisplayedGuestMessage(undefined);
  }, [currentClient?.id]);

  // Reset hover state when a new client arrives
  useEffect(() => {
    setIsPartyHovered(false);
  }, [currentClient?.id]);

  // Delay the guest message by 900ms so maitre-d speaks first
  useEffect(() => {
    if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
    if (!guestMessage) return;
    guestTimerRef.current = setTimeout(() => setDisplayedGuestMessage(guestMessage), 900);
  }, [guestMessage]);

  useEffect(() => {
    return () => { if (guestTimerRef.current) clearTimeout(guestTimerRef.current); };
  }, []);

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
    <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-visible">
      {/* Seat party — door opens on hover when a party is at the desk */}
      <button
        type="button"
        onClick={canSeat ? onSeatParty : undefined}
        disabled={!canSeat}
        title={
          canSeat
            ? 'Seat party — choose tables on the floorplan'
            : 'No party at the desk to seat'
        }
        className={`group flex flex-col items-center gap-1 rounded-xl p-2 transition-all duration-150 ${
          canSeat
            ? 'cursor-pointer border-2 border-transparent hover:border-emerald-600 hover:bg-emerald-50 hover:shadow-[2px_2px_0px_0px_rgba(4,120,87,0.3)]'
            : 'cursor-default border-2 border-transparent opacity-40'
        }`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          {canSeat ? (
            <>
              <DoorClosed
                size={40}
                className="absolute text-[#141414] transition-opacity duration-150 group-hover:opacity-0"
                aria-hidden
              />
              <DoorOpen
                size={40}
                className="absolute text-emerald-700 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                aria-hidden
              />
            </>
          ) : (
            <DoorClosed size={40} className="text-stone-500" aria-hidden />
          )}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-center leading-tight max-w-[56px]">
          Seat Party
        </span>
      </button>

      {/* Maître D' */}
      <div className="relative flex flex-col items-center gap-1 min-w-[160px]">
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 w-max">
          <SpeechBubble text={maitreDMessage} />
        </div>
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
            className="relative flex flex-col items-center gap-1 min-w-[60px]"
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 w-max">
              <SpeechBubble text={displayedGuestMessage} />
            </div>
            {/* Party group — clickable for size accusation when client is at desk */}
            <motion.div
              className={`relative rounded-lg p-1 border-2 transition-colors ${
                !isClientAtDesk
                  ? 'pointer-events-none border-transparent'
                  : isPartyHovered
                    ? 'border-orange-400 bg-orange-50 cursor-pointer'
                    : 'border-transparent cursor-pointer'
              }`}
              whileHover={isClientAtDesk ? { y: -2 } : undefined}
              onMouseEnter={() => setIsPartyHovered(true)}
              onMouseLeave={() => setIsPartyHovered(false)}
              onClick={isClientAtDesk ? () => callOutLie('size') : undefined}
              style={isClientAtDesk && isPartyHovered ? { boxShadow: '2px 2px 0px 0px rgba(20,20,20,0.12)' } : undefined}
            >
              <AnimatePresence>
                {isPartyHovered && isClientAtDesk && (
                  <motion.div
                    key="party-badge"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="absolute top-0 -translate-y-full pb-1 left-1/2 -translate-x-1/2 z-10 inline-flex items-center justify-center whitespace-nowrap text-xs font-bold uppercase tracking-wide text-orange-700 bg-orange-100 border border-orange-400 rounded-full px-2.5 py-1.5 leading-none"
                  >
                    👆 Wrong Party Size
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex flex-wrap gap-1 max-w-[120px]">
                {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
                  <Users
                    key={i}
                    size={20}
                    className={isPartyHovered && isClientAtDesk ? 'text-orange-500' : 'text-[#141414]'}
                  />
                ))}
              </div>
            </motion.div>
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
        {queue.length === 0 && !stormedOut && (
          <span className="text-xs italic opacity-30">Queue is empty</span>
        )}
        {queue.map((c) => (
          <div key={c.id} className="flex flex-col items-center gap-0.5 shrink-0">
            <div
              className="h-1 rounded-full bg-emerald-500"
              style={{ width: Math.max(2, (c.patience / 100) * 20) }}
            />
            <Users size={16} className="opacity-60" />
          </div>
        ))}
      </div>

      {/* Stormed-out client — outside the scrollable queue so the bubble isn't clipped */}
      <AnimatePresence>
        {stormedOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative flex flex-col items-center gap-0.5 shrink-0 pb-1 mr-6"
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 w-max">
              <SpeechBubble text={stormedOut.message} variant="storm" />
            </div>
            <Users size={16} className="text-red-500 opacity-70" />
            <div className="w-1 h-0.5 rounded-full bg-red-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
