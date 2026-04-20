import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, HeartCrack } from 'lucide-react';
import { playCoatParrySfx, playToastSound } from '../../audio/gameSfx';
import { PixelAvatar } from '../scene/PixelAvatar';
import type { MiniGameProps } from './miniGameTypes';

const EMOJIS = ['🧥', '🪄', '🎩', '🐩', '🪭', '📇', '💎', '👜'] as const;

const DUCHESS_STRIP_H = 88;
const PARRY_RADIUS = 38;
const MISS_LIMIT = 3;
const SPAWN_MS_MIN = 420;
const SPAWN_MS_MAX = 680;
const DUCHESS_SPEED = 0.0022;
const DUCHESS_MARGIN = 44;
const BOTTOM_MISS_PAD = 52;
const PROJ_SPAWN_BELOW_STRIP = 28;

/** Hit test for parry: circle around projectile center (playfield px). */
export function pointInParryHitbox(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

type Projectile = {
  id: string;
  x: number;
  y: number;
  vy: number;
  emoji: string;
  active: boolean;
};

type Playfield = { w: number; h: number };

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `p-${idCounter}`;
}

function LifeHearts({
  misses,
  label,
}: {
  misses: number;
  label: string;
}) {
  const remaining = MISS_LIMIT - misses;
  return (
    <div className="flex items-center gap-1" role="img" aria-label={label}>
      {Array.from({ length: MISS_LIMIT }, (_, i) => {
        const alive = i < remaining;
        return (
          <motion.div
            key={`heart-${i}-${alive ? '1' : '0'}`}
            layout="position"
            initial={alive ? { scale: 1, opacity: 1 } : { opacity: 0, scale: 0.65, filter: 'blur(4px)' }}
            animate={
              alive
                ? { scale: 1, opacity: 1, filter: 'blur(0px)' }
                : { scale: 1, opacity: 1, filter: 'blur(0px)' }
            }
            transition={{ duration: alive ? 0.28 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {alive ? (
              <Heart
                className="h-6 w-6 fill-rose-500 text-rose-200 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                strokeWidth={1.5}
                aria-hidden
              />
            ) : (
              <HeartCrack
                className="h-6 w-6 text-white/38"
                strokeWidth={1.75}
                aria-hidden
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export function CoatCheckGame({ onWin, onLose, durationMs, bossVisualTraits }: MiniGameProps) {
  const { t } = useTranslation('game');
  const [playfield, setPlayfield] = useState<Playfield | null>(null);
  const [duchessX, setDuchessX] = useState(0);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [misses, setMisses] = useState(0);
  const [strikeSerial, setStrikeSerial] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedRef = useRef(false);
  const missesRef = useRef(0);
  const projectilesRef = useRef<Projectile[]>([]);
  const nextSpawnAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const playfieldRef = useRef<Playfield | null>(null);

  const resolve = useCallback(
    (outcome: 'WIN' | 'LOSE') => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (outcome === 'WIN') onWin();
      else onLose();
    },
    [onWin, onLose],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = (width: number, height: number) => {
      if (width < 80 || height < 160) return;
      setPlayfield(prev => {
        if (prev) return prev;
        return { w: width, h: height };
      });
    };

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      apply(width, height);
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    apply(r.width, r.height);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    playfieldRef.current = playfield;
    if (playfield) {
      missesRef.current = 0;
      setMisses(0);
      setStrikeSerial(0);
      setDuchessX(playfield.w / 2);
      nextSpawnAtRef.current = 0;
      elapsedRef.current = 0;
      projectilesRef.current = [];
      setProjectiles([]);
    }
  }, [playfield]);

  useEffect(() => {
    if (!playfield) return;

    let last = performance.now();
    missesRef.current = 0;

    const dangerY = playfield.h - BOTTOM_MISS_PAD;

    const tick = (now: number) => {
      if (resolvedRef.current) return;

      const dt = Math.min(48, now - last);
      last = now;

      const pf = playfieldRef.current;
      if (!pf) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      elapsedRef.current += dt;
      const elapsed = elapsedRef.current;

      const usable = Math.max(0, pf.w - 2 * DUCHESS_MARGIN);
      const duchessCenterX = DUCHESS_MARGIN + usable * (0.5 + 0.5 * Math.sin(elapsed * DUCHESS_SPEED));

      let list = projectilesRef.current.map(p => {
        if (!p.active) return p;
        const ny = p.y + p.vy * (dt / 1000);
        return { ...p, y: ny };
      });

      let newMisses = missesRef.current;
      list = list.map(p => {
        if (!p.active) return p;
        if (p.y >= dangerY) {
          newMisses += 1;
          return { ...p, active: false };
        }
        return p;
      });

      if (newMisses > missesRef.current) {
        const heartsLost = newMisses - missesRef.current;
        missesRef.current = newMisses;
        setMisses(newMisses);
        setStrikeSerial(s => s + 1);
        for (let i = 0; i < heartsLost; i += 1) {
          window.setTimeout(() => playToastSound('error'), i * 140);
        }
        if (newMisses >= MISS_LIMIT) {
          projectilesRef.current = list;
          setProjectiles(list);
          setDuchessX(duchessCenterX);
          resolve('LOSE');
          return;
        }
      }

      if (elapsed < durationMs && nextSpawnAtRef.current <= elapsed) {
        const jitter = SPAWN_MS_MIN + Math.random() * (SPAWN_MS_MAX - SPAWN_MS_MIN);
        nextSpawnAtRef.current = elapsed + jitter;
        const ox = (Math.random() - 0.5) * 56;
        const spawnX = Math.min(
          pf.w - 24,
          Math.max(24, duchessCenterX + ox),
        );
        const vy = 150 + Math.random() * 120;
        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!;
        const proj: Projectile = {
          id: nextId(),
          x: spawnX,
          y: DUCHESS_STRIP_H + PROJ_SPAWN_BELOW_STRIP,
          vy,
          emoji,
          active: true,
        };
        list = [...list, proj];
      }

      projectilesRef.current = list;
      setProjectiles(list);
      setDuchessX(duchessCenterX);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playfield, durationMs, resolve]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (resolvedRef.current || !playfieldRef.current) return;
      e.currentTarget.setPointerCapture(e.pointerId);

      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const list = projectilesRef.current;
      let best: Projectile | null = null;
      let bestY = -1;
      for (const p of list) {
        if (!p.active) continue;
        if (!pointInParryHitbox(px, py, p.x, p.y, PARRY_RADIUS)) continue;
        if (p.y > bestY) {
          bestY = p.y;
          best = p;
        }
      }

      if (!best) return;

      const next = list.map(p => (p.id === best!.id ? { ...p, active: false } : p));
      projectilesRef.current = next;
      setProjectiles(next);

      playCoatParrySfx();
    },
    [],
  );

  const h = playfield?.h ?? 500;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden rounded-xl bg-black/40"
        style={{ cursor: 'crosshair', minHeight: '12rem' }}
        onPointerDown={handlePointerDown}
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
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
              <div
                className="pointer-events-none absolute left-0 right-0 top-0 border-b border-white/10 bg-black/30"
                style={{ height: DUCHESS_STRIP_H }}
              >
                <div
                  className="pointer-events-none absolute bottom-2 flex flex-col items-center"
                  style={{ left: duchessX, transform: 'translateX(-50%)', willChange: 'left' }}
                >
                  {bossVisualTraits ? (
                    <PixelAvatar traits={bossVisualTraits} scale={2} />
                  ) : (
                    <div className="h-12 w-10 rounded-md border border-white/20 bg-white/5" aria-hidden />
                  )}
                </div>
              </div>

              <div
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-red-500/35"
                style={{ top: h - BOTTOM_MISS_PAD }}
                aria-hidden
              />

              {projectiles.map(p => {
                if (!p.active) return null;
                return (
                  <div
                    key={p.id}
                    className="pointer-events-none absolute text-3xl leading-none"
                    style={{
                      left: p.x,
                      top: p.y,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {p.emoji}
                  </div>
                );
              })}

              <p
                className="pointer-events-none absolute left-3 max-w-[85%] text-xs uppercase leading-snug tracking-widest text-white/40"
                style={{ top: DUCHESS_STRIP_H + 10 }}
              >
                {t('boss.coatCheck.instruction')}
              </p>

              <div
                className="pointer-events-none absolute right-3 flex items-center"
                style={{ top: DUCHESS_STRIP_H + 6 }}
              >
                <LifeHearts
                  misses={misses}
                  label={t('boss.coatCheck.livesAria', {
                    remaining: MISS_LIMIT - misses,
                    lost: misses,
                    max: MISS_LIMIT,
                  })}
                />
              </div>
            </div>

            <AnimatePresence>
              {strikeSerial > 0 ? (
                <motion.div
                  key={strikeSerial}
                  className="pointer-events-none absolute inset-0 z-40 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.42, 0.28, 0] }}
                  transition={{ duration: 1.05, times: [0, 0.22, 0.5, 1], ease: 'easeInOut' }}
                  exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
                  style={{
                    background:
                      'radial-gradient(ellipse 130% 85% at 50% 100%, rgba(69, 10, 10, 0.55) 0%, rgba(30, 10, 12, 0.28) 45%, transparent 68%)',
                  }}
                />
              ) : null}
            </AnimatePresence>

          </>
        )}
      </div>
    </div>
  );
}
