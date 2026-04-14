import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const CONTAINER_WIDTH = 400;
const CONTAINER_HEIGHT = 300;
const BASKET_HALF_W = 50;
const FALL_DURATION = 2000;

export function CoatCheckGame({ onWin, onLose, durationMs }: MiniGameProps) {
  const { t } = useTranslation('game');
  const [basketX, setBasketX] = useState(CONTAINER_WIDTH / 2);
  const [caughtIds, setCaughtIds] = useState<Set<ItemId>>(() => new Set());
  const [missedIds, setMissedIds] = useState<Set<ItemId>>(() => new Set());
  const [spawnXMap] = useState<Record<ItemId, number>>(() =>
    Object.fromEntries(
      ITEMS.map((item) => [
        item.id,
        40 + Math.random() * (CONTAINER_WIDTH - 80),
      ]),
    ) as Record<ItemId, number>,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const basketXRef = useRef(CONTAINER_WIDTH / 2);
  const resolvedRef = useRef(false);

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

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(
      BASKET_HALF_W,
      Math.min(
        CONTAINER_WIDTH - BASKET_HALF_W,
        e.clientX - rect.left,
      ),
    );
    setBasketX(x);
    basketXRef.current = x;
  }, []);

  useEffect(() => {
    const timeoutIds: number[] = [];

    ITEMS.forEach((item) => {
      const spawnX = spawnXMap[item.id];
      const startId = window.setTimeout(() => {
        const checkId = window.setTimeout(() => {
          if (resolvedRef.current) return;
          const caught = isCaught(spawnX, {
            centerX: basketXRef.current,
            halfWidth: BASKET_HALF_W,
          });
          if (caught) {
            setCaughtIds((prev) => {
              const next = new Set(prev);
              next.add(item.id);
              if (next.size === ITEMS.length) resolve('WIN');
              return next;
            });
          } else {
            setMissedIds((prev) => {
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
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [resolve, spawnXMap]);

  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-hidden rounded-xl bg-black/40"
      style={{
        width: CONTAINER_WIDTH,
        height: CONTAINER_HEIGHT,
        cursor: 'none',
      }}
      onPointerMove={handlePointerMove}
    >
      {ITEMS.map((item) => {
        const caught = caughtIds.has(item.id);
        const missed = missedIds.has(item.id);
        const spawnX = spawnXMap[item.id];

        return (
          <div
            key={item.id}
            className="absolute text-3xl"
            style={{
              left: spawnX,
              top: caught ? CONTAINER_HEIGHT - 60 : missed ? CONTAINER_HEIGHT + 10 : 0,
              transform: 'translateX(-50%)',
              animation:
                !caught && !missed
                  ? `coatCheckFall ${FALL_DURATION}ms linear ${item.delay}ms both`
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
        className="absolute bottom-4 flex h-8 items-center justify-center rounded-lg border-2 border-[#e8c97a] bg-[#e8c97a22]"
        style={{
          left: basketX - BASKET_HALF_W,
          width: BASKET_HALF_W * 2,
          transition: 'left 0.02s linear',
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
        @keyframes coatCheckFall {
          from { transform: translate(-50%, 0); }
          to { transform: translate(-50%, ${CONTAINER_HEIGHT}px); }
        }
      `}</style>
    </div>
  );
}
