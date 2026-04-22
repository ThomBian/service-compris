import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniGameProps } from './miniGameTypes';

type Viewfinder = {
  id: string;
  x: number;
  y: number;
  isGreen: boolean;
  isBlinking?: boolean;
};

const TARGET_GOOD_TAPS = 8;
const SPAWN_INTERVAL_MS = 600;
const MAX_GREEN_CONCURRENT = 6;
const GREEN_RATIO = 0.6;
const GREEN_ACTIVE_MS = 2000;
const GREEN_BLINK_MS = 500;
const SPAWN_PADDING_PERCENT = 22;

function makeViewfinder(): Viewfinder {
  const spawnRange = 100 - SPAWN_PADDING_PERCENT * 2;
  return {
    id: Math.random().toString(36).slice(2),
    x: SPAWN_PADDING_PERCENT + Math.random() * spawnRange,
    y: SPAWN_PADDING_PERCENT + Math.random() * spawnRange,
    isGreen: Math.random() <= GREEN_RATIO,
  };
}

export function PaparazziGame({ onWin, onLose }: MiniGameProps) {
  const { t } = useTranslation('game');
  const [viewfinders, setViewfinders] = useState<Viewfinder[]>([]);
  const [goodTaps, setGoodTaps] = useState(0);

  const resolvedRef = useRef(false);
  const viewfindersRef = useRef<Viewfinder[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const blinkTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const resolve = useCallback(
    (outcome: 'WIN' | 'LOSE') => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      if (outcome === 'WIN') onWin();
      else onLose();
    },
    [onWin, onLose],
  );

  const clearTimer = useCallback((id: string) => {
    const timerId = timersRef.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const clearBlinkTimer = useCallback((id: string) => {
    const timerId = blinkTimersRef.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      blinkTimersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    viewfindersRef.current = viewfinders;
  }, [viewfinders]);

  useEffect(() => {
    return () => {
      for (const timerId of timersRef.current.values()) {
        clearTimeout(timerId);
      }
      for (const timerId of blinkTimersRef.current.values()) {
        clearTimeout(timerId);
      }
      timersRef.current.clear();
      blinkTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (resolvedRef.current) return;

      const activeGreenCount = viewfindersRef.current.filter(v => v.isGreen).length;
      const spawned = makeViewfinder();
      if (spawned.isGreen && activeGreenCount >= MAX_GREEN_CONCURRENT) return;
      const nextViewfinders = [...viewfindersRef.current, spawned];
      viewfindersRef.current = nextViewfinders;
      setViewfinders(nextViewfinders);

      if (spawned.isGreen) {
        const blinkTimeoutId = setTimeout(() => {
          blinkTimersRef.current.delete(spawned!.id);
          setViewfinders(prev => {
            const next = prev.map(v => (v.id === spawned.id ? { ...v, isBlinking: true } : v));
            viewfindersRef.current = next;
            return next;
          });
        }, GREEN_ACTIVE_MS);
        blinkTimersRef.current.set(spawned.id, blinkTimeoutId);

        const expireTimeoutId = setTimeout(() => {
          timersRef.current.delete(spawned.id);
          setViewfinders(prev => {
            const existing = prev.find(v => v.id === spawned.id);
            if (!existing) return prev;
            resolve('LOSE');
            const next = prev.filter(v => v.id !== spawned.id);
            viewfindersRef.current = next;
            return next;
          });
        }, GREEN_ACTIVE_MS + GREEN_BLINK_MS);
        timersRef.current.set(spawned.id, expireTimeoutId);
      }
    }, SPAWN_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [resolve]);

  const progressLabel = useMemo(
    () =>
      t('boss.paparazzi.progress', {
        current: goodTaps,
        target: TARGET_GOOD_TAPS,
        defaultValue: `${goodTaps} / ${TARGET_GOOD_TAPS}`,
      }),
    [goodTaps, t],
  );

  const onTap = useCallback(
    (viewfinder: Viewfinder) => {
      if (resolvedRef.current) return;
      clearTimer(viewfinder.id);
      clearBlinkTimer(viewfinder.id);
      setViewfinders(prev => {
        const next = prev.filter(v => v.id !== viewfinder.id);
        viewfindersRef.current = next;
        return next;
      });
      if (!viewfinder.isGreen) {
        resolve('LOSE');
        return;
      }
      setGoodTaps(prev => {
        const next = prev + 1;
        if (next >= TARGET_GOOD_TAPS) {
          resolve('WIN');
        }
        return next;
      });
    },
    [clearBlinkTimer, clearTimer, resolve],
  );

  return (
    <div
      data-testid="paparazzi-arena"
      className="relative flex h-full min-h-[280px] w-full flex-1 flex-col overflow-hidden rounded-xl bg-black/65"
    >
      <p className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-xs uppercase tracking-[0.22em] text-white/45">
        {t('boss.paparazzi.arenaHint', { defaultValue: 'Only the good angles.' })}
      </p>

      {viewfinders.map(viewfinder => (
        <button
          key={viewfinder.id}
          type="button"
          data-testid={viewfinder.isGreen ? 'viewfinder-green' : 'viewfinder'}
          aria-label={viewfinder.isGreen ? 'Good angle' : 'Bad angle'}
          onClick={() => onTap(viewfinder)}
          className={[
            'absolute flex h-12 w-12 items-center justify-center rounded-full border-4 text-lg',
            'cursor-crosshair transition-transform hover:scale-110',
            'animate-[paparazziPopIn_150ms_ease-out]',
            viewfinder.isBlinking ? 'animate-pulse' : '',
            viewfinder.isGreen
              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
              : 'border-rose-500 bg-rose-500/10 text-rose-300',
          ].join(' ')}
          style={{
            left: `calc(${viewfinder.x}% - 24px)`,
            top: `calc(${viewfinder.y}% - 24px)`,
          }}
        >
          {viewfinder.isGreen ? '📷' : '⛔'}
        </button>
      ))}

      <p className="pointer-events-none absolute bottom-2 right-3 text-xs text-white/45">{progressLabel}</p>

      <style>{`
        @keyframes paparazziPopIn {
          from { transform: scale(0.45); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

