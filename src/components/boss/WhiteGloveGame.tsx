import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniGameProps } from './miniGameTypes';
import {
  playWhiteGloveForkSnapSfx,
  playWhiteGloveKnifeSnapSfx,
  playWhiteGloveSettingCompleteSfx,
  playWhiteGloveWinRoundSfx,
} from '../../audio/gameSfx';
import {
  bossArenaFocusRing,
  bossArenaSurface,
  bossHudEyebrow,
  bossTargetGhost,
  bossUtensilIdle,
  bossUtensilSelected,
  bossUtensilSnapped,
} from './bossMiniGameChrome';

type Transform = {
  x: number;
  y: number;
  rotation: number;
};

type TableState = {
  forkPos: Transform;
  knifePos: Transform;
  forkTarget: Transform;
  knifeTarget: Transform;
  forkSnapped: boolean;
  knifeSnapped: boolean;
};

type SelectedItem = {
  tableIndex: number;
  utensil: 'fork' | 'knife';
};

/** Normalized plate centers (0–1) so layout scales with measured arena. */
export const TABLE_SLOT_FRACS = [
  { fx: 98 / 560, fy: 92 / 320 },
  { fx: 280 / 560, fy: 88 / 320 },
  { fx: 462 / 560, fy: 92 / 320 },
  { fx: 186 / 560, fy: 236 / 320 },
  { fx: 374 / 560, fy: 236 / 320 },
] as const;

const TARGET_COMBOS = 5;
const POS_TOLERANCE = 8;
const ROT_TOLERANCE = 5;
const ITEM_SIZE = 52;
const KEYBOARD_MOVE_STEP = 14;
const KEYBOARD_ROTATE_STEP = 5;
const DEFAULT_ARENA_W = 560;
const DEFAULT_ARENA_H = 320;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Pixel centers for the five tables from current arena size. */
export function slotCentersForBounds(arenaW: number, arenaH: number): { x: number; y: number }[] {
  return TABLE_SLOT_FRACS.map(({ fx, fy }) => ({
    x: fx * arenaW,
    y: fy * arenaH,
  }));
}

export function createTableState(
  centerX: number,
  centerY: number,
  arenaW: number,
  arenaH: number,
): TableState {
  const half = ITEM_SIZE / 2;
  const forkTarget = {
    x: centerX - 26 + randomInRange(-8, 8),
    y: centerY + randomInRange(-16, 16),
    rotation: randomInRange(-12, 12),
  };
  const knifeTarget = {
    x: centerX + 26 + randomInRange(-8, 8),
    y: centerY + randomInRange(-16, 16),
    rotation: randomInRange(-12, 12),
  };
  const forkStart = {
    x: clamp(forkTarget.x + randomInRange(-44, 44), half, arenaW - half),
    y: clamp(forkTarget.y + randomInRange(-34, 34), half, arenaH - half),
    rotation: forkTarget.rotation + randomInRange(-22, 22),
  };
  const knifeStart = {
    x: clamp(knifeTarget.x + randomInRange(-44, 44), half, arenaW - half),
    y: clamp(knifeTarget.y + randomInRange(-34, 34), half, arenaH - half),
    rotation: knifeTarget.rotation + randomInRange(-22, 22),
  };
  return {
    forkPos: forkStart,
    knifePos: knifeStart,
    forkTarget,
    knifeTarget,
    forkSnapped: false,
    knifeSnapped: false,
  };
}

function scaleTransform(t: Transform, scaleX: number, scaleY: number, arenaW: number, arenaH: number): Transform {
  const half = ITEM_SIZE / 2;
  return {
    x: clamp(t.x * scaleX, half, arenaW - half),
    y: clamp(t.y * scaleY, half, arenaH - half),
    rotation: t.rotation,
  };
}

function scaleTableState(table: TableState, scaleX: number, scaleY: number, arenaW: number, arenaH: number): TableState {
  return {
    forkPos: scaleTransform(table.forkPos, scaleX, scaleY, arenaW, arenaH),
    knifePos: scaleTransform(table.knifePos, scaleX, scaleY, arenaW, arenaH),
    forkTarget: scaleTransform(table.forkTarget, scaleX, scaleY, arenaW, arenaH),
    knifeTarget: scaleTransform(table.knifeTarget, scaleX, scaleY, arenaW, arenaH),
    forkSnapped: table.forkSnapped,
    knifeSnapped: table.knifeSnapped,
  };
}

export function nextSelectableItem(current: SelectedItem, tables: TableState[]): SelectedItem {
  const flatItems = tables.flatMap((table, index) => [
    { tableIndex: index, utensil: 'fork' as const, snapped: table.forkSnapped },
    { tableIndex: index, utensil: 'knife' as const, snapped: table.knifeSnapped },
  ]);
  const currentIndex = flatItems.findIndex(
    item => item.tableIndex === current.tableIndex && item.utensil === current.utensil,
  );
  for (let step = 1; step <= flatItems.length; step += 1) {
    const next = flatItems[(currentIndex + step) % flatItems.length];
    if (!next.snapped) return { tableIndex: next.tableIndex, utensil: next.utensil };
  }
  return current;
}

export function isSnapped(current: Transform, target: Transform): boolean {
  return (
    Math.abs(current.x - target.x) <= POS_TOLERANCE &&
    Math.abs(current.y - target.y) <= POS_TOLERANCE &&
    Math.abs(current.rotation - target.rotation) <= ROT_TOLERANCE
  );
}

function buildInitialTables(arenaW: number, arenaH: number): TableState[] {
  return slotCentersForBounds(arenaW, arenaH).map(({ x, y }) => createTableState(x, y, arenaW, arenaH));
}

export function WhiteGloveGame({ onWin, onLose, durationMs: _durationMs }: MiniGameProps) {
  const { t } = useTranslation('game');
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedRef = useRef(false);
  const lastBoundsRef = useRef<{ w: number; h: number }>({ w: DEFAULT_ARENA_W, h: DEFAULT_ARENA_H });
  const [arenaBounds, setArenaBounds] = useState({ w: DEFAULT_ARENA_W, h: DEFAULT_ARENA_H });
  const [tables, setTables] = useState<TableState[]>(() => buildInitialTables(DEFAULT_ARENA_W, DEFAULT_ARENA_H));
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ tableIndex: 0, utensil: 'fork' });

  const resolve = useCallback(
    (outcome: 'WIN' | 'LOSE') => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      if (outcome === 'WIN') {
        playWhiteGloveWinRoundSfx();
        onWin();
      } else {
        onLose();
      }
    },
    [onLose, onWin],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = (width: number, height: number) => {
      if (width < 120 || height < 120) return;
      const oldBounds = lastBoundsRef.current;
      lastBoundsRef.current = { w: width, h: height };
      setArenaBounds({ w: width, h: height });
      setTables(prevTables => {
        if (prevTables.length === 0) return buildInitialTables(width, height);
        const sx = width / oldBounds.w;
        const sy = height / oldBounds.h;
        if (Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) return prevTables;
        return prevTables.map(table => scaleTableState(table, sx, sy, width, height));
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

  const completedCombos = useMemo(
    () => tables.filter(table => table.forkSnapped && table.knifeSnapped).length,
    [tables],
  );

  React.useEffect(() => {
    if (completedCombos >= TARGET_COMBOS) {
      resolve('WIN');
    }
  }, [completedCombos, resolve]);

  React.useEffect(() => {
    const selectedTable = tables[selectedItem.tableIndex];
    if (!selectedTable) return;
    const selectedSnapped =
      selectedItem.utensil === 'fork' ? selectedTable.forkSnapped : selectedTable.knifeSnapped;
    if (!selectedSnapped) return;
    const next = nextSelectableItem(selectedItem, tables);
    if (next.tableIndex === selectedItem.tableIndex && next.utensil === selectedItem.utensil) return;
    setSelectedItem(next);
  }, [selectedItem, tables]);

  React.useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const { w: ARENA_W, h: ARENA_H } = arenaBounds;

  const onArenaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (resolvedRef.current) return;

      const key = e.key.toLowerCase();
      if (key === 'tab') {
        e.preventDefault();
        setSelectedItem(prev => nextSelectableItem(prev, tables));
        return;
      }
      if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
        const tableIndex = Number(key) - 1;
        if (tableIndex < tables.length) {
          setSelectedItem(prev => ({
            tableIndex,
            utensil:
              prev.tableIndex === tableIndex
                ? prev.utensil === 'fork'
                  ? 'knife'
                  : 'fork'
                : 'fork',
          }));
        }
        return;
      }

      const isMoveKey =
        key === 'w' ||
        key === 'a' ||
        key === 's' ||
        key === 'd' ||
        key === 'arrowup' ||
        key === 'arrowleft' ||
        key === 'arrowdown' ||
        key === 'arrowright';
      const isRotateKey = key === 'q' || key === 'e';
      if (!isMoveKey && !isRotateKey) return;
      e.preventDefault();

      const deltaX =
        key === 'a' || key === 'arrowleft'
          ? -KEYBOARD_MOVE_STEP
          : key === 'd' || key === 'arrowright'
            ? KEYBOARD_MOVE_STEP
            : 0;
      const deltaY =
        key === 'w' || key === 'arrowup'
          ? -KEYBOARD_MOVE_STEP
          : key === 's' || key === 'arrowdown'
            ? KEYBOARD_MOVE_STEP
            : 0;
      const deltaRotation = key === 'q' ? -KEYBOARD_ROTATE_STEP : key === 'e' ? KEYBOARD_ROTATE_STEP : 0;

      const half = ITEM_SIZE / 2;

      setTables(prevTables => {
        const next = prevTables.map((table, index) => {
          if (index !== selectedItem.tableIndex) return table;
          if (selectedItem.utensil === 'fork') {
            if (table.forkSnapped) return table;
            const candidate = {
              x: clamp(table.forkPos.x + deltaX, half, ARENA_W - half),
              y: clamp(table.forkPos.y + deltaY, half, ARENA_H - half),
              rotation: table.forkPos.rotation + deltaRotation,
            };
            const snapped = isSnapped(candidate, table.forkTarget);
            return {
              ...table,
              forkPos: snapped ? table.forkTarget : candidate,
              forkSnapped: snapped,
            };
          }
          if (table.knifeSnapped) return table;
          const candidate = {
            x: clamp(table.knifePos.x + deltaX, half, ARENA_W - half),
            y: clamp(table.knifePos.y + deltaY, half, ARENA_H - half),
            rotation: table.knifePos.rotation + deltaRotation,
          };
          const snapped = isSnapped(candidate, table.knifeTarget);
          return {
            ...table,
            knifePos: snapped ? table.knifeTarget : candidate,
            knifeSnapped: snapped,
          };
        });
        for (let i = 0; i < prevTables.length; i += 1) {
          const prev = prevTables[i];
          const cur = next[i];
          if (!prev || !cur) continue;
          if (!prev.forkSnapped && cur.forkSnapped) {
            playWhiteGloveForkSnapSfx();
          }
          if (!prev.knifeSnapped && cur.knifeSnapped) {
            if (cur.forkSnapped) playWhiteGloveSettingCompleteSfx();
            else playWhiteGloveKnifeSnapSfx();
          }
        }
        return next;
      });
    },
    [ARENA_H, ARENA_W, selectedItem, tables],
  );

  const comboProgress = useMemo(
    () =>
      t('boss.whiteGlove.comboProgress', {
        current: completedCombos,
        target: TARGET_COMBOS,
        defaultValue: `${completedCombos} / ${TARGET_COMBOS}`,
      }),
    [completedCombos, t],
  );

  const slotPixels = useMemo(() => slotCentersForBounds(ARENA_W, ARENA_H), [ARENA_W, ARENA_H]);

  return (
    <div
      ref={containerRef}
      data-testid="white-glove-arena"
      className={`relative mx-auto h-[min(320px,55dvh)] w-full min-h-[240px] max-w-[560px] flex-1 overflow-hidden ${bossArenaSurface} ${bossArenaFocusRing}`}
      style={{ minWidth: 'min(100%, 560px)' }}
      tabIndex={0}
      role="application"
      aria-label={t('boss.whiteGlove.ariaArena')}
      onKeyDown={onArenaKeyDown}
    >
      {slotPixels.map((slot, index) => (
        <div
          key={`plate-${index}`}
          className="pointer-events-none absolute h-[min(98px,28%)] w-[min(98px,28%)] max-h-[110px] max-w-[110px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/12 bg-white/[0.04]"
          style={{ left: slot.x, top: slot.y }}
        />
      ))}

      {tables.map((table, index) => (
        <React.Fragment key={`table-${index}`}>
          <div
            className={`pointer-events-none absolute h-[52px] w-[52px] rounded-lg ${bossTargetGhost}`}
            style={{
              left: table.forkTarget.x - ITEM_SIZE / 2,
              top: table.forkTarget.y - ITEM_SIZE / 2,
              transform: `rotate(${table.forkTarget.rotation}deg)`,
            }}
          />
          <div
            className={`pointer-events-none absolute h-[52px] w-[52px] rounded-lg ${bossTargetGhost}`}
            style={{
              left: table.knifeTarget.x - ITEM_SIZE / 2,
              top: table.knifeTarget.y - ITEM_SIZE / 2,
              transform: `rotate(${table.knifeTarget.rotation}deg)`,
            }}
          />
          <button
            type="button"
            data-testid={`white-glove-fork-${index}`}
            tabIndex={-1}
            aria-label={t('boss.whiteGlove.forkLabel', { defaultValue: 'Fork' })}
            data-boss-selected={
              !table.forkSnapped && selectedItem.tableIndex === index && selectedItem.utensil === 'fork'
                ? 'true'
                : undefined
            }
            className={[
              'pointer-events-none absolute flex h-[52px] w-[52px] items-center justify-center rounded-lg border-2 text-2xl select-none',
              table.forkSnapped ? bossUtensilSnapped : selectedItem.tableIndex === index && selectedItem.utensil === 'fork'
                ? bossUtensilSelected
                : bossUtensilIdle,
            ].join(' ')}
            style={{
              left: table.forkPos.x - ITEM_SIZE / 2,
              top: table.forkPos.y - ITEM_SIZE / 2,
              transform: `rotate(${table.forkPos.rotation}deg)`,
              transition: table.forkSnapped ? 'all 120ms ease-out' : 'none',
            }}
          >
            🍴
          </button>
          <button
            type="button"
            data-testid={`white-glove-knife-${index}`}
            tabIndex={-1}
            aria-label={t('boss.whiteGlove.knifeLabel', { defaultValue: 'Knife' })}
            data-boss-selected={
              !table.knifeSnapped && selectedItem.tableIndex === index && selectedItem.utensil === 'knife'
                ? 'true'
                : undefined
            }
            className={[
              'pointer-events-none absolute flex h-[52px] w-[52px] items-center justify-center rounded-lg border-2 text-2xl select-none',
              table.knifeSnapped ? bossUtensilSnapped : selectedItem.tableIndex === index && selectedItem.utensil === 'knife'
                ? bossUtensilSelected
                : bossUtensilIdle,
            ].join(' ')}
            style={{
              left: table.knifePos.x - ITEM_SIZE / 2,
              top: table.knifePos.y - ITEM_SIZE / 2,
              transform: `rotate(${table.knifePos.rotation}deg)`,
              transition: table.knifeSnapped ? 'all 120ms ease-out' : 'none',
            }}
          >
            🔪
          </button>
        </React.Fragment>
      ))}

      <p className={`absolute left-3 top-2 max-w-[min(100%,18rem)] leading-snug sm:max-w-[60%] ${bossHudEyebrow}`}>
        {t('boss.whiteGlove.alignHint', {
          defaultValue: 'W/A/S/D or arrows move, Q/E rotate, TAB cycles items, 1-5 jumps table.',
        })}
      </p>
      <p className={`absolute right-3 top-2 text-right ${bossHudEyebrow}`}>
        {comboProgress}
      </p>
    </div>
  );
}
