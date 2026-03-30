import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_STEP_MS = 8;

function delayUntilNextReveal(
  previousChar: string | null,
  charDelay: number,
  jitterMs: number,
): number {
  let d = charDelay;
  if (jitterMs > 0) {
    const j = Math.floor(Math.random() * (2 * jitterMs + 1)) - jitterMs;
    d = Math.max(MIN_STEP_MS, charDelay + j);
    if (previousChar !== null) {
      if ('.!?'.includes(previousChar)) {
        d += 40 + Math.floor(Math.random() * 70);
      } else if (',;:'.includes(previousChar)) {
        d += 14 + Math.floor(Math.random() * 28);
      }
    }
  }
  return d;
}

export interface UseTypewriterResult {
  displayed: string;
  done: boolean;
  /** Instantly show the full string and mark done (no-op if already done or text empty). */
  skipToEnd: () => void;
}

export function useTypewriter(
  text: string,
  charDelay = 40,
  onChar?: () => void,
  /** Randomizes gaps between characters; `0` keeps a fixed cadence (e.g. tests). */
  jitterMs = 0,
  /** Fires once when a new non-empty string starts typing (before the first character). */
  onTypingStart?: () => void,
): UseTypewriterResult {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const onCharRef = useRef(onChar);
  onCharRef.current = onChar;
  const onTypingStartRef = useRef(onTypingStart);
  onTypingStartRef.current = onTypingStart;

  const skipImplRef = useRef<() => void>(() => {});
  const skipToEnd = useCallback(() => {
    skipImplRef.current();
  }, []);

  useEffect(() => {
    if (text.length === 0) {
      skipImplRef.current = () => {};
      setDisplayed('');
      setDone(true);
      return;
    }

    setDisplayed('');
    setDone(false);

    onTypingStartRef.current?.();

    let index = 0;
    let timeoutId = 0;
    const fullText = text;

    const flushSkip = () => {
      window.clearTimeout(timeoutId);
      setDisplayed(fullText);
      setDone(true);
    };
    skipImplRef.current = flushSkip;

    const step = () => {
      index += 1;
      setDisplayed(text.slice(0, index));
      onCharRef.current?.();
      if (index >= text.length) {
        setDone(true);
        skipImplRef.current = () => {};
        return;
      }
      const prev = text[index - 1] ?? null;
      const wait = delayUntilNextReveal(prev, charDelay, jitterMs);
      timeoutId = window.setTimeout(step, wait);
    };

    timeoutId = window.setTimeout(step, delayUntilNextReveal(null, charDelay, jitterMs));

    return () => {
      skipImplRef.current = () => {};
      window.clearTimeout(timeoutId);
    };
  }, [text, charDelay, jitterMs]);

  return { displayed, done, skipToEnd };
}
