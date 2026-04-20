import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BossDefinition } from '../../types';
import { PixelAvatar } from '../scene/PixelAvatar';
import {
  MonsieurVDialogueBlock,
  INTRO_SERIF_FONT,
} from '../intro/MonsieurVDialogue';
import { INTRO_CHAR_DELAY_MS, INTRO_JITTER_MS } from '../intro/introConstants';
import { useTypewriter } from '../../hooks/useTypewriter';
import { playDialogueTypewriterClick } from '../../audio/gameSfx';

interface BossEncounterIntroProps {
  boss: BossDefinition;
  commandWord: string;
  onBegin: () => void;
}

/**
 * Full-screen dramatic beat: large boss portrait, serif dialogue with typewriter,
 * then the intercepted command and a single CTA into the mini-game.
 */
export function BossEncounterIntro({
  boss,
  commandWord,
  onBegin,
}: BossEncounterIntroProps) {
  const { t } = useTranslation('game');

  const lineKeys = useMemo(
    () => [...(boss.introLineKeys ?? []), boss.quoteKey],
    [boss.introLineKeys, boss.quoteKey],
  );

  const [lineIndex, setLineIndex] = useState(0);
  const [showCommand, setShowCommand] = useState(false);

  useEffect(() => {
    setLineIndex(0);
    setShowCommand(false);
  }, [boss.id]);

  const currentKey = lineKeys[lineIndex] ?? '';
  const currentLine = currentKey ? t(currentKey) : '';

  const { displayed, done, skipToEnd } = useTypewriter(
    showCommand ? '' : currentLine,
    INTRO_CHAR_DELAY_MS,
    playDialogueTypewriterClick,
    INTRO_JITTER_MS,
  );

  const advance = useCallback(() => {
    if (showCommand) {
      onBegin();
      return;
    }
    if (!done) {
      skipToEnd();
      return;
    }
    if (lineIndex < lineKeys.length - 1) {
      setLineIndex((i) => i + 1);
      return;
    }
    setShowCommand(true);
  }, [done, lineIndex, lineKeys.length, onBegin, showCommand, skipToEnd]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance]);

  const roleLabel =
    boss.role === 'VIP' ? t('boss.roleVIP') : t('boss.roleBanned');

  return (
    <div
      className="pointer-events-auto flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8"
      style={{
        background:
          'radial-gradient(ellipse 80% 55% at 50% 28%, rgba(232, 201, 122, 0.14) 0%, transparent 58%), #000000',
      }}
    >
      <p
        className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.45em] text-white/45 sm:text-xs sm:tracking-[0.5em]"
        style={{ fontFamily: INTRO_SERIF_FONT }}
      >
        {t('boss.encounterLabel')}
      </p>

      <div className="flex w-full max-w-4xl flex-col items-stretch gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-12">
        <div className="flex flex-col items-center lg:shrink-0">
          <div
            className="relative flex flex-col items-center rounded-2xl border border-[#e8c97a]/35 bg-[#1a1510]/80 px-4 pb-5 pt-6 shadow-[0_0_60px_rgba(232,201,122,0.08)]"
            style={{ animation: 'bossIntroRise 0.85s cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
              style={{
                background:
                  'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232, 201, 122, 0.22), transparent 70%)',
              }}
            />
            <PixelAvatar traits={boss.visualTraits} scale={5} animState="entrance" />
            <h2
              className="relative z-1 mt-4 max-w-56 text-center text-lg font-black uppercase tracking-[0.2em] text-[#e8c97a] sm:text-xl sm:tracking-[0.28em]"
              style={{ fontFamily: INTRO_SERIF_FONT }}
            >
              {boss.name}
            </h2>
            <p
              className="relative z-1 mt-1 text-center text-xs italic leading-snug text-white/50"
              style={{ fontFamily: INTRO_SERIF_FONT }}
            >
              {roleLabel}
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 lg:max-w-md">
          <MonsieurVDialogueBlock className="border-[#c8a84b]/30 bg-black/55">
            {!showCommand ? (
              <>
                <p
                  className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#e8c97a]/75"
                  style={{ fontFamily: INTRO_SERIF_FONT }}
                >
                  {t('boss.speaking')}
                </p>
                <p
                  className="min-h-18 whitespace-pre-wrap text-base leading-relaxed text-[#e8e4dc]/95 sm:text-lg sm:leading-relaxed"
                  style={{ fontFamily: INTRO_SERIF_FONT }}
                >
                  {displayed}
                  {!done && (
                    <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-[#e8c97a]/80 align-middle animate-pulse" />
                  )}
                </p>
                <button
                  type="button"
                  onClick={advance}
                  className="mt-5 w-full rounded-lg border-2 border-[#e8c97a]/50 bg-[#e8c97a]/10 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#f5e6bc] transition-colors hover:bg-[#e8c97a]/18 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c97a] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  style={{ fontFamily: INTRO_SERIF_FONT }}
                >
                  {!done
                    ? t('boss.skipTyping')
                    : lineIndex < lineKeys.length - 1
                      ? t('boss.nextLine')
                      : t('boss.toChallenge')}
                </button>
                <p className="mt-2 text-center text-[10px] text-white/35">
                  {t('boss.advanceHint')}
                </p>
              </>
            ) : (
              <>
                <p
                  className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-white/40"
                  style={{ fontFamily: INTRO_SERIF_FONT }}
                >
                  {t('boss.interceptLabel')}
                </p>
                <p
                  className="text-center text-4xl font-black uppercase tracking-[0.2em] text-white sm:text-5xl sm:tracking-[0.28em]"
                  style={{
                    fontFamily: INTRO_SERIF_FONT,
                    animation: 'bossCommandPulse 0.6s ease-out both',
                  }}
                >
                  {commandWord}
                </p>
                <button
                  type="button"
                  onClick={advance}
                  className="mt-8 w-full rounded-lg border-2 border-[#e8c97a] bg-[#e8c97a] py-3.5 text-sm font-black uppercase tracking-[0.25em] text-[#1a1510] shadow-[4px_4px_0_0_rgba(232,201,122,0.35)] transition-transform hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e6bc] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  style={{ fontFamily: INTRO_SERIF_FONT }}
                >
                  {t('boss.beginTrial')}
                </button>
                <p className="mt-2 text-center text-[10px] text-white/35">
                  {t('boss.advanceHint')}
                </p>
              </>
            )}
          </MonsieurVDialogueBlock>
        </div>
      </div>

      <style>{`
        @keyframes bossIntroRise {
          from { transform: translateY(16px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes bossCommandPulse {
          from { transform: scale(1.08); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
