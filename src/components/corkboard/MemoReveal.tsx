import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  MonsieurVDialogueBlock,
  MonsieurVSpeech,
} from '@/src/components/intro/MonsieurVDialogue';

interface MemoRevealProps {
  memoDisplayed: string;
  memoFull: string;
  isLoss: boolean;
  firedReason: 'MORALE' | 'VIP' | 'BANNED';
  nightSegment: string;
  isActive: boolean;
  isDismissed: boolean;
  isFinalArrangement: boolean;
  canAdvance: boolean;
  containerZIndex: number;
  layoutFinalRow?: boolean;
}

const VARIANTS = {
  hidden: { opacity: 0, scale: 0.7, y: 60, x: 0 },
  active: { opacity: 1, scale: 1, y: 0, x: 0 },
  dismissedCompact: { opacity: 0.92, scale: 0.56, x: 0, y: '24vh' },
  dismissedFinal: { opacity: 1, scale: 1, x: 0, y: '4vh' },
  dismissedFinalRow: { opacity: 1, scale: 1, x: 0, y: 0 },
} as const;

export function MemoReveal({
  memoDisplayed,
  memoFull,
  isLoss,
  firedReason,
  nightSegment,
  isActive,
  isDismissed,
  isFinalArrangement,
  canAdvance,
  containerZIndex,
  layoutFinalRow = false,
}: MemoRevealProps) {
  const { t: tCampaign } = useTranslation('campaign');
  const { t: tIntro } = useTranslation('intro');
  const nk = `nights.${nightSegment}`;
  const isTypingDone = memoFull.length > 0 && memoDisplayed === memoFull;
  /** Typewriter only while memo is in focus; final desk always shows full styled copy. */
  const showTypingPhase = isActive && !isTypingDone;
  const scrollableMemo =
    isActive || (isDismissed && isFinalArrangement);
  const animateKey = isActive
    ? 'active'
    : isDismissed
      ? isFinalArrangement
        ? layoutFinalRow
          ? 'dismissedFinalRow'
          : 'dismissedFinal'
        : 'dismissedCompact'
      : 'hidden';

  const scrollClasses =
    scrollableMemo && layoutFinalRow
      ? 'max-h-full overflow-y-auto overflow-x-hidden overscroll-contain pointer-events-auto'
      : scrollableMemo
        ? 'max-h-[calc(100vh-7.5rem)] overflow-y-auto overflow-x-hidden overscroll-contain pointer-events-auto'
        : '';

  return (
    <div
      className={
        layoutFinalRow
          ? 'relative flex h-full min-h-0 w-[min(38vw,28rem)] min-w-[220px] max-w-xl shrink-0 flex-col items-center justify-start'
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
        className={`w-full px-2 sm:px-4 ${
          layoutFinalRow
            ? 'max-w-none min-h-0 flex-1'
            : isFinalArrangement && isDismissed
              ? 'max-w-2xl'
              : 'max-w-lg'
        } ${scrollClasses}`}
        variants={VARIANTS}
        animate={animateKey}
        initial="hidden"
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <MonsieurVDialogueBlock>
          <MonsieurVSpeech
            variant="dark"
            speakerName={tIntro('monsieurVUi.name')}
            speakerRole={tIntro('monsieurVUi.role')}
          >
            {showTypingPhase ? (
              <>
                {memoDisplayed}
                <span className="animate-pulse opacity-60">|</span>
                <span className="ml-1 block pt-2 text-sm text-[#c8a84b]/70">
                  {tIntro('pressEnterToFinishLine')}
                </span>
              </>
            ) : isLoss ? (
              <>
                <p className="mb-3 text-xs text-[#e8e4dc]/50">
                  {tCampaign(`fired.${firedReason}.letterSalutation`)}
                </p>
                <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-[#e8e4dc]/88">
                  {tCampaign(`fired.${firedReason}.letterBody`)}
                </p>
                <blockquote className="mb-4 border-l-2 border-[#c8a84b]/45 pl-3 text-sm italic leading-relaxed text-[#e8e4dc]/65">
                  &ldquo;{tCampaign(`fired.${firedReason}.letterQuote`)}&rdquo;
                </blockquote>
                <p className="text-xs text-[#e8e4dc]/50">
                  {tCampaign(`fired.${firedReason}.letterSignOff`)}
                </p>
                <p className="mt-1 text-sm font-black uppercase tracking-widest text-[#f5e6bc]">
                  {tCampaign('corkboard.letter.signOffName')}
                </p>
                <p className="mt-3 border-t border-white/10 pt-3 text-[10px] italic text-[#e8e4dc]/45">
                  {tCampaign('corkboard.letter.psLine', {
                    text: tCampaign(`fired.${firedReason}.letterPS`),
                  })}
                </p>
                {canAdvance && (
                  <span className="ml-1 block pt-3 animate-pulse text-sm text-[#c8a84b]/70">
                    {tIntro('pressEnterToContinue')}
                  </span>
                )}
              </>
            ) : (
              <>
                {(() => {
                  const quote = tCampaign(`${nk}.quote`);
                  const show = quote.trim() !== '...' && quote.trim() !== '…';
                  return show ? (
                    <blockquote className="mb-4 border-l-2 border-[#c8a84b]/45 pl-3 text-sm italic leading-relaxed text-[#e8e4dc]/65">
                      &ldquo;{quote}&rdquo;
                    </blockquote>
                  ) : null;
                })()}
                <p className="text-sm leading-relaxed text-[#e8e4dc]/88">
                  {(() => {
                    const m = tCampaign(`${nk}.memo`);
                    return m === '...' || m === '…'
                      ? tCampaign('corkboard.letter.memoFallback')
                      : m;
                  })()}
                </p>
                <p className="mt-4 border-t border-white/10 pt-3 text-xs font-black uppercase tracking-widest text-[#e8e4dc]/45">
                  {tCampaign('corkboard.letter.signatureV')}
                </p>
                {canAdvance && (
                  <span className="ml-1 block pt-3 animate-pulse text-sm text-[#c8a84b]/70">
                    {tIntro('pressEnterToContinue')}
                  </span>
                )}
              </>
            )}
          </MonsieurVSpeech>
        </MonsieurVDialogueBlock>
      </motion.div>
    </div>
  );
}
