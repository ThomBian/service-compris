// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WhiteGloveGame,
  createTableState,
  isSnapped,
  nextSelectableItem,
  slotCentersForBounds,
} from '../WhiteGloveGame';

describe('isSnapped', () => {
  const target = { x: 200, y: 300, rotation: 0 };

  it('returns true within tolerance', () => {
    expect(isSnapped({ x: 204, y: 296, rotation: 3 }, target)).toBe(true);
  });

  it('returns false when too far in position', () => {
    expect(isSnapped({ x: 220, y: 300, rotation: 0 }, target)).toBe(false);
  });

  it('returns false when too far in rotation', () => {
    expect(isSnapped({ x: 200, y: 300, rotation: 10 }, target)).toBe(false);
  });

  it('is exact on boundary', () => {
    expect(isSnapped({ x: 208, y: 308, rotation: 5 }, target)).toBe(true);
  });
});

describe('slotCentersForBounds', () => {
  it('returns five centers inside the arena', () => {
    const w = 400;
    const h = 300;
    const slots = slotCentersForBounds(w, h);
    expect(slots).toHaveLength(5);
    for (const { x, y } of slots) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(w);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(h);
    }
  });
});

describe('createTableState', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps fork and knife transforms inside the arena (half item margin)', () => {
    const aw = 320;
    const ah = 240;
    const half = 26;
    const t = createTableState(160, 120, aw, ah);
    for (const pos of [t.forkPos, t.knifePos, t.forkTarget, t.knifeTarget]) {
      expect(pos.x).toBeGreaterThanOrEqual(half);
      expect(pos.x).toBeLessThanOrEqual(aw - half);
      expect(pos.y).toBeGreaterThanOrEqual(half);
      expect(pos.y).toBeLessThanOrEqual(ah - half);
    }
  });
});

describe('nextSelectableItem', () => {
  const baseTable = {
    forkPos: { x: 0, y: 0, rotation: 0 },
    knifePos: { x: 0, y: 0, rotation: 0 },
    forkTarget: { x: 0, y: 0, rotation: 0 },
    knifeTarget: { x: 0, y: 0, rotation: 0 },
    forkSnapped: false,
    knifeSnapped: false,
  };

  it('advances Tab order to the next unsnapped utensil', () => {
    const tables = [
      { ...baseTable, forkSnapped: true, knifeSnapped: false },
      { ...baseTable, forkSnapped: false, knifeSnapped: false },
    ];
    const next = nextSelectableItem({ tableIndex: 0, utensil: 'fork' }, tables);
    expect(next).toEqual({ tableIndex: 0, utensil: 'knife' });
  });

  it('wraps to another table when current table is fully snapped', () => {
    const tables = [
      { ...baseTable, forkSnapped: true, knifeSnapped: true },
      { ...baseTable, forkSnapped: false, knifeSnapped: false },
    ];
    const next = nextSelectableItem({ tableIndex: 0, utensil: 'knife' }, tables);
    expect(next).toEqual({ tableIndex: 1, utensil: 'fork' });
  });

  it('returns current when every utensil is snapped', () => {
    const tables = [
      { ...baseTable, forkSnapped: true, knifeSnapped: true },
      { ...baseTable, forkSnapped: true, knifeSnapped: true },
    ];
    const cur = { tableIndex: 0, utensil: 'fork' as const };
    expect(nextSelectableItem(cur, tables)).toEqual(cur);
  });
});

describe('WhiteGloveGame', () => {
  beforeEach(() => {
    globalThis.ResizeObserver =
      globalThis.ResizeObserver ||
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  });

  it('renders arena and utensils for all five tables', () => {
    render(React.createElement(WhiteGloveGame, { onWin: () => {}, onLose: () => {}, durationMs: 20_000 }));
    expect(screen.getByTestId('white-glove-arena')).toBeTruthy();
    for (let i = 0; i < 5; i += 1) {
      expect(screen.getByTestId(`white-glove-fork-${i}`)).toBeTruthy();
      expect(screen.getByTestId(`white-glove-knife-${i}`)).toBeTruthy();
    }
  });

  it('moves selected fork with arrow keys within arena', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    render(React.createElement(WhiteGloveGame, { onWin: () => {}, onLose: () => {}, durationMs: 20_000 }));
    const arena = screen.getByTestId('white-glove-arena');
    arena.focus();

    const fork0 = screen.getByTestId('white-glove-fork-0');
    const leftBefore = fork0.style.left;

    fireEvent.keyDown(arena, { key: 'ArrowRight' });
    const leftAfter = fork0.style.left;
    expect(leftAfter).not.toBe(leftBefore);

    for (let i = 0; i < 200; i += 1) {
      fireEvent.keyDown(arena, { key: 'ArrowRight' });
    }
    const forkRect = fork0.getBoundingClientRect();
    const arenaRect = arena.getBoundingClientRect();
    expect(forkRect.right).toBeLessThanOrEqual(arenaRect.right + 2);
  });

  it('Tab cycles selection to next unsnapped item', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    render(React.createElement(WhiteGloveGame, { onWin: () => {}, onLose: () => {}, durationMs: 20_000 }));
    const arena = screen.getByTestId('white-glove-arena');
    arena.focus();

    const fork0 = screen.getByTestId('white-glove-fork-0');
    const knife0 = screen.getByTestId('white-glove-knife-0');
    expect(fork0.getAttribute('data-boss-selected')).toBe('true');
    expect(knife0.getAttribute('data-boss-selected')).toBeNull();

    fireEvent.keyDown(arena, { key: 'Tab' });
    expect(knife0.getAttribute('data-boss-selected')).toBe('true');
  });
});
