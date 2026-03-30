import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Howler } from 'howler';
import { Volume2, VolumeX } from 'lucide-react';

import { STORAGE_KEYS } from '@/src/storageKeys';
import { Z_INDEX } from '@/src/zIndex';

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.audioMuted) === '1';
  } catch {
    return false;
  }
}

/**
 * Global mute for all Howler-based SFX (intro, toasts, etc.). Fixed position above
 * intro/tour layers; persists in localStorage.
 */
export function AudioMuteButton() {
  const { t } = useTranslation('common');
  const [muted, setMuted] = useState(readMuted);

  useLayoutEffect(() => {
    Howler.mute(muted);
  }, [muted]);

  const toggle = () => {
    setMuted((m) => {
      const next = !m;
      try {
        if (next) {
          localStorage.setItem(STORAGE_KEYS.audioMuted, '1');
        } else {
          localStorage.removeItem(STORAGE_KEYS.audioMuted);
        }
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="pointer-events-auto fixed bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#141414]/20 bg-white/95 text-[#141414] shadow-[3px_3px_0_0_rgba(20,20,20,0.15)] backdrop-blur-sm transition-colors hover:border-[#141414]/35 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      style={{ zIndex: Z_INDEX.globalChrome }}
      aria-label={muted ? t('audio.unmuteAria') : t('audio.muteAria')}
      aria-pressed={muted}
      title={muted ? t('audio.unmute') : t('audio.mute')}
    >
      {muted ? (
        <VolumeX size={22} strokeWidth={2.25} aria-hidden />
      ) : (
        <Volume2 size={22} strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}
