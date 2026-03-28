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

// ─── Ledger ───────────────────────────────────────────────────────────────────

function LedgerPaper({ ledger, stamp, animationStep }: {
  ledger: LedgerData;
  stamp?: string;
  animationStep: number; // how many items to reveal
}) {
  const rows = [
    { label: 'Revenue', value: `€${Math.round(ledger.shiftRevenue)}`, type: 'income' as const },
    { label: 'Covers Seated', value: String(ledger.coversSeated), type: 'info' as const },
    { label: '──────────', value: '', type: 'divider' as const },
    { label: 'Salaries', value: `-€${ledger.salaryCost}`, type: 'expense' as const },
    { label: 'Electricity', value: `-€${ledger.electricityCost}`, type: 'expense' as const },
    { label: `Food (${ledger.coversSeated} covers)`, value: `-€${Math.round(ledger.foodCost)}`, type: 'expense' as const },
    { label: '──────────', value: '', type: 'divider' as const },
    { label: 'Net Profit', value: `€${Math.round(ledger.netProfit)}`, type: 'total' as const },
    { label: 'Cash on Hand', value: `€${Math.round(ledger.cash)}`, type: 'total' as const },
    { label: 'Rating', value: `${ledger.rating.toFixed(1)} ★`, type: 'info' as const },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: -1.5 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
      style={{ position: 'relative', flexShrink: 0, filter: 'drop-shadow(3px 6px 14px rgba(0,0,0,0.8))' }}
    >
      {/* Pin */}
      <div style={{
        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
        width: 14, height: 14, borderRadius: '50%', background: '#2c7a2c',
        boxShadow: '0 2px 4px rgba(0,0,0,0.6)', zIndex: 2, border: '2px solid rgba(0,0,0,0.3)',
      }} />

      <div style={{
        width: 300, background: '#fafaf8', border: '1px solid #c8c8b0',
        fontFamily: '"Courier New", Courier, monospace', overflow: 'hidden',
      }}>
        {/* Green header */}
        <div style={{
          background: '#1a1a1a', color: '#e8e8e8', padding: '10px 16px',
          fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 'bold',
        }}>
          Le Solstice — Shift Report
        </div>

        <div style={{ padding: '14px 16px', position: 'relative', minHeight: 200 }}>
          {stamp && (
            <div style={{
              position: 'absolute', top: '45%', left: '50%',
              transform: 'translate(-50%, -50%) rotate(-12deg)',
              border: '3px solid rgba(150,30,30,0.65)', color: 'rgba(150,30,30,0.65)',
              padding: '4px 14px', fontSize: '1.3rem', fontWeight: 900,
              letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              zIndex: 3, pointerEvents: 'none', fontFamily: '"Courier New", monospace',
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
                  style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }}
                />
              );
            }
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '4px 0', fontSize: '0.74rem',
                }}
              >
                <span style={{ color: '#666', fontSize: '0.68rem' }}>{row.label}</span>
                <span style={{
                  fontWeight: row.type === 'total' ? 'bold' : 'normal',
                  color: row.type === 'expense' ? '#8b0000' : row.type === 'total' ? '#111' : '#333',
                }}>
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
          style={{ position: 'relative', flexShrink: 0, filter: 'drop-shadow(3px 6px 14px rgba(0,0,0,0.8))' }}
        >
          <div style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            width: 14, height: 14, borderRadius: '50%', background: '#111',
            boxShadow: '0 2px 4px rgba(0,0,0,0.6)', zIndex: 2, border: '2px solid rgba(0,0,0,0.3)',
          }} />

          <div style={{
            width: 380, background: '#f5f3ee', border: '1px solid #bbb',
            fontFamily: 'Georgia, "Times New Roman", serif', overflow: 'hidden',
          }}>
            <div style={{ borderBottom: '3px double #111', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.08em', color: '#111' }}>
                L'Observateur
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.58rem', color: '#888', marginTop: 3, letterSpacing: '0.05em',
              }}>
                <span>ÉDITION DU SOIR</span>
                <span>PRIX: GRATUIT</span>
              </div>
            </div>

            <div style={{ padding: '12px 16px 0' }}>
              <div style={{
                fontSize: '1rem', fontWeight: 900, lineHeight: 1.25, color: '#111',
                textTransform: 'uppercase', letterSpacing: '0.02em',
              }}>
                {headline}
              </div>
              {deck && (
                <div style={{
                  fontSize: '0.7rem', color: '#555', fontStyle: 'italic',
                  marginTop: 6, borderTop: '1px solid #bbb', paddingTop: 6,
                }}>
                  {deck}
                </div>
              )}
            </div>

            {(bodyLeft || bodyRight) && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
                padding: '10px 16px 14px', borderTop: '1px solid #bbb', marginTop: 8,
              }}>
                <div style={{ fontSize: '0.63rem', lineHeight: 1.55, color: '#444', paddingRight: 8, borderRight: '1px solid #ccc' }}>
                  {bodyLeft}
                </div>
                <div style={{ fontSize: '0.63rem', lineHeight: 1.55, color: '#444', paddingLeft: 8 }}>
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
          style={{ position: 'relative', flexShrink: 0, filter: 'drop-shadow(3px 6px 14px rgba(0,0,0,0.8))' }}
        >
          <div style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            width: 14, height: 14, borderRadius: '50%', background: '#8b6914',
            boxShadow: '0 2px 4px rgba(0,0,0,0.6)', zIndex: 2, border: '2px solid rgba(0,0,0,0.3)',
          }} />

          <div style={{
            width: 320, background: '#fffef8', border: '1px solid #c8b870',
            fontFamily: '"Courier New", Courier, monospace', overflow: 'hidden',
          }}>
            <div style={{ borderBottom: '2px solid #c8b870', padding: '10px 16px', background: '#fffff0' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', color: '#6a5a1a', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Le Solstice — Correspondance Interne
              </div>
              <div style={{ fontSize: '0.53rem', color: '#aaa', marginTop: 2 }}>Transmission du Directeur</div>
            </div>

            <div style={{ padding: '14px 16px' }}>
              {isLoss && fired ? (
                <>
                  <div style={{ fontSize: '0.68rem', color: '#555', marginBottom: 8 }}>{fired.letterSalutation}</div>
                  <div style={{ fontSize: '0.68rem', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 12 }}>
                    {fired.letterBody}
                  </div>
                  <div style={{ borderLeft: '3px solid #c8b870', paddingLeft: 10, marginBottom: 12, fontSize: '0.68rem', fontStyle: 'italic', color: '#555', lineHeight: 1.5 }}>
                    "{fired.letterQuote}"
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#555' }}>{fired.letterSignOff}</div>
                  <div style={{ fontSize: '0.68rem', color: '#333', fontWeight: 'bold', marginTop: 4 }}>Monsieur V.</div>
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e0d8a0', fontSize: '0.63rem', color: '#777', fontStyle: 'italic' }}>
                    P.S. {fired.letterPS}
                  </div>
                </>
              ) : (
                <>
                  {nightConfig?.quote && (
                    <div style={{ borderLeft: '3px solid #c8b870', paddingLeft: 10, marginBottom: 12, fontSize: '0.7rem', fontStyle: 'italic', color: '#555', lineHeight: 1.5 }}>
                      "{nightConfig.quote}"
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: '#333', lineHeight: 1.6 }}>
                    {nightConfig?.memo ?? '...'}
                  </div>
                  <div style={{ marginTop: 14, fontSize: '0.63rem', color: '#888', borderTop: '1px solid #e0d8a0', paddingTop: 8 }}>
                    — V.
                  </div>
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
          style={{ position: 'relative', flexShrink: 0, filter: 'drop-shadow(3px 6px 14px rgba(0,0,0,0.8))' }}
        >
          <div style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            width: 14, height: 14, borderRadius: '50%', background: '#444',
            boxShadow: '0 2px 4px rgba(0,0,0,0.6)', zIndex: 2, border: '2px solid rgba(0,0,0,0.3)',
          }} />

          <div style={{
            width: 280, background: '#f8f8f6', border: '1px solid #c0c0b0',
            fontFamily: '"Courier New", Courier, monospace', overflow: 'hidden',
          }}>
            <div style={{
              background: '#1a1a1a', color: '#e8e8e8', padding: '10px 16px',
              fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 'bold',
            }}>
              Activity Log
            </div>
            <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ fontSize: '0.65rem', color: '#999', fontStyle: 'italic' }}>No activity recorded.</div>
              ) : (
                logs.map((entry, i) => (
                  <div key={i} style={{
                    fontSize: '0.62rem', color: i === 0 ? '#222' : '#555',
                    borderBottom: '1px solid #e0e0d0', padding: '4px 0',
                    lineHeight: 1.4,
                  }}>
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

const LEDGER_ROWS = 10; // total rows in ledger (including dividers)
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

  // Animation sequencing
  const [ledgerStep, setLedgerStep] = React.useState(0);
  const [showNewspaper, setShowNewspaper] = React.useState(false);
  const [showLetter, setShowLetter] = React.useState(false);
  const [showLog, setShowLog] = React.useState(false);
  const [ctaReady, setCtaReady] = React.useState(false);

  React.useEffect(() => {
    // Tick ledger rows
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

  // Drag-to-scroll
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#111', fontFamily: '"Courier New", Courier, monospace' }}>

      {/* Cork board */}
      <div
        ref={boardRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        style={{
          flex: 1, overflowX: 'auto', overflowY: 'hidden',
          display: 'flex', alignItems: 'center', gap: 56, padding: '40px 80px',
          background: '#1a1a1a', cursor: drag.current.active ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
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

      {/* Bottom bar — matches game chrome */}
      <div style={{
        background: '#0d0d0d', borderTop: '1px solid #222',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 32px',
      }}>
        <span style={{ color: '#444', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Night {nightNumber} — {isLoss ? 'Game Over' : 'Ready'}
        </span>

        <AnimatePresence>
          {ctaReady && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {isLoss ? (
                <button
                  onClick={onLeave}
                  style={{
                    background: 'transparent', color: '#777', border: '1px solid #444',
                    padding: '8px 24px', fontSize: '0.72rem', letterSpacing: '0.15em',
                    textTransform: 'uppercase', fontFamily: '"Courier New", monospace',
                    cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#888'; (e.target as HTMLButtonElement).style.color = '#aaa'; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#444'; (e.target as HTMLButtonElement).style.color = '#777'; }}
                >
                  Leave.
                </button>
              ) : (
                <button
                  onClick={onOpenRestaurant}
                  style={{
                    background: '#e8e8e0', color: '#111', border: '2px solid #111',
                    padding: '10px 28px', fontSize: '0.75rem', letterSpacing: '0.18em',
                    textTransform: 'uppercase', fontFamily: '"Courier New", monospace',
                    cursor: 'pointer', fontWeight: 'bold',
                    boxShadow: '3px 3px 0 0 rgba(20,20,20,1)',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.transform = 'translate(1px, 1px)'; (e.target as HTMLButtonElement).style.boxShadow = '2px 2px 0 0 rgba(20,20,20,1)'; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = ''; (e.target as HTMLButtonElement).style.boxShadow = '3px 3px 0 0 rgba(20,20,20,1)'; }}
                >
                  ○ Open Restaurant
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <span style={{ color: '#2a2a2a', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
          {ctaReady ? '← scroll to read →' : ''}
        </span>
      </div>
    </div>
  );
}
