import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Howler } from 'howler';
import { getSharedAmbienceSounds } from '@/src/audio/introAudio';
import {
  getMsUntilShiftAmbienceUnblocked,
  isShiftAmbienceBlocked,
} from '@/src/audio/ambienceShiftGate';

const JAZZ_TARGET_VOL = 0.2;
const JAZZ_FADE_MS = 2000;

/**
 * Loops intro rain + jazz during a shift (shared Howls with `IntroSequence`).
 * Pauses when the player pauses (time frozen, tour excluded); resumes after.
 * Defers start while intro exit fade is running (`ambienceShiftGate`).
 */
export function useGameAmbience(opts: {
  shiftEnded: boolean;
  timeMultiplier: number;
  isTourActive: boolean;
}): void {
  const { shiftEnded, timeMultiplier, isTourActive } = opts;
  const everStartedRef = useRef(false);
  const [gestureUnlocked, setGestureUnlocked] = useState(false);

  useLayoutEffect(() => {
    try {
      if (Howler.ctx?.state === 'running') {
        setGestureUnlocked(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const unlock = () => {
      setGestureUnlocked(true);
      void Howler.ctx?.resume?.();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const shouldRun =
    !shiftEnded && (timeMultiplier > 0 || isTourActive);

  useEffect(() => {
    if (!gestureUnlocked) return;

    let cancelled = false;
    let timeoutId = 0;

    const apply = () => {
      if (cancelled) return;
      if (isShiftAmbienceBlocked()) {
        const wait = getMsUntilShiftAmbienceUnblocked();
        timeoutId = window.setTimeout(apply, wait > 0 ? wait : 16);
        return;
      }

      const s = getSharedAmbienceSounds();
      void Howler.ctx?.resume?.();

      if (!shouldRun) {
        s.rainLoop.pause();
        s.jazzLoop.pause();
        return;
      }

      s.rainLoop.play();

      if (!everStartedRef.current) {
        everStartedRef.current = true;
        s.jazzLoop.volume(0);
        s.jazzLoop.play();
        s.jazzLoop.fade(0, JAZZ_TARGET_VOL, JAZZ_FADE_MS);
      } else {
        s.jazzLoop.volume(JAZZ_TARGET_VOL);
        s.jazzLoop.play();
      }
    };

    apply();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [gestureUnlocked, shouldRun]);

  useEffect(() => {
    return () => {
      const s = getSharedAmbienceSounds();
      s.rainLoop.stop();
      s.jazzLoop.stop();
    };
  }, []);
}
