import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTypewriter } from '@/src/hooks/useTypewriter';
import {
  MonsieurVSpeech,
  MonsieurVDialogueBlock,
} from '@/src/components/intro/MonsieurVDialogue';
import { Z_INDEX } from '@/src/zIndex';
import {
  INTRO_CHAR_DELAY_MS,
  INTRO_JITTER_MS,
} from '@/src/components/intro/introConstants';
import { playDialogueTypewriterClick } from '@/src/audio/gameSfx';

interface MrVDialogueProps {
  lines: string[];
  onDismiss: () => void;
}

/**
 * In-game Monsieur V. aside. Partial scrim so the shift stays visible behind.
 * Reuses intro Monsieur V. chrome for consistent tone.
 */
export const MrVDialogue: React.FC<MrVDialogueProps> = ({ lines, onDismiss }) => {
  const { t } = useTranslation('intro');
  const [lineIndex, setLineIndex] = useState(0);

  React.useEffect(() => {
    setLineIndex(0);
  }, [lines]);

  const currentLine = lines[lineIndex] ?? '';

  const { displayed, done, skipToEnd } = useTypewriter(
    currentLine,
    INTRO_CHAR_DELAY_MS,
    playDialogueTypewriterClick,
    INTRO_JITTER_MS,
  );

  const advance = useCallback(() => {
    if (!done) {
      skipToEnd();
      return;
    }
    if (lineIndex < lines.length - 1) {
      setLineIndex(i => i + 1);
      return;
    }
    onDismiss();
  }, [done, lineIndex, lines.length, onDismiss, skipToEnd]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance]);

  return createPortal(
    <button
      type="button"
      className="fixed inset-0 flex cursor-default items-start justify-center px-4 pt-24 sm:pt-28"
      style={{ zIndex: Z_INDEX.gameDialogue, background: 'rgba(0,0,0,0.40)' }}
      onClick={advance}
      aria-label={t('mrVDialogueInGame.aria')}
    >
      <div className="w-full max-w-lg">
        <MonsieurVDialogueBlock>
          <MonsieurVSpeech variant="dark" speakerName="Monsieur V." speakerRole="Propriétaire — Le Solstice">
            {displayed}
            {!done && (
              <span className="ml-1 block pt-2 text-sm text-[#c8a84b]/70">
                {t('pressEnterToFinishLine')}
              </span>
            )}
            {done && (
              <span className="ml-1 block pt-2 animate-pulse text-sm text-[#c8a84b]/70">
                {t('pressEnterToContinue')}
              </span>
            )}
          </MonsieurVSpeech>
        </MonsieurVDialogueBlock>
      </div>
    </button>,
    document.body,
  );
};
