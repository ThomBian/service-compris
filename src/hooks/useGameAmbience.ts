import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Howler } from "howler";
import {
  createGameAmbienceSounds,
  type GameAmbienceSounds,
} from "@/src/audio/introAudio";

const JAZZ_TARGET_VOL = 0.2;
const JAZZ_FADE_MS = 2000;

/**
 * Loops intro rain + jazz during a shift (same assets as `IntroSequence`).
 * Pauses when the player pauses (time frozen, tour excluded); resumes after.
 * Requires user gesture or an already-running Web Audio context (e.g. after intro).
 */
export function useGameAmbience(opts: {
  shiftEnded: boolean;
  timeMultiplier: number;
  isTourActive: boolean;
}): void {
  const { shiftEnded, timeMultiplier, isTourActive } = opts;
  const soundsRef = useRef<GameAmbienceSounds | null>(null);
  const everStartedRef = useRef(false);
  const [gestureUnlocked, setGestureUnlocked] = useState(false);

  const ensureSounds = useCallback(() => {
    if (!soundsRef.current) {
      soundsRef.current = createGameAmbienceSounds();
    }
    return soundsRef.current;
  }, []);

  useLayoutEffect(() => {
    try {
      if (Howler.ctx?.state === "running") {
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
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const shouldRun =
    !shiftEnded && (timeMultiplier > 0 || isTourActive);

  useEffect(() => {
    if (!gestureUnlocked) return;

    const s = ensureSounds();
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
  }, [gestureUnlocked, shouldRun, ensureSounds]);

  useEffect(() => {
    return () => {
      const s = soundsRef.current;
      if (!s) return;
      s.rainLoop.stop();
      s.jazzLoop.stop();
    };
  }, []);
}
