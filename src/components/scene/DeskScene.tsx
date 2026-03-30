import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DoorOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../../context/GameContext";
import { PhysicalState } from "../../types";
import { seedTraits } from "../../logic/gameLogic";
import { PixelAvatar } from "./PixelAvatar";
import { PixelMaitreD } from "./PixelMaitreD";
import { StreetSceneBackground } from "./StreetSceneBackground";

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
  /** When true, keep a `data-tour="seat-party"` anchor visible even with no guest at desk (onboarding). */
  tourSeatPartySpotlight?: boolean;
}

export const DeskScene: React.FC<DeskSceneProps> = ({
  onSeatParty,
  tourSeatPartySpotlight = false,
}) => {
  const { t } = useTranslation("ui");
  const {
    gameState: { currentClient, queue },
    callOutLie,
  } = useGame();
  const isClientAtDesk = currentClient?.physicalState === PhysicalState.AT_DESK;
  const canSeat = isClientAtDesk;
  const showSeatPartyTourAnchor = canSeat || tourSeatPartySpotlight;

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
    <StreetSceneBackground>
      <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] overflow-visible" data-tour="queue">
      {/* Maitre d' column — stacked: button → fixed speech zone → avatar */}
      <div className="flex flex-col items-center w-[160px] shrink-0">
        {/* Seat Party button — sits just above the speech bubble zone */}
        <style>{`
          @keyframes seatBorderSpin { to { transform: rotate(1turn); } }
        `}</style>
        <AnimatePresence>
          {showSeatPartyTourAnchor && (
            <motion.div
              key="seat-party-anchor"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={canSeat ? { scale: 1.06 } : undefined}
              transition={{ duration: 0.2 }}
              className={
                canSeat
                  ? "relative group mb-1 rounded-[14px] p-[2px]"
                  : "relative mb-1 flex justify-center"
              }
              style={canSeat ? { background: "#8b3a0a" } : undefined}
              data-tour="seat-party"
            >
              {canSeat ? (
                <>
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[14px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <div
                      style={{
                        position: "absolute",
                        inset: "-100%",
                        background:
                          "conic-gradient(#f0c040 0deg, #f0c040 90deg, #8b3a0a 120deg, #8b3a0a 360deg)",
                        animation: "seatBorderSpin 0.6s linear infinite",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onSeatParty}
                    title="Seat party — choose tables on the floorplan"
                    className="relative z-10 flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors active:translate-x-[1px] active:translate-y-[1px]"
                    style={{ background: "#1a0800" }}
                  >
                    <DoorOpen size={22} className="text-[#f0c040]" />
                    <span className="text-center text-[8px] font-black uppercase leading-tight tracking-widest text-[#f0c040]">
                      {t("scene.seatPartyBtn")}
                    </span>
                  </button>
                </>
              ) : (
                <div
                  className="box-border flex min-h-[4.5rem] min-w-[5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#141414]/20 px-3 py-2"
                  aria-hidden
                >
                  <DoorOpen size={22} className="text-[#141414]/30" />
                  <span className="text-center text-[8px] font-black uppercase leading-tight tracking-widest text-[#141414]/35">
                    {t("scene.seatPartyBtn")}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed-height speech bubble zone — always reserves space so button never shifts */}
        <div className="h-14 flex items-end justify-center w-full mb-3">
          <SpeechBubble text={maitreDMessage} />
        </div>

        {/* Maitre D' avatar */}
        <PixelMaitreD
          animState={maitreDAnimState}
          onAnimationComplete={() => setMaitreDAnimState(null)}
          scale={3}
        />
      </div>

      {/* Current party at desk — fixed width slot so queue never shifts */}
      <div className="relative flex flex-col items-end min-w-[80px]">
      <AnimatePresence mode="wait">
        {currentClient ? (
          <motion.div
            key={currentClient.id}
            className="relative flex flex-col items-center gap-1"
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
              <div className="flex items-end">
                {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
                  <div key={i} className={i > 0 ? "-ml-4" : ""}>
                    <PixelAvatar
                      traits={i === 0 ? currentClient.visualTraits : seedTraits(currentClient.id, i)}
                      animState={i === 0 ? guestAnimState : null}
                      onAnimationComplete={i === 0 ? () => setGuestAnimState(null) : undefined}
                      scale={3}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
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
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Queue */}
      <div className="flex items-end gap-2 flex-1 overflow-x-auto pb-1">
        {queue.map((c) => (
          <div
            key={c.id}
            className="flex flex-col items-center gap-0.5 shrink-0 opacity-70"
          >
            <div
              className="h-1 rounded-full bg-emerald-400"
              style={{ width: Math.max(2, (c.patience / 100) * 20) }}
            />
            <PixelAvatar traits={c.visualTraits} scale={1.5} />
            {/* Spacer matching desk-character label height so items-end aligns avatar feet */}
            <span className="invisible text-[9px] font-bold uppercase tracking-widest leading-none">x</span>
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
              <PixelAvatar traits={seedTraits("storm", 0)} scale={1.5} />
            </div>
            <div className="w-1 h-0.5 rounded-full bg-red-400" />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </StreetSceneBackground>
  );
};
