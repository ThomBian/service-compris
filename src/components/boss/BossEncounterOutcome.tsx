import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { BossDefinition } from '../../types';
import { PixelAvatar } from '../scene/PixelAvatar';

/** Maps roster id `syndicate-don` to i18n group `syndicateDon`. */
export function bossIdToI18nGroup(bossId: string): string {
  return bossId
    .split('-')
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

type Props = {
  boss: BossDefinition | undefined;
  displayName: string;
  bossId: string;
  outcome: 'WIN' | 'LOSE';
  interceptedAction: 'SEAT' | 'REFUSE';
  onContinue: () => void;
};

export function BossEncounterOutcome({
  boss,
  displayName,
  bossId,
  outcome,
  interceptedAction,
  onContinue,
}: Props) {
  const { t, i18n } = useTranslation('game');
  const continueRef = useRef<HTMLButtonElement>(null);
  const group = bossIdToI18nGroup(bossId);
  const suffix = outcome === 'WIN' ? 'summaryWin' : 'summaryLose';
  const specificKey = `boss.${group}.${suffix}`;

  const body = i18n.exists(specificKey, { ns: 'game' })
    ? t(specificKey, { name: displayName })
    : outcome === 'WIN'
        ? interceptedAction === 'SEAT'
          ? t('boss.winSeat', { name: displayName })
          : t('boss.winRefuse', { name: displayName })
        : interceptedAction === 'SEAT'
          ? t('boss.loseSeat', { name: displayName })
          : t('boss.loseRefuse', { name: displayName });

  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  const heading =
    outcome === 'WIN' ? t('boss.outcomeHeadingWin') : t('boss.outcomeHeadingLose');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boss-outcome-heading"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        {boss ? (
          <div className="flex flex-col items-center gap-3">
            <PixelAvatar traits={boss.visualTraits} scale={3} />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{boss.name}</p>
          </div>
        ) : (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{displayName}</p>
        )}

        <div className="flex flex-col gap-4">
          <h2
            id="boss-outcome-heading"
            className={
              outcome === 'WIN'
                ? 'text-2xl font-black uppercase tracking-[0.18em] text-emerald-400/95 sm:text-3xl'
                : 'text-2xl font-black uppercase tracking-[0.18em] text-red-400/95 sm:text-3xl'
            }
          >
            {heading}
          </h2>
          <p className="text-balance text-base leading-relaxed text-white/80 sm:text-lg">{body}</p>
        </div>

        <button
          ref={continueRef}
          type="button"
          onClick={onContinue}
          className="rounded-xl border-2 border-[#e8c97a]/80 bg-[#e8c97a]/15 px-8 py-3 text-xs font-bold uppercase tracking-[0.25em] text-[#f5e6bc] shadow-[0_0_24px_rgba(232,201,122,0.2)] transition-colors hover:bg-[#e8c97a]/25"
        >
          {t('boss.fallbackContinue')}
        </button>
      </div>
    </div>
  );
}
