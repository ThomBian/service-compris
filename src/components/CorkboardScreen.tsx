import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { LedgerData, NightConfig, FiredConfig, CorkboardVariant, CampaignPath } from '../types/campaign';
import { FIRED_CONFIG } from '../data/firedConfig';

interface CorkboardScreenProps {
  variant: CorkboardVariant;
  nightNumber: number;
  activePath: CampaignPath;
  nightConfig?: NightConfig;
  ledger: LedgerData;
  firedConfig?: FiredConfig;
  onOpenRestaurant: () => void;
  onLeave: () => void;
}

// ─── Shared doc wrapper ────────────────────────────────────────────────────────

function DocPin() {
  return (
    <div style={{
      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
      width: 12, height: 12, borderRadius: '50%', background: '#141414',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 2,
    }} />
  );
}

// ─── Ledger ────────────────────────────────────────────────────────────────────

function LedgerPaper({ ledger, stamp, animationStep }: {
  ledger: LedgerData;
  stamp?: string;
  animationStep: number;
}) {
  const rows = [
    { label: 'Revenue', value: `€${Math.round(ledger.shiftRevenue)}`, type: 'income' as const },
    { label: 'Covers Seated', value: String(ledger.coversSeated), type: 'info' as const },
    { label: null, value: null, type: 'divider' as const },
    { label: 'Salaries', value: `-€${ledger.salaryCost}`, type: 'expense' as const },
    { label: 'Electricity', value: `-€${ledger.electricityCost}`, type: 'expense' as const },
    { label: `Food (${ledger.coversSeated} cvrs)`, value: `-€${Math.round(ledger.foodCost)}`, type: 'expense' as const },
    { label: null, value: null, type: 'divider' as const },
    { label: 'Net Profit', value: `€${Math.round(ledger.netProfit)}`, type: 'total' as const },
    { label: 'Cash on Hand', value: `€${Math.round(ledger.cash)}`, type: 'total' as const },
    { label: 'Rating', value: `${ledger.rating.toFixed(1)} ★`, type: 'info' as const },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: -1.5 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
      style={{ position: 'relative', flexShrink: 0 }}
    >
      <DocPin />
      <div className="w-72 bg-white border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
        <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]">Le Solstice</p>
          <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">Shift Report</p>
        </div>

        <div className="p-4 relative font-sans" style={{ minHeight: 200 }}>
          {stamp && (
            <div style={{
              position: 'absolute', top: '45%', left: '50%',
              transform: 'translate(-50%, -50%) rotate(-12deg)',
              border: '3px solid rgba(180,30,30,0.7)', color: 'rgba(180,30,30,0.7)',
              padding: '4px 14px', fontSize: '1.2rem', fontWeight: 900,
              letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              zIndex: 3, pointerEvents: 'none',
            }}>
              {stamp}
            </div>
          )}

          {rows.map((row, i) => {
            if (i >= animationStep) return null;
            if (row.type === 'divider') {
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
                <span className="text-[11px] text-[#141414]/50 uppercase tracking-wide">{row.label}</span>
                <span className={`text-sm font-mono ${
                  row.type === 'total' ? 'font-black text-[#141414]' :
                  row.type === 'expense' ? 'text-[#141414]/70' :
                  'text-[#141414]'
                }`}>
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

// ─── Newspaper ────────────────────────────────────────────────────────────────

function NewspaperPaper({ headline, deck, bodyLeft, bodyRight, visible }: {
  headline: string;
  deck: string;
  bodyLeft: string;
  bodyRight: string;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 1 }}
          animate={{ opacity: 1, y: 0, rotate: 0.5 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          style={{ position: 'relative', flexShrink: 0 }}
        >
          <DocPin />
          <div className="w-96 bg-white border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
            {/* Masthead */}
            <div className="border-b-2 border-[#141414] px-5 py-3 text-center">
              <p className="text-2xl font-black uppercase tracking-[0.1em] text-[#141414]" style={{ fontFamily: 'Georgia, serif' }}>
                L'Observateur
              </p>
              <div className="flex justify-between mt-1.5 border-t border-[#141414]/20 pt-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">Édition du Soir</span>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">Gratuit</span>
              </div>
            </div>

            {/* Headline */}
            <div className="px-5 pt-4 pb-0">
              <p className="text-base font-black uppercase leading-tight tracking-[0.02em] text-[#141414]" style={{ fontFamily: 'Georgia, serif' }}>
                {headline}
              </p>
              {deck && (
                <p className="text-xs text-[#141414]/60 italic mt-2 pt-2 border-t border-[#141414]/15 leading-relaxed">
                  {deck}
                </p>
              )}
            </div>

            {/* Body columns */}
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

// ─── Letter / Memo ────────────────────────────────────────────────────────────

function LetterPaper({ nightConfig, fired, isLoss, visible }: {
  nightConfig?: NightConfig;
  fired?: FiredConfig;
  isLoss: boolean;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 1.2 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          style={{ position: 'relative', flexShrink: 0 }}
        >
          <DocPin />
          <div className="w-80 bg-white border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
            <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em]">Le Solstice</p>
              <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">Correspondance Interne</p>
            </div>

            <div className="p-5 font-sans">
              {isLoss && fired ? (
                <>
                  <p className="text-xs text-[#141414]/50 mb-3">{fired.letterSalutation}</p>
                  <p className="text-sm text-[#141414]/80 leading-relaxed whitespace-pre-line mb-4">{fired.letterBody}</p>
                  <blockquote className="border-l-2 border-[#141414] pl-3 mb-4 text-sm italic text-[#141414]/60 leading-relaxed">
                    "{fired.letterQuote}"
                  </blockquote>
                  <p className="text-xs text-[#141414]/50">{fired.letterSignOff}</p>
                  <p className="text-sm font-black uppercase tracking-[0.1em] mt-1">Monsieur V.</p>
                  <p className="text-[10px] text-[#141414]/40 italic mt-3 pt-3 border-t border-[#141414]/10">
                    P.S. {fired.letterPS}
                  </p>
                </>
              ) : (
                <>
                  {nightConfig?.quote && (
                    <blockquote className="border-l-2 border-[#141414] pl-3 mb-4 text-sm italic text-[#141414]/60 leading-relaxed">
                      "{nightConfig.quote}"
                    </blockquote>
                  )}
                  <p className="text-sm text-[#141414]/80 leading-relaxed">{nightConfig?.memo ?? '...'}</p>
                  <p className="text-xs text-[#141414]/40 mt-4 pt-3 border-t border-[#141414]/10 font-black uppercase tracking-[0.1em]">
                    — V.
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

// ─── Activity Log ─────────────────────────────────────────────────────────────

function ActivityLogPaper({ logs, visible }: { logs: string[]; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          style={{ position: 'relative', flexShrink: 0 }}
        >
          <DocPin />
          <div className="w-64 bg-white border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
            <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em]">Le Solstice</p>
              <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">Activity Log</p>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto font-sans">
              {logs.length === 0 ? (
                <p className="text-xs text-[#141414]/40 italic p-1">No activity recorded.</p>
              ) : (
                logs.map((entry, i) => (
                  <div
                    key={i}
                    className={`text-[11px] border-b border-[#141414]/10 py-1.5 leading-snug ${
                      i === 0 ? 'text-[#141414] font-semibold' : 'text-[#141414]/60'
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

// ─── Main ─────────────────────────────────────────────────────────────────────

const LEDGER_ROWS = 10;
const MS_PER_ROW = 120;
const NEWSPAPER_DELAY_MS = LEDGER_ROWS * MS_PER_ROW + 300;
const LETTER_DELAY_MS = NEWSPAPER_DELAY_MS + 700;
const LOG_DELAY_MS = LETTER_DELAY_MS + 500;
const CTA_DELAY_MS = LOG_DELAY_MS + 400;

export function CorkboardScreen({
  variant,
  nightNumber,
  nightConfig,
  ledger,
  firedConfig,
  onOpenRestaurant,
  onLeave,
}: CorkboardScreenProps) {
  const isLoss = variant === 'fired';
  const fired = isLoss ? (firedConfig ?? FIRED_CONFIG['MORALE']) : undefined;

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
    drag.current = { active: true, startX: e.pageX - (boardRef.current?.offsetLeft ?? 0), scrollLeft: boardRef.current?.scrollLeft ?? 0 };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.active || !boardRef.current) return;
    e.preventDefault();
    boardRef.current.scrollLeft = drag.current.scrollLeft - (e.pageX - boardRef.current.offsetLeft - drag.current.startX) * 1.2;
  };
  const stopDrag = () => { drag.current.active = false; };

  return (
    <div className="h-screen flex flex-col bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">

      {/* Board */}
      <div
        ref={boardRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-14 px-20 select-none"
        style={{ cursor: drag.current.active ? 'grabbing' : 'grab' }}
      >
        <LedgerPaper ledger={ledger} stamp={isLoss && fired ? fired.ledgerStamp : undefined} animationStep={ledgerStep} />
        <NewspaperPaper
          headline={isLoss && fired ? fired.newspaperHeadline : (nightConfig?.newspaper ?? '')}
          deck={isLoss && fired ? fired.newspaperDeck : ''}
          bodyLeft={isLoss && fired ? fired.newspaperBodyLeft : ''}
          bodyRight={isLoss && fired ? fired.newspaperBodyRight : ''}
          visible={showNewspaper}
        />
        <LetterPaper nightConfig={nightConfig} fired={fired} isLoss={isLoss} visible={showLetter} />
        <ActivityLogPaper logs={ledger.logs} visible={showLog} />
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#141414] flex items-center justify-between px-8 py-4 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">
          Night {nightNumber} — {isLoss ? 'Game Over' : 'Ready'}
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
                  className="border-2 border-[#141414] px-8 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#141414] shadow-[4px_4px_0_0_#141414] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#141414] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                >
                  Leave.
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenRestaurant}
                  className="border-2 border-[#141414] bg-[#141414] px-10 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#E4E3E0] shadow-[4px_4px_0_0_#141414] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#141414] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                >
                  Open Restaurant
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#141414]/20">
          {ctaReady ? '← scroll →' : ''}
        </span>
      </div>
    </div>
  );
}
