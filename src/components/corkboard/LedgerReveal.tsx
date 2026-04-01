import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { LedgerData } from '@/src/types/campaign';

/** Must match the number of entries in the `rows` array below. */
export const LEDGER_ROW_COUNT = 10;

interface LedgerRevealProps {
  ledger: LedgerData;
  revealedLines: number;
  isActive: boolean;
  isDismissed: boolean;
  isFinalArrangement: boolean;
  canAdvance: boolean;
  stampText?: string;
  showStamp?: boolean;
  containerZIndex: number;
  layoutFinalRow?: boolean;
}

const VARIANTS = {
  hidden: { opacity: 0, scale: 0.7, y: -60, x: 0 },
  active: { opacity: 1, scale: 1, y: 0, x: 0 },
  dismissedCompact: { opacity: 0.92, scale: 0.56, x: '30vw', y: '-22vh' },
  dismissedFinal: { opacity: 1, scale: 1, x: '14vw', y: '-13vh' },
  dismissedFinalRow: { opacity: 1, scale: 1, x: 0, y: 0 },
} as const;

export function LedgerReveal({
  ledger,
  revealedLines,
  isActive,
  isDismissed,
  isFinalArrangement,
  canAdvance,
  stampText,
  showStamp = false,
  containerZIndex,
  layoutFinalRow = false,
}: LedgerRevealProps) {
  const { t } = useTranslation('campaign');
  const animateKey = isActive
    ? 'active'
    : isDismissed
      ? isFinalArrangement
        ? layoutFinalRow
          ? 'dismissedFinalRow'
          : 'dismissedFinal'
        : 'dismissedCompact'
      : 'hidden';

  const rows = [
    {
      label: t('corkboard.ledger.revenue'),
      value: `€${Math.round(ledger.shiftRevenue)}`,
      type: 'income' as const,
    },
    {
      label: t('corkboard.ledger.coversSeated'),
      value: String(ledger.coversSeated),
      type: 'info' as const,
    },
    { label: null, value: null, type: 'divider' as const },
    {
      label: t('corkboard.ledger.salaries'),
      value: `-€${ledger.salaryCost}`,
      type: 'expense' as const,
    },
    {
      label: t('corkboard.ledger.electricity'),
      value: `-€${ledger.electricityCost}`,
      type: 'expense' as const,
    },
    {
      label: t('corkboard.ledger.foodWithCovers', { count: ledger.coversSeated }),
      value: `-€${Math.round(ledger.foodCost)}`,
      type: 'expense' as const,
    },
    { label: null, value: null, type: 'divider' as const },
    {
      label: t('corkboard.ledger.netProfit'),
      value: `€${Math.round(ledger.netProfit)}`,
      type: 'total' as const,
    },
    {
      label: t('corkboard.ledger.cashOnHand'),
      value: `€${Math.round(ledger.cash)}`,
      type: 'total' as const,
    },
    {
      label: t('corkboard.ledger.ratingLabel'),
      value: t('corkboard.ledger.ratingStars', {
        value: ledger.rating.toFixed(1),
      }),
      type: 'info' as const,
    },
  ];

  return (
    <div
      className={
        layoutFinalRow
          ? 'relative flex h-full min-h-0 w-[min(28vw,20rem)] min-w-[200px] max-w-xs shrink-0 flex-col items-center justify-start'
          : undefined
      }
      style={
        layoutFinalRow
          ? {
              pointerEvents: 'none',
              zIndex: containerZIndex,
            }
          : {
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: containerZIndex,
            }
      }
    >
      <motion.div
        className={
          layoutFinalRow
            ? 'min-h-0 w-full max-h-full flex-1 overflow-y-auto overflow-x-hidden'
            : undefined
        }
        variants={VARIANTS}
        animate={animateKey}
        initial="hidden"
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <div
          className={`bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden ${
            layoutFinalRow
              ? 'w-full'
              : isFinalArrangement && isDismissed
                ? 'w-80'
                : 'w-72'
          }`}
        >
          <div className="bg-[#141414] text-[#E4E3E0] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
              {t('corkboard.ledger.venueName')}
            </p>
            <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">
              {t('corkboard.ledger.shiftReport')}
            </p>
          </div>

          <div
            className={`relative font-sans ${
              isFinalArrangement && isDismissed ? 'p-5 min-h-[220px]' : 'p-4 min-h-[200px]'
            }`}
          >
            {showStamp && stampText && (
              <motion.div
                initial={{ opacity: 0, scale: 2.5, rotate: -25 }}
                animate={{ opacity: 1, scale: 1, rotate: -15 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                style={{
                  position: 'absolute',
                  top: '45%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-15deg)',
                  border: '3px solid rgba(180,30,30,0.75)',
                  color: 'rgba(180,30,30,0.75)',
                  padding: '4px 14px',
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              >
                {stampText}
              </motion.div>
            )}

            {rows.map((row, i) => {
              if (i >= revealedLines) return null;
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
                  <span className="text-[11px] text-[#141414]/50 uppercase tracking-wide">
                    {row.label}
                  </span>
                  <span
                    className={`text-sm font-mono ${
                      row.type === 'total'
                        ? 'font-black text-[#141414]'
                        : row.type === 'expense'
                          ? 'text-[#141414]/70'
                          : 'text-[#141414]'
                    }`}
                  >
                    {row.value}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {canAdvance && (
            <div className="px-4 pb-4 text-center">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#141414]/40 animate-pulse">
                {t('corkboard.carousel.pressEnter')}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
