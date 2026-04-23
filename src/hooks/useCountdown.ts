import { useState, useEffect, useRef } from 'react';

const TICK_MS = 16;

/**
 * Returns a progress value from 1.0 → 0.0 over durationMs.
 * Calls onExpire once when it hits 0.
 */
export function useCountdown(durationMs: number, onExpire?: () => void) {
  const [progress, setProgress] = useState(1);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
    if (durationMs <= 0) {
      setProgress(1);
      return;
    }
    setProgress(1);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += TICK_MS;
      const next = Math.max(0, 1 - elapsed / durationMs);
      setProgress(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [durationMs]);

  return { progress };
}
