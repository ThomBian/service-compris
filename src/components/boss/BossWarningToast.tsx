import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { BossDefinition } from '../../types';
import { PixelAvatar } from '../scene/PixelAvatar';
import { playBossWarningSting } from '../../audio/gameSfx';
import { Z_INDEX } from '../../zIndex';

const DISMISS_DELAY_MS = 7000;

interface BossWarningToastProps {
  boss: BossDefinition;
  onDismiss: () => void;
}

export const BossWarningToast: React.FC<BossWarningToastProps> = ({ boss, onDismiss }) => {
  const { t } = useTranslation('ui');

  useEffect(() => {
    playBossWarningSting();
    const timer = setTimeout(onDismiss, DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-20 left-4 flex items-center gap-3 rounded-xl border border-red-800 bg-[#1c0505] px-3 py-2.5 shadow-[0_4px_24px_rgba(220,38,38,0.35)] max-w-[260px]"
      style={{ zIndex: Z_INDEX.bossWarning }}
    >
      <div className="shrink-0">
        <PixelAvatar traits={boss.visualTraits} scale={3} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-red-500">
          {t('boss.warningLabel')}
        </span>
        <span className="text-[11px] text-red-200 leading-snug italic">
          {boss.clueText}
        </span>
      </div>
    </motion.div>,
    document.body,
  );
};
