import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniGameProps } from './miniGameTypes';

export interface Basket {
  centerX: number;
  halfWidth: number;
}

export function isCaught(itemCenterX: number, basket: Basket): boolean {
  return (
    itemCenterX >= basket.centerX - basket.halfWidth &&
    itemCenterX <= basket.centerX + basket.halfWidth
  );
}

const ITEMS = [
  { id: 'coat', emoji: '🧥', delay: 0 },
  { id: 'cane', emoji: '🪄', delay: 2500 },
  { id: 'hat', emoji: '🎩', delay: 5000 },
  { id: 'poodle', emoji: '🐩', delay: 8000 },
] as const;

type ItemId = (typeof ITEMS)[number]['id'];

const BASKET_HALF_W = 50;
const FALL_DURATION = 2000;

type Playfield = {
  w: number;
  h: number;
  spawn: Record<ItemId, number>;
};

export function CoatCheckGame({ onWin, onLose, durationMs }: MiniGameProps) {
  const { t } = useTranslation('game');
  const [playfield, setPlayfield] = useState<Playfield | null>(null);
  const [caughtIds, setCaughtIds] = useState<Set<ItemId>>(() => new Set());
  const [missedIds, setMissedIds] = useState<Set<ItemId>>(() => new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const playfieldRectRef = useRef<DOMRect | null>(null);
  const basketElRef = useRef<HTMLDivElement>(null);
  const basketXRef = useRef(200);
  const resolvedRef = useRef(false);
  const caughtIdsRef = useRef(caughtIds);
  caughtIdsRef.current = caughtIds;

  void durationMs;

  const resolve = useCallback(
    (outcome: 'WIN' | 'LOSE') => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      if (outcome === 'WIN') onWin();
      else onLose();
    },
    [onWin, onLose],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = (width: number, height: number) => {
      if (width < 80 || height < 120) return;
      setPlayfield(prev => {
        if (prev) return prev;
        const min = BASKET_HALF_W;
        const max = width - BASKET_HALF_W;
        if (max <= min) return prev;
        const spawn = Object.fromEntries(
          ITEMS.map((item) => [item.id, min + Math.random() * (max - min)]),
        ) as Record<ItemId, number>;
        const cx = width / 2;
        basketXRef.current = cx;
        return { w: width, h: height, spawn };
      });
    };

    const syncPlayfieldRect = () => {
      const node = containerRef.current;
      if (node) playfieldRectRef.current = node.getBoundingClientRect();
    };

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      apply(width, height);
      syncPlayfieldRect();
    });
    ro.observe(el);
    apply(el.getBoundingClientRect().width, el.getBoundingClientRect().height);
    syncPlayfieldRect();

    return () => ro.disconnect();
  }, []);

  const moveBasketToClientX = useCallback((clientX: number) => {
    const rect = playfieldRectRef.current;
    const pf = playfield;
    const basket = basketElRef.current;
    if (!rect || !pf || !basket) return;
    const max = pf.w - BASKET_HALF_W;
    const x = Math.max(BASKET_HALF_W, Math.min(max, clientX - rect.left));
    basketXRef.current = x;
    basket.style.transform = `translate3d(${x - BASKET_HALF_W}px, 0, 0)`;
  }, [playfield]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!playfield) return;
      moveBasketToClientX(e.clientX);
    },
    [playfield, moveBasketToClientX],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!playfield) return;
      playfieldRectRef.current = e.currentTarget.getBoundingClientRect();
      moveBasketToClientX(e.clientX);
    },
    [playfield, moveBasketToClientX],
  );

  useEffect(() => {
    if (!playfield) return;
    const { spawn } = playfield;
    const timeoutIds: number[] = [];

    ITEMS.forEach(item => {
      const spawnX = spawn[item.id];
      const startId = window.setTimeout(() => {
        const checkId = window.setTimeout(() => {
          if (resolvedRef.current) return;
          if (caughtIdsRef.current.has(item.id)) return;
          const caught = isCaught(spawnX, {
            centerX: basketXRef.current,
            halfWidth: BASKET_HALF_W,
          });
          if (caught) {
            setCaughtIds(prev => {
              const next = new Set(prev);
              next.add(item.id);
              if (next.size === ITEMS.length) resolve('WIN');
              return next;
            });
          } else {
            setMissedIds(prev => {
              const next = new Set(prev);
              next.add(item.id);
              return next;
            });
            resolve('LOSE');
          }
        }, FALL_DURATION + 100);
        timeoutIds.push(checkId);
      }, item.delay);
      timeoutIds.push(startId);
    });

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [playfield, resolve]);

  const ph = playfield?.h ?? 300;
  const pw = playfield?.w ?? 400;
  const fallAnimId = `coatCheckFall_${Math.round(pw)}_${Math.round(ph)}`;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden rounded-xl bg-black/40"
        style={{
          cursor: 'none',
          minHeight: '12rem',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {!playfield ? (
          <div
            className="flex h-full min-h-[12rem] items-center justify-center text-xs text-white/30"
            aria-hidden
          >
            &nbsp;
          </div>
        ) : (
          <>
            {ITEMS.map(item => {
              const caught = caughtIds.has(item.id);
              const missed = missedIds.has(item.id);
              const spawnX = playfield.spawn[item.id];

              return (
                <div
                  key={item.id}
                  className="absolute text-3xl"
                  style={{
                    left: spawnX,
                    top: caught ? ph - 60 : missed ? ph + 10 : 0,
                    transform: 'translateX(-50%)',
                    animation:
                      !caught && !missed
                        ? `${fallAnimId} ${FALL_DURATION}ms linear ${item.delay}ms both`
                        : 'none',
                    opacity: caught ? 0.4 : missed ? 0 : 1,
                    transition: caught ? 'opacity 0.3s' : 'none',
                  }}
                >
                  {item.emoji}
                </div>
              );
            })}

            <div
              ref={basketElRef}
              className="absolute bottom-4 left-0 flex h-8 items-center justify-center rounded-lg border-2 border-[#e8c97a] bg-[#e8c97a22] will-change-transform"
              style={{
                width: BASKET_HALF_W * 2,
                transform: `translate3d(${basketXRef.current - BASKET_HALF_W}px, 0, 0)`,
              }}
            >
              <span className="text-xs tracking-widest text-[#e8c97a]">🧺</span>
            </div>

            <div className="absolute right-3 top-2 text-xs text-white/30">
              {caughtIds.size} / {ITEMS.length}
            </div>

            <p className="absolute left-3 top-2 text-xs uppercase tracking-widest text-white/30">
              {t('boss.coatCheck.instruction')}
            </p>

            <style>{`
              @keyframes ${fallAnimId} {
                from { transform: translate(-50%, 0); }
                to { transform: translate(-50%, ${ph}px); }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}
