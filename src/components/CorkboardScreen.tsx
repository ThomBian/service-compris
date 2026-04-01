import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type {
  LedgerData,
  CorkboardVariant,
  CampaignPath,
} from '@/src/types/campaign';
import { campaignNightsKeySegment } from '@/src/i18n/campaignNightKey';
import {
  useCarouselSummary,
  type CarouselStep,
} from '@/src/hooks/useCarouselSummary';
import { playStampThwack, playStampCrinkle } from '@/src/audio/gameSfx';
import { NewspaperReveal } from '@/src/components/corkboard/NewspaperReveal';
import { LedgerReveal } from '@/src/components/corkboard/LedgerReveal';
import { MemoReveal } from '@/src/components/corkboard/MemoReveal';

const LEDGER_ROW_COUNT = 10;

function corkboardPaperZIndex(
  paper: 'newspaper' | 'ledger' | 'memo',
  step: CarouselStep,
): number {
  const isActive =
    (paper === 'newspaper' && step === 'newspaper') ||
    (paper === 'ledger' && step === 'ledger') ||
    (paper === 'memo' && step === 'memo');
  if (isActive) return 20;
  if (step === 'final') {
    // Single horizontal row; equal stacking — stamp stays inside the ledger card.
    return 15;
  }
  // Dismissed papers stay above the dim overlay (10) so they remain readable.
  return 12;
}

interface CorkboardScreenProps {
  variant: CorkboardVariant;
  nightNumber: number;
  activePath: CampaignPath;
  ledger: LedgerData;
  firedReason?: 'MORALE' | 'VIP' | 'BANNED';
  onOpenRestaurant: () => void;
  onLeave: () => void;
}

export function CorkboardScreen({
  variant,
  nightNumber,
  activePath,
  ledger,
  firedReason,
  onOpenRestaurant,
  onLeave,
}: CorkboardScreenProps) {
  const { t } = useTranslation('campaign');
  const isLoss = variant === 'fired';
  const lossReason = firedReason ?? 'MORALE';
  const nightSegment = campaignNightsKeySegment(nightNumber, activePath);
  const nk = `nights.${nightSegment}`;

  const headline = isLoss
    ? t(`fired.${lossReason}.newspaperHeadline`)
    : t(`${nk}.newspaper`);

  const memoText = React.useMemo(() => {
    if (isLoss) {
      return [
        t(`fired.${lossReason}.letterSalutation`),
        t(`fired.${lossReason}.letterBody`),
        `"${t(`fired.${lossReason}.letterQuote`)}"`,
        t(`fired.${lossReason}.letterSignOff`),
        t('corkboard.letter.signOffName'),
        `P.S. ${t(`fired.${lossReason}.letterPS`)}`,
      ].join('\n\n');
    }
    const quote = t(`${nk}.quote`);
    const memo = t(`${nk}.memo`);
    const showQuote = quote.trim() !== '...' && quote.trim() !== '…';
    return showQuote ? `"${quote}"\n\n${memo}` : memo;
  }, [isLoss, lossReason, nk, t]);

  const {
    step,
    canAdvance,
    headlineDisplayed,
    memoDisplayed,
    revealedLines,
    advance,
  } = useCarouselSummary(headline, memoText, LEDGER_ROW_COUNT);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && step !== 'final') advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, step]);

  const [showStamp, setShowStamp] = React.useState(false);
  const [ctaReady, setCtaReady] = React.useState(false);

  React.useEffect(() => {
    if (step !== 'final') return;
    if (isLoss) {
      let crinkleId: number | undefined;
      const timerStamp = window.setTimeout(() => {
        setShowStamp(true);
        playStampThwack();
        crinkleId = window.setTimeout(playStampCrinkle, 200);
      }, 500);
      const timerCta = window.setTimeout(() => setCtaReady(true), 1400);
      return () => {
        window.clearTimeout(timerStamp);
        window.clearTimeout(timerCta);
        if (crinkleId !== undefined) window.clearTimeout(crinkleId);
      };
    }
    const timerCta = window.setTimeout(() => setCtaReady(true), 500);
    return () => window.clearTimeout(timerCta);
  }, [step, isLoss]);

  const deck = isLoss
    ? t(`fired.${lossReason}.newspaperDeck`)
    : t(`${nk}.newspaperDeck`);
  const bodyLeft = isLoss
    ? t(`fired.${lossReason}.newspaperBodyLeft`)
    : t(`${nk}.newspaperBodyLeft`);
  const bodyRight = isLoss
    ? t(`fired.${lossReason}.newspaperBodyRight`)
    : t(`${nk}.newspaperBodyRight`);
  const stampText = isLoss ? t(`fired.${lossReason}.ledgerStamp`) : undefined;

  return (
    <div
      className="h-screen relative flex flex-col bg-[#1a1008] overflow-hidden select-none font-sans"
      onClick={() => {
        if (step !== 'final') advance();
      }}
      style={{ cursor: step !== 'final' ? 'pointer' : 'default' }}
    >
      <motion.div
        className="absolute inset-0 bg-black/70 pointer-events-none"
        animate={{ opacity: step === 'final' ? 0 : 1 }}
        transition={{ duration: 0.6 }}
        style={{ zIndex: 10 }}
      />

      <div
        className={
          step === 'final'
            ? 'pointer-events-none absolute left-0 right-0 top-14 bottom-[5.75rem] z-[16] flex flex-row flex-nowrap items-stretch justify-start sm:justify-center gap-2 sm:gap-4 px-2 overflow-x-auto overflow-y-hidden'
            : 'contents'
        }
      >
        <NewspaperReveal
          headlineDisplayed={headlineDisplayed}
          headlineFull={headline}
          deck={deck}
          bodyLeft={bodyLeft}
          bodyRight={bodyRight}
          isActive={step === 'newspaper'}
          isDismissed={
            step === 'ledger' || step === 'memo' || step === 'final'
          }
          isFinalArrangement={step === 'final'}
          canAdvance={canAdvance && step === 'newspaper'}
          containerZIndex={corkboardPaperZIndex('newspaper', step)}
          layoutFinalRow={step === 'final'}
        />

        <LedgerReveal
          ledger={ledger}
          revealedLines={revealedLines}
          isActive={step === 'ledger'}
          isDismissed={step === 'memo' || step === 'final'}
          isFinalArrangement={step === 'final'}
          canAdvance={canAdvance && step === 'ledger'}
          stampText={stampText}
          showStamp={showStamp}
          containerZIndex={corkboardPaperZIndex('ledger', step)}
          layoutFinalRow={step === 'final'}
        />

        <MemoReveal
          memoDisplayed={memoDisplayed}
          memoFull={memoText}
          isLoss={isLoss}
          firedReason={lossReason}
          nightSegment={nightSegment}
          isActive={step === 'memo'}
          isDismissed={step === 'final'}
          isFinalArrangement={step === 'final'}
          canAdvance={canAdvance && step === 'memo'}
          containerZIndex={corkboardPaperZIndex('memo', step)}
          layoutFinalRow={step === 'final'}
        />
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 border-t border-[#E4E3E0]/10 flex items-center justify-between px-8 py-4"
        style={{ zIndex: 30 }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/30">
          {isLoss
            ? t('corkboard.footer.nightGameOver', { n: nightNumber })
            : t('corkboard.footer.nightReady', { n: nightNumber })}
        </span>

        <AnimatePresence>
          {ctaReady && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {!isLoss && (
                <button
                  type="button"
                  onClick={onOpenRestaurant}
                  className="rounded-xl border-2 border-[#E4E3E0] bg-[#E4E3E0] px-10 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#141414] transition-all hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]"
                >
                  {t('corkboard.cta.openRestaurant')}
                </button>
              )}
              <button
                type="button"
                onClick={onLeave}
                className="rounded-xl border-2 border-[#E4E3E0]/40 px-8 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#E4E3E0]/60 transition-all hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]"
              >
                {t('corkboard.cta.giveResignation')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/20">
          {step !== 'final' ? t('corkboard.carousel.pressEnter') : ''}
        </span>
      </div>
    </div>
  );
}
