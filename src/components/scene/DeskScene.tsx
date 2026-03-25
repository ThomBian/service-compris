import React, { useState, useRef, useEffect } from "react";
import { DoorClosed, DoorOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../../context/GameContext";
import { PhysicalState } from "../../types";
import { seedTraits } from "../../logic/gameLogic";
import { ClientAvatar } from "./ClientAvatar";
import { MaitreDAvatar } from "./MaitreDAvatar";

const STORM_OUT_LINES = [
  "This is outrageous!",
  "I'm never coming back!",
  "What a disgrace!",
  "Absolutely unacceptable!",
  "You'll be hearing from my lawyer!",
];

interface SpeechBubbleProps {
  text: string | undefined;
  variant?: "default" | "storm";
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  variant = "default",
}) => {
  const isStorm = variant === "storm";
  const words = text?.split(" ") ?? [];
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
              ? "bg-red-50 border border-red-600 text-red-700 font-semibold shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]"
              : "bg-white border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]"
          }`}
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07, duration: 0.05 }}
            >
              {word}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          ))}
          <span
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: isStorm ? "6px solid #dc2626" : "6px solid #141414",
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
  const {
    gameState: { currentClient, queue },
    callOutLie,
  } = useGame();
  const isClientAtDesk = currentClient?.physicalState === PhysicalState.AT_DESK;
  const canSeat = isClientAtDesk;

  const [isPartyHovered, setIsPartyHovered] = useState(false);
  const [maitreDAnimState, setMaitreDAnimState] = useState<
    "bow" | "stop" | "shrug" | null
  >(null);
  const [guestAnimState, setGuestAnimState] = useState<
    "entrance" | "accused" | "refused" | null
  >(null);

  const maitreDMessage = currentClient?.chatHistory
    .filter((m) => m.sender === "maitre-d")
    .at(-1)?.text;
  const guestMessage = currentClient?.lastMessage || undefined;

  const [stormedOut, setStormedOut] = useState<{ message: string } | null>(
    null,
  );
  const prevQueueRef = useRef<typeof queue>([]);
  const stormTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [displayedGuestMessage, setDisplayedGuestMessage] = useState<
    string | undefined
  >(undefined);
  const guestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
    setDisplayedGuestMessage(undefined);
  }, [currentClient?.id]);

  useEffect(() => {
    setIsPartyHovered(false);
  }, [currentClient?.id]);

  useEffect(() => {
    if (currentClient?.id) {
      setGuestAnimState("entrance");
    }
  }, [currentClient?.id]);

  useEffect(() => {
    if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
    if (!guestMessage) return;
    guestTimerRef.current = setTimeout(
      () => setDisplayedGuestMessage(guestMessage),
      900,
    );
  }, [guestMessage]);

  useEffect(() => {
    return () => {
      if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentClient?.isCaught) {
      setGuestAnimState("accused");
      setMaitreDAnimState("bow");
    }
  }, [currentClient?.isCaught]);

  useEffect(() => {
    if (currentClient?.physicalState === PhysicalState.REFUSED) {
      setGuestAnimState("refused");
      setMaitreDAnimState("stop");
    } else if (currentClient?.physicalState === PhysicalState.SEATING) {
      setMaitreDAnimState("bow");
    }
  }, [currentClient?.physicalState]);

  useEffect(() => {
    const prev = prevQueueRef.current;
    const currentIds = new Set(queue.map((c) => c.id));
    for (const client of prev) {
      if (
        !currentIds.has(client.id) &&
        client.patience <= 1 &&
        currentClient?.id !== client.id
      ) {
        if (stormTimerRef.current) clearTimeout(stormTimerRef.current);
        const message =
          STORM_OUT_LINES[Math.floor(Math.random() * STORM_OUT_LINES.length)];
        setStormedOut({ message });
        stormTimerRef.current = setTimeout(() => setStormedOut(null), 2000);
        break;
      }
    }
    prevQueueRef.current = queue;
  }, [queue, currentClient]);

  useEffect(() => {
    return () => {
      if (stormTimerRef.current) clearTimeout(stormTimerRef.current);
    };
  }, []);

  const handleSizeAccusation = () => {
    setMaitreDAnimState("shrug");
    callOutLie("size");
  };

  return (
    <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-visible">
      {/* Seat party — door opens on hover when a party is at the desk */}
      <button
        type="button"
        onClick={canSeat ? onSeatParty : undefined}
        disabled={!canSeat}
        title={
          canSeat
            ? "Seat party — choose tables on the floorplan"
            : "No party at the desk to seat"
        }
        className={`group flex flex-col items-center gap-1 rounded-xl p-2 transition-all duration-150 ${
          canSeat
            ? "cursor-pointer border-2 border-transparent hover:border-emerald-600 hover:bg-emerald-50 hover:shadow-[2px_2px_0px_0px_rgba(4,120,87,0.3)]"
            : "cursor-default border-2 border-transparent opacity-40"
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
        <MaitreDAvatar
          animState={maitreDAnimState}
          onAnimationComplete={() => setMaitreDAnimState(null)}
        />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
          Maître D'
        </span>
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
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 w-max">
              <SpeechBubble text={displayedGuestMessage} />
            </div>
            {/* Party group — clickable for size accusation when client is at desk */}
            <motion.div
              className={`relative rounded-lg p-1 border-2 transition-colors ${
                !isClientAtDesk
                  ? "pointer-events-none border-transparent"
                  : isPartyHovered
                    ? "border-orange-400 bg-orange-50 cursor-pointer"
                    : "border-transparent cursor-pointer"
              }`}
              whileHover={isClientAtDesk ? { y: -2 } : undefined}
              onMouseEnter={() => setIsPartyHovered(true)}
              onMouseLeave={() => setIsPartyHovered(false)}
              onClick={isClientAtDesk ? handleSizeAccusation : undefined}
              style={
                isClientAtDesk && isPartyHovered
                  ? { boxShadow: "2px 2px 0px 0px rgba(20,20,20,0.12)" }
                  : undefined
              }
            >
              <AnimatePresence>
                {isPartyHovered && isClientAtDesk && (
                  <motion.div
                    key="party-badge"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="absolute top-0 -translate-y-full pb-1 left-1/2 -translate-x-1/2 z-10 inline-flex items-center justify-center whitespace-nowrap text-xs font-bold uppercase tracking-wide text-orange-700 bg-orange-100 border border-orange-400 rounded-full px-2.5 py-1.5 leading-none"
                  >
                    👆 Wrong Party Size
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex gap-1 items-end">
                {Array.from({ length: currentClient.truePartySize }).map(
                  (_, i) => (
                    <ClientAvatar
                      key={i}
                      traits={
                        i === 0
                          ? currentClient.visualTraits
                          : seedTraits(currentClient.id, i)
                      }
                      animState={i === 0 ? guestAnimState : null}
                      onAnimationComplete={
                        i === 0 ? () => setGuestAnimState(null) : undefined
                      }
                    />
                  ),
                )}
              </div>
            </motion.div>
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {currentClient.knownFirstName || "???"}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="flex flex-col items-center gap-2 opacity-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
          >
            <AnimatePresence>
              {stormedOut && (
                <motion.div
                  key="storm"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 w-max"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <SpeechBubble text={stormedOut.message} variant="storm" />
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-[9px] font-bold uppercase tracking-widest mt-8">
              No guests
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue */}
      <div className="flex items-end gap-2 flex-1 overflow-x-auto pb-1">
        {queue.length === 0 && !stormedOut && (
          <span className="text-xs italic opacity-30">Queue is empty</span>
        )}
        {queue.map((c) => (
          <div
            key={c.id}
            className="flex flex-col items-center gap-0.5 shrink-0 opacity-40 grayscale"
          >
            <div
              className="h-1 rounded-full bg-emerald-500"
              style={{ width: Math.max(2, (c.patience / 100) * 20) }}
            />
            <ClientAvatar
              traits={{
                skinTone: 2,
                hairStyle: 0,
                hairColor: 0,
                clothingStyle: 0,
                clothingColor: 2,
                height: 0,
              }}
            />
          </div>
        ))}
      </div>

      {/* Stormed-out client */}
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
            <div className="opacity-70 grayscale">
              <ClientAvatar traits={seedTraits("storm", 0)} />
            </div>
            <div className="w-1 h-0.5 rounded-full bg-red-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
