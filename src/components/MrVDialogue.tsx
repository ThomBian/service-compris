import React, { useState } from 'react';
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
    undefined,
    INTRO_JITTER_MS,
  );

  const handleClick = () => {
    if (!done) {
      skipToEnd();
      return;
    }
    if (lineIndex < lines.length - 1) {
      setLineIndex(i => i + 1);
    } else {
      onDismiss();
    }
  };

  return createPortal(
    <button
      type="button"
      className="fixed inset-0 flex cursor-default items-end justify-center px-4 pb-24"
      style={{ zIndex: Z_INDEX.gameDialogue, background: 'rgba(0,0,0,0.40)' }}
      onClick={handleClick}
      aria-label="Monsieur V. — click to continue"
    >
      <div className="w-full max-w-lg">
        <MonsieurVDialogueBlock>
          <MonsieurVSpeech variant="dark" speakerName="Monsieur V." speakerRole="Propriétaire — Le Solstice">
            {displayed}
            {done && lineIndex === lines.length - 1 && (
              <span className="ml-1 animate-pulse text-sm text-[#c8a84b]/60">
                {' '}
                ▸ {t('screen0.clickToContinue')}
              </span>
            )}
          </MonsieurVSpeech>
        </MonsieurVDialogueBlock>
      </div>
    </button>,
    document.body,
  );
};
