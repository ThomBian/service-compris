import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import type {
  LedgerData,
  CorkboardVariant,
  CampaignPath,
} from "../types/campaign";
import { campaignNightsKeySegment } from "../i18n/campaignNightKey";

interface CorkboardScreenProps {
  variant: CorkboardVariant;
  nightNumber: number;
  activePath: CampaignPath;
  ledger: LedgerData;
  firedReason?: "MORALE" | "VIP" | "BANNED";
  onOpenRestaurant: () => void;
  onLeave: () => void;
}

function DocPin() {
  return (
    <div
      style={{
        position: "absolute",
        top: -8,
        left: "50%",
        transform: "translateX(-50%)",
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: "#141414",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        zIndex: 2,
      }}
    />
  );
}

function LedgerPaper({
  ledger,
  stamp,
  animationStep,
}: {
  ledger: LedgerData;
  stamp?: string;
  animationStep: number;
}) {
  const { t } = useTranslation("campaign");
  const rows = [
    {
      label: t("corkboard.ledger.revenue"),
      value: `€${Math.round(ledger.shiftRevenue)}`,
      type: "income" as const,
    },
    {
      label: t("corkboard.ledger.coversSeated"),
      value: String(ledger.coversSeated),
      type: "info" as const,
    },
    { label: null, value: null, type: "divider" as const },
    {
      label: t("corkboard.ledger.salaries"),
      value: `-€${ledger.salaryCost}`,
      type: "expense" as const,
    },
    {
      label: t("corkboard.ledger.electricity"),
      value: `-€${ledger.electricityCost}`,
      type: "expense" as const,
    },
    {
      label: t("corkboard.ledger.foodWithCovers", {
        count: ledger.coversSeated,
      }),
      value: `-€${Math.round(ledger.foodCost)}`,
      type: "expense" as const,
    },
    { label: null, value: null, type: "divider" as const },
    {
      label: t("corkboard.ledger.netProfit"),
      value: `€${Math.round(ledger.netProfit)}`,
      type: "total" as const,
    },
    {
      label: t("corkboard.ledger.cashOnHand"),
      value: `€${Math.round(ledger.cash)}`,
      type: "total" as const,
    },
    {
      label: t("corkboard.ledger.ratingLabel"),
      value: t("corkboard.ledger.ratingStars", {
        value: ledger.rating.toFixed(1),
      }),
      type: "info" as const,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: -1.5 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      style={{ position: "relative", flexShrink: 0 }}
    >
      <DocPin />
      <div className="w-72 bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
        <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
            {t("corkboard.ledger.venueName")}
          </p>
          <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">
            {t("corkboard.ledger.shiftReport")}
          </p>
        </div>

        <div className="p-4 relative font-sans" style={{ minHeight: 200 }}>
          {stamp && (
            <div
              style={{
                position: "absolute",
                top: "45%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-12deg)",
                border: "3px solid rgba(180,30,30,0.7)",
                color: "rgba(180,30,30,0.7)",
                padding: "4px 14px",
                fontSize: "1.2rem",
                fontWeight: 900,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                zIndex: 3,
                pointerEvents: "none",
              }}
            >
              {stamp}
            </div>
          )}

          {rows.map((row, i) => {
            if (i >= animationStep) return null;
            if (row.type === "divider") {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="border-t border-dashed border-[#141414]/20 my-2"
                />
              );
            }
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
                className="flex justify-between items-baseline py-1"
              >
                <span className="text-[11px] text-[#141414]/50 uppercase tracking-wide">
                  {row.label}
                </span>
                <span
                  className={`text-sm font-mono ${
                    row.type === "total"
                      ? "font-black text-[#141414]"
                      : row.type === "expense"
                        ? "text-[#141414]/70"
                        : "text-[#141414]"
                  }`}
                >
                  {row.value}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function NewspaperPaper({
  headline,
  deck,
  bodyLeft,
  bodyRight,
  visible,
}: {
  headline: string;
  deck: string;
  bodyLeft: string;
  bodyRight: string;
  visible: boolean;
}) {
  const { t } = useTranslation("campaign");
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 1 }}
          animate={{ opacity: 1, y: 0, rotate: 0.5 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          style={{ position: "relative", flexShrink: 0 }}
        >
          <DocPin />
          <div className="w-96 bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
            <div className="border-b-2 border-[#141414] px-5 py-3 text-center">
              <p
                className="text-2xl font-black uppercase tracking-[0.1em] text-[#141414]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {t("corkboard.newspaper.masthead")}
              </p>
              <div className="flex justify-between mt-1.5 border-t border-[#141414]/20 pt-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">
                  {t("corkboard.newspaper.eveningEdition")}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">
                  {t("corkboard.newspaper.free")}
                </span>
              </div>
            </div>

            <div className="px-5 pt-4 pb-0">
              <p
                className="text-base font-black uppercase leading-tight tracking-[0.02em] text-[#141414]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {headline}
              </p>
              {deck && (
                <p className="text-xs text-[#141414]/60 italic mt-2 pt-2 border-t border-[#141414]/15 leading-relaxed">
                  {deck}
                </p>
              )}
            </div>

            {(bodyLeft || bodyRight) && (
              <div className="grid grid-cols-2 px-5 pt-3 pb-5 mt-3 border-t border-[#141414]/15 gap-0">
                <div className="text-[10px] leading-relaxed text-[#141414]/70 pr-3 border-r border-[#141414]/15">
                  {bodyLeft}
                </div>
                <div className="text-[10px] leading-relaxed text-[#141414]/70 pl-3">
                  {bodyRight}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LetterPaper({
  nightSegment,
  isLoss,
  firedReason,
  visible,
}: {
  nightSegment: string;
  isLoss: boolean;
  firedReason: "MORALE" | "VIP" | "BANNED";
  visible: boolean;
}) {
  const { t } = useTranslation("campaign");
  const nk = `nights.${nightSegment}`;
  const quote = t(`${nk}.quote`);
  const showQuote = quote.trim() !== "..." && quote.trim() !== "…";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 1.2 }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
          style={{ position: "relative", flexShrink: 0 }}
        >
          <DocPin />
          <div className="w-80 bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
            <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
                {t("corkboard.letter.venueName")}
              </p>
              <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">
                {t("corkboard.letter.internalMemo")}
              </p>
            </div>

            <div className="p-5 font-sans">
              {isLoss ? (
                <>
                  <p className="text-xs text-[#141414]/50 mb-3">
                    {t(`fired.${firedReason}.letterSalutation`)}
                  </p>
                  <p className="text-sm text-[#141414]/80 leading-relaxed whitespace-pre-line mb-4">
                    {t(`fired.${firedReason}.letterBody`)}
                  </p>
                  <blockquote className="border-l-2 border-[#141414] pl-3 mb-4 text-sm italic text-[#141414]/60 leading-relaxed">
                    &ldquo;{t(`fired.${firedReason}.letterQuote`)}&rdquo;
                  </blockquote>
                  <p className="text-xs text-[#141414]/50">
                    {t(`fired.${firedReason}.letterSignOff`)}
                  </p>
                  <p className="text-sm font-black uppercase tracking-[0.1em] mt-1">
                    {t("corkboard.letter.signOffName")}
                  </p>
                  <p className="text-[10px] text-[#141414]/40 italic mt-3 pt-3 border-t border-[#141414]/10">
                    {t("corkboard.letter.psLine", {
                      text: t(`fired.${firedReason}.letterPS`),
                    })}
                  </p>
                </>
              ) : (
                <>
                  {showQuote && (
                    <blockquote className="border-l-2 border-[#141414] pl-3 mb-4 text-sm italic text-[#141414]/60 leading-relaxed">
                      &ldquo;{quote}&rdquo;
                    </blockquote>
                  )}
                  <p className="text-sm text-[#141414]/80 leading-relaxed">
                    {(() => {
                      const m = t(`${nk}.memo`);
                      return m === "..." || m === "…"
                        ? t("corkboard.letter.memoFallback")
                        : m;
                    })()}
                  </p>
                  <p className="text-xs text-[#141414]/40 mt-4 pt-3 border-t border-[#141414]/10 font-black uppercase tracking-[0.1em]">
                    {t("corkboard.letter.signatureV")}
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ActivityLogPaper({
  logs,
  visible,
}: {
  logs: string[];
  visible: boolean;
}) {
  const { t } = useTranslation("campaign");
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
          style={{ position: "relative", flexShrink: 0 }}
        >
          <DocPin />
          <div className="w-64 bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
            <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
                {t("corkboard.log.venueName")}
              </p>
              <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">
                {t("corkboard.log.title")}
              </p>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto font-sans">
              {logs.length === 0 ? (
                <p className="text-xs text-[#141414]/40 italic p-1">
                  {t("corkboard.log.empty")}
                </p>
              ) : (
                logs.map((entry, i) => (
                  <div
                    key={i}
                    className={`text-[11px] border-b border-[#141414]/10 py-1.5 leading-snug ${
                      i === 0
                        ? "text-[#141414] font-semibold"
                        : "text-[#141414]/60"
                    }`}
                  >
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const LEDGER_ROWS = 10;
const MS_PER_ROW = 120;
const NEWSPAPER_DELAY_MS = LEDGER_ROWS * MS_PER_ROW + 300;
const LETTER_DELAY_MS = NEWSPAPER_DELAY_MS + 700;
const LOG_DELAY_MS = LETTER_DELAY_MS + 500;
const CTA_DELAY_MS = LOG_DELAY_MS + 400;

export function CorkboardScreen({
  variant,
  nightNumber,
  activePath,
  ledger,
  firedReason,
  onOpenRestaurant,
  onLeave,
}: CorkboardScreenProps) {
  const { t } = useTranslation("campaign");
  const isLoss = variant === "fired";
  const lossReason = firedReason ?? "MORALE";
  const nightSegment = campaignNightsKeySegment(nightNumber, activePath);
  const nk = `nights.${nightSegment}`;

  const [ledgerStep, setLedgerStep] = React.useState(0);
  const [showNewspaper, setShowNewspaper] = React.useState(false);
  const [showLetter, setShowLetter] = React.useState(false);
  const [showLog, setShowLog] = React.useState(false);
  const [ctaReady, setCtaReady] = React.useState(false);

  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= LEDGER_ROWS; i++) {
      timers.push(setTimeout(() => setLedgerStep(i), i * MS_PER_ROW));
    }
    timers.push(setTimeout(() => setShowNewspaper(true), NEWSPAPER_DELAY_MS));
    timers.push(setTimeout(() => setShowLetter(true), LETTER_DELAY_MS));
    timers.push(setTimeout(() => setShowLog(true), LOG_DELAY_MS));
    timers.push(setTimeout(() => setCtaReady(true), CTA_DELAY_MS));
    return () => timers.forEach(clearTimeout);
  }, []);

  const boardRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ active: false, startX: 0, scrollLeft: 0 });
  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = {
      active: true,
      startX: e.pageX - (boardRef.current?.offsetLeft ?? 0),
      scrollLeft: boardRef.current?.scrollLeft ?? 0,
    };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.active || !boardRef.current) return;
    e.preventDefault();
    boardRef.current.scrollLeft =
      drag.current.scrollLeft -
      (e.pageX - boardRef.current.offsetLeft - drag.current.startX) * 1.2;
  };
  const stopDrag = () => {
    drag.current.active = false;
  };

  const headline = isLoss
    ? t(`fired.${lossReason}.newspaperHeadline`)
    : t(`${nk}.newspaper`);
  const deck = isLoss
    ? t(`fired.${lossReason}.newspaperDeck`)
    : t(`${nk}.newspaperDeck`);
  const bodyLeft = isLoss
    ? t(`fired.${lossReason}.newspaperBodyLeft`)
    : t(`${nk}.newspaperBodyLeft`);
  const bodyRight = isLoss
    ? t(`fired.${lossReason}.newspaperBodyRight`)
    : t(`${nk}.newspaperBodyRight`);

  const ledgerStamp = isLoss ? t(`fired.${lossReason}.ledgerStamp`) : undefined;

  return (
    <div className="h-screen flex flex-col bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      <div
        ref={boardRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-14 px-20 select-none"
        style={{ cursor: drag.current.active ? "grabbing" : "grab" }}
      >
        <LedgerPaper
          ledger={ledger}
          stamp={ledgerStamp}
          animationStep={ledgerStep}
        />
        <NewspaperPaper
          headline={headline}
          deck={deck}
          bodyLeft={bodyLeft}
          bodyRight={bodyRight}
          visible={showNewspaper}
        />
        <LetterPaper
          nightSegment={nightSegment}
          isLoss={isLoss}
          firedReason={lossReason}
          visible={showLetter}
        />
        <ActivityLogPaper logs={ledger.logs} visible={showLog} />
      </div>

      <div className="border-t border-[#141414] flex items-center justify-between px-8 py-4 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">
          {isLoss
            ? t("corkboard.footer.nightGameOver", { n: nightNumber })
            : t("corkboard.footer.nightReady", { n: nightNumber })}
        </span>

        <AnimatePresence>
          {ctaReady && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isLoss ? (
                <button
                  type="button"
                  onClick={onLeave}
                  className="rounded-xl border-2 border-[#141414] px-8 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#141414] shadow-[4px_4px_0_0_#141414] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#141414] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                >
                  {t("corkboard.cta.giveResignation")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenRestaurant}
                  className="rounded-xl border-2 border-[#141414] bg-[#141414] px-10 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#E4E3E0] shadow-[4px_4px_0_0_#141414] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#141414] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                >
                  {t("corkboard.cta.openRestaurant")}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#141414]/20">
          {ctaReady ? t("corkboard.footer.scrollHint") : ""}
        </span>
      </div>
    </div>
  );
}
