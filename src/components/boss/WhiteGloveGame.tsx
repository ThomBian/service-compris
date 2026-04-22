import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniGameProps } from './miniGameTypes';

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

const ARENA_W = 560;
const ARENA_H = 320;
const TARGET_COMBOS = 5;
const POS_TOLERANCE = 8;
const ROT_TOLERANCE = 5;
const ITEM_SIZE = 52;
const KEYBOARD_MOVE_STEP = 14;
const KEYBOARD_ROTATE_STEP = 5;
const TABLE_SLOTS = [
  { x: 98, y: 92 },
  { x: 280, y: 88 },
  { x: 462, y: 92 },
  { x: 186, y: 236 },
  { x: 374, y: 236 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createTableState(centerX: number, centerY: number): TableState {
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
    x: clamp(forkTarget.x + randomInRange(-44, 44), ITEM_SIZE / 2, ARENA_W - ITEM_SIZE / 2),
    y: clamp(forkTarget.y + randomInRange(-34, 34), ITEM_SIZE / 2, ARENA_H - ITEM_SIZE / 2),
    rotation: forkTarget.rotation + randomInRange(-22, 22),
  };
  const knifeStart = {
    x: clamp(knifeTarget.x + randomInRange(-44, 44), ITEM_SIZE / 2, ARENA_W - ITEM_SIZE / 2),
    y: clamp(knifeTarget.y + randomInRange(-34, 34), ITEM_SIZE / 2, ARENA_H - ITEM_SIZE / 2),
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

function nextSelectableItem(current: SelectedItem, tables: TableState[]): SelectedItem {
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

export function WhiteGloveGame({ onWin, onLose }: MiniGameProps) {
  const { t } = useTranslation('game');
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedRef = useRef(false);
  const [tables, setTables] = useState<TableState[]>(() =>
    TABLE_SLOTS.map(slot => createTableState(slot.x, slot.y)),
  );
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ tableIndex: 0, utensil: 'fork' });

  const resolve = useCallback(
    (outcome: 'WIN' | 'LOSE') => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      if (outcome === 'WIN') onWin();
      else onLose();
    },
    [onLose, onWin],
  );

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

  const onArenaKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
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

    setTables(prevTables =>
      prevTables.map((table, index) => {
        if (index !== selectedItem.tableIndex) return table;
        if (selectedItem.utensil === 'fork') {
          if (table.forkSnapped) return table;
          const candidate = {
            x: clamp(table.forkPos.x + deltaX, ITEM_SIZE / 2, ARENA_W - ITEM_SIZE / 2),
            y: clamp(table.forkPos.y + deltaY, ITEM_SIZE / 2, ARENA_H - ITEM_SIZE / 2),
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
          x: clamp(table.knifePos.x + deltaX, ITEM_SIZE / 2, ARENA_W - ITEM_SIZE / 2),
          y: clamp(table.knifePos.y + deltaY, ITEM_SIZE / 2, ARENA_H - ITEM_SIZE / 2),
          rotation: table.knifePos.rotation + deltaRotation,
        };
        const snapped = isSnapped(candidate, table.knifeTarget);
        return {
          ...table,
          knifePos: snapped ? table.knifeTarget : candidate,
          knifeSnapped: snapped,
        };
      }),
    );
  }, [selectedItem, tables]);

  const comboProgress = useMemo(
    () =>
      t('boss.whiteGlove.comboProgress', {
        current: completedCombos,
        target: TARGET_COMBOS,
        defaultValue: `${completedCombos} / ${TARGET_COMBOS}`,
      }),
    [completedCombos, t],
  );

  return (
    <div
      ref={containerRef}
      data-testid="white-glove-arena"
      className="relative mx-auto h-[320px] w-full max-w-[560px] overflow-hidden rounded-xl bg-black/60"
      tabIndex={0}
      onKeyDown={onArenaKeyDown}
    >
      {TABLE_SLOTS.map((slot, index) => (
        <div
          key={`plate-${index}`}
          className="pointer-events-none absolute h-[98px] w-[98px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/12 bg-white/[0.04]"
          style={{ left: slot.x, top: slot.y }}
        />
      ))}

      {tables.map((table, index) => (
        <React.Fragment key={`table-${index}`}>
          <div
            className="pointer-events-none absolute h-[52px] w-[52px] rounded-lg border-2 border-dashed border-[#e8c97a55]"
            style={{
              left: table.forkTarget.x - ITEM_SIZE / 2,
              top: table.forkTarget.y - ITEM_SIZE / 2,
              transform: `rotate(${table.forkTarget.rotation}deg)`,
            }}
          />
          <div
            className="pointer-events-none absolute h-[52px] w-[52px] rounded-lg border-2 border-dashed border-[#e8c97a55]"
            style={{
              left: table.knifeTarget.x - ITEM_SIZE / 2,
              top: table.knifeTarget.y - ITEM_SIZE / 2,
              transform: `rotate(${table.knifeTarget.rotation}deg)`,
            }}
          />
          <button
            type="button"
            data-testid={index === 0 ? 'white-glove-fork' : undefined}
            aria-label={t('boss.whiteGlove.forkLabel', { defaultValue: 'Fork' })}
            className={[
              'pointer-events-none absolute flex h-[52px] w-[52px] items-center justify-center rounded-lg border-2 text-2xl select-none',
              table.forkSnapped
                ? 'border-[#e8c97a] bg-[#e8c97a22]'
                : selectedItem.tableIndex === index && selectedItem.utensil === 'fork'
                  ? 'border-cyan-300 bg-cyan-300/15'
                  : 'border-white/35 bg-white/10',
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
            data-testid={index === 0 ? 'white-glove-knife' : undefined}
            aria-label={t('boss.whiteGlove.knifeLabel', { defaultValue: 'Knife' })}
            className={[
              'pointer-events-none absolute flex h-[52px] w-[52px] items-center justify-center rounded-lg border-2 text-2xl select-none',
              table.knifeSnapped
                ? 'border-[#e8c97a] bg-[#e8c97a22]'
                : selectedItem.tableIndex === index && selectedItem.utensil === 'knife'
                  ? 'border-cyan-300 bg-cyan-300/15'
                  : 'border-white/35 bg-white/10',
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

      <p className="pointer-events-none absolute left-3 top-2 text-xs uppercase tracking-widest text-white/45">
        {t('boss.whiteGlove.alignHint', {
          defaultValue: 'W/A/S/D or arrows move, Q/E rotate, TAB cycles items, 1-5 jumps table.',
        })}
      </p>
      <p className="pointer-events-none absolute right-3 top-2 text-xs uppercase tracking-widest text-white/45">
        {comboProgress}
      </p>
    </div>
  );
}

