import { useCallback, useEffect, useRef, useState } from 'react';
import { useTypewriter } from './useTypewriter';
import {
  playOdometerClick,
  playLedgerDing,
  playPaperSwish,
  playDialogueTypewriterClick,
} from '@/src/audio/gameSfx';

export type CarouselStep = 'newspaper' | 'ledger' | 'memo' | 'final';

export interface UseCarouselSummaryResult {
  step: CarouselStep;
  isRevealing: boolean;
  canAdvance: boolean;
  headlineDisplayed: string;
  memoDisplayed: string;
  revealedLines: number;
  advance: () => void;
}

export function useCarouselSummary(
  headline: string,
  memoText: string,
  ledgerRowCount: number,
): UseCarouselSummaryResult {
  const [step, setStep] = useState<CarouselStep>('newspaper');
  const [revealedLines, setRevealedLines] = useState(0);
  const revealedLinesRef = useRef(0);
  const ledgerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const clearLedgerInterval = useCallback(() => {
    if (ledgerIntervalRef.current !== null) {
      clearInterval(ledgerIntervalRef.current);
      ledgerIntervalRef.current = null;
    }
  }, []);

  const headlineTw = useTypewriter(
    step === 'newspaper' ? headline : '',
    35,
    playDialogueTypewriterClick,
    8,
  );

  const memoTw = useTypewriter(
    step === 'memo' ? memoText : '',
    40,
    playDialogueTypewriterClick,
    8,
  );

  useEffect(() => {
    if (step !== 'ledger') return;
    clearLedgerInterval();
    setRevealedLines(0);
    revealedLinesRef.current = 0;
    ledgerIntervalRef.current = setInterval(() => {
      const prev = revealedLinesRef.current;
      if (prev >= ledgerRowCount) {
        clearLedgerInterval();
        return;
      }
      const next = prev + 1;
      revealedLinesRef.current = next;
      setRevealedLines(next);
      if (next < ledgerRowCount) {
        playOdometerClick();
      } else {
        playLedgerDing();
        clearLedgerInterval();
      }
    }, 300);
    return clearLedgerInterval;
  }, [step, ledgerRowCount, clearLedgerInterval]);

  const isRevealing =
    (step === 'newspaper' && !headlineTw.done) ||
    (step === 'ledger' && revealedLines < ledgerRowCount) ||
    (step === 'memo' && !memoTw.done);

  const advance = useCallback(() => {
    if (step === 'newspaper' && !headlineTw.done) {
      headlineTw.skipToEnd();
      return;
    }
    if (step === 'ledger' && revealedLines < ledgerRowCount) {
      clearLedgerInterval();
      revealedLinesRef.current = ledgerRowCount;
      setRevealedLines(ledgerRowCount);
      playLedgerDing();
      return;
    }
    if (step === 'memo' && !memoTw.done) {
      memoTw.skipToEnd();
      return;
    }
    if (step === 'final') return;
    playPaperSwish();
    setStep((s) => {
      if (s === 'newspaper') return 'ledger';
      if (s === 'ledger') return 'memo';
      if (s === 'memo') return 'final';
      return s;
    });
  }, [
    step,
    headlineTw,
    memoTw,
    revealedLines,
    ledgerRowCount,
    clearLedgerInterval,
  ]);

  return {
    step,
    isRevealing,
    canAdvance: !isRevealing,
    headlineDisplayed: headlineTw.displayed,
    memoDisplayed: memoTw.displayed,
    revealedLines,
    advance,
  };
}
