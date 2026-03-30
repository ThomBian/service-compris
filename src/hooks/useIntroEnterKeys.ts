import {
  useEffect,
  type Dispatch,
  type SetStateAction,
} from 'react';

/**
 * Enter-to-advance for intro screen 0 (prologue paragraphs).
 */
export function useIntroScreen0Enter(opts: {
  active: boolean;
  screen0LineDone: boolean;
  screen0Para: number;
  setScreen0Para: Dispatch<SetStateAction<number>>;
  setScreen: Dispatch<SetStateAction<number>>;
  skipScreen0Line: () => void;
  startAmbience: () => void;
  lastParaIndex: number;
}): void {
  const {
    active,
    screen0LineDone,
    screen0Para,
    setScreen0Para,
    setScreen,
    skipScreen0Line,
    startAmbience,
    lastParaIndex,
  } = opts;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      startAmbience();
      if (!screen0LineDone) {
        skipScreen0Line();
        return;
      }
      if (screen0Para < lastParaIndex) {
        setScreen0Para((p) => p + 1);
      } else {
        setScreen(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    active,
    screen0LineDone,
    screen0Para,
    lastParaIndex,
    setScreen0Para,
    setScreen,
    skipScreen0Line,
    startAmbience,
  ]);
}

/**
 * Enter-to-advance for intro screen 1 (M. V. line before paperwork).
 */
export function useIntroScreen1Enter(opts: {
  active: boolean;
  screen1ShowPaperwork: boolean;
  screen1MvDone: boolean;
  skipScreen1Mv: () => void;
  setScreen1PaperworkUnlocked: Dispatch<SetStateAction<boolean>>;
  startAmbience: () => void;
}): void {
  const {
    active,
    screen1ShowPaperwork,
    screen1MvDone,
    skipScreen1Mv,
    setScreen1PaperworkUnlocked,
    startAmbience,
  } = opts;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (screen1ShowPaperwork) return;
      e.preventDefault();
      startAmbience();
      if (!screen1MvDone) {
        skipScreen1Mv();
        return;
      }
      setScreen1PaperworkUnlocked(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    active,
    screen1ShowPaperwork,
    screen1MvDone,
    skipScreen1Mv,
    setScreen1PaperworkUnlocked,
    startAmbience,
  ]);
}
