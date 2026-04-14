# Boss Encounter — White Glove (Grand Inquisitor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** `2026-04-14-boss-encounters-foundation.md` must be complete and merged.

**Goal:** Implement the Grand Inquisitor boss encounter — a precision drag-and-drop game where the player must drag a fork and knife into exact dashed outlines (±8px position, ±5° rotation) within 4 seconds.

**Architecture:** `WhiteGloveGame` uses a `useDrag` hook that tracks pointer capture for each utensil. Each utensil has a random start position and rotation. Target zones have dashed CSS outlines. On pointer-up, snap logic checks if the utensil is within tolerance. When both utensils are snapped, `onWin()` is called. Timer expiry → `onLose()`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, Pointer Events API

---

### Task 1: Add i18n keys for the Grand Inquisitor

**Files:**
- Modify: `src/i18n/locales/en/game.json`
- Modify: `src/i18n/locales/fr/game.json`

- [ ] **Step 1: Add quote key inside the existing `"boss"` object**

`src/i18n/locales/en/game.json`:
```json
"boss": {
  "grandInquisitor": {
    "quote": "Mediocrity is an insult to the craft."
  },
  ...existing keys...
}
```

`src/i18n/locales/fr/game.json`:
```json
"boss": {
  "grandInquisitor": {
    "quote": "La médiocrité est une insulte au métier."
  },
  ...existing keys...
}
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/locales/en/game.json src/i18n/locales/fr/game.json
git commit -m "feat(i18n): add Grand Inquisitor boss quote"
```

---

### Task 2: Create `useDrag` hook

**Files:**
- Create: `src/hooks/useDrag.ts`
- Create: `src/hooks/__tests__/useDrag.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/hooks/__tests__/useDrag.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrag } from '../useDrag';

describe('useDrag', () => {
  it('returns initial position unchanged before drag', () => {
    const { result } = renderHook(() =>
      useDrag({ x: 50, y: 50, rotation: 0 })
    );
    expect(result.current.pos.x).toBe(50);
    expect(result.current.pos.y).toBe(50);
    expect(result.current.pos.rotation).toBe(0);
  });

  it('isDragging starts false', () => {
    const { result } = renderHook(() =>
      useDrag({ x: 0, y: 0, rotation: 0 })
    );
    expect(result.current.isDragging).toBe(false);
  });

  it('updates position on move', () => {
    const { result } = renderHook(() =>
      useDrag({ x: 100, y: 100, rotation: 0 })
    );
    // Simulate pointer down then move
    act(() => {
      result.current.handlers.onPointerDown({ clientX: 100, clientY: 100, currentTarget: { setPointerCapture: vi.fn() } } as any);
    });
    act(() => {
      result.current.handlers.onPointerMove({ clientX: 120, clientY: 110 } as any);
    });
    expect(result.current.pos.x).toBe(120);
    expect(result.current.pos.y).toBe(110);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/hooks/__tests__/useDrag.test.ts
```

- [ ] **Step 3: Implement `useDrag`**

```ts
// src/hooks/useDrag.ts
import { useState, useCallback } from 'react';

interface DragPos {
  x: number;
  y: number;
  rotation: number;
}

interface UseDragResult {
  pos: DragPos;
  isDragging: boolean;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
  };
}

export function useDrag(initial: DragPos): UseDragResult {
  const [pos, setPos] = useState<DragPos>(initial);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setPos(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
  }, [isDragging]);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return { pos, isDragging, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- src/hooks/__tests__/useDrag.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDrag.ts src/hooks/__tests__/useDrag.test.ts
git commit -m "feat: add useDrag hook for pointer-capture dragging"
```

---

### Task 3: Write tests for snap logic

**Files:**
- Create: `src/components/boss/__tests__/WhiteGloveGame.test.ts`

- [ ] **Step 1: Write tests for the snap helper (pure function)**

```ts
// src/components/boss/__tests__/WhiteGloveGame.test.ts
import { describe, it, expect } from 'vitest';
import { isSnapped } from '../WhiteGloveGame';

describe('isSnapped', () => {
  const target = { x: 200, y: 300, rotation: 0 };

  it('returns true when within position and rotation tolerance', () => {
    expect(isSnapped({ x: 204, y: 296, rotation: 3 }, target)).toBe(true);
  });

  it('returns false when position is too far', () => {
    expect(isSnapped({ x: 220, y: 300, rotation: 0 }, target)).toBe(false);
  });

  it('returns false when rotation is too far', () => {
    expect(isSnapped({ x: 200, y: 300, rotation: 10 }, target)).toBe(false);
  });

  it('is exact on boundary', () => {
    expect(isSnapped({ x: 208, y: 308, rotation: 5 }, target)).toBe(true);
    expect(isSnapped({ x: 209, y: 300, rotation: 0 }, target)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/components/boss/__tests__/WhiteGloveGame.test.ts
```

---

### Task 4: Implement `WhiteGloveGame`

**Files:**
- Create: `src/components/boss/WhiteGloveGame.tsx`

- [ ] **Step 1: Create the component and export `isSnapped`**

```tsx
// src/components/boss/WhiteGloveGame.tsx
import React, { useState, useCallback } from 'react';
import type { MiniGameProps } from './BossEncounterOverlay';
import { useDrag } from '../../hooks/useDrag';

interface SnapTarget {
  x: number;
  y: number;
  rotation: number;
}

const POS_TOLERANCE = 8;  // px
const ROT_TOLERANCE = 5;  // degrees

export function isSnapped(
  pos: { x: number; y: number; rotation: number },
  target: SnapTarget,
): boolean {
  return (
    Math.abs(pos.x - target.x) <= POS_TOLERANCE &&
    Math.abs(pos.y - target.y) <= POS_TOLERANCE &&
    Math.abs(pos.rotation - target.rotation) <= ROT_TOLERANCE
  );
}

// Fixed target positions (center of screen area)
const FORK_TARGET: SnapTarget  = { x: 260, y: 280, rotation: 0 };
const KNIFE_TARGET: SnapTarget = { x: 340, y: 280, rotation: 0 };

export function WhiteGloveGame({ onWin, onLose }: MiniGameProps) {
  const fork  = useDrag({ x: 160, y: 350, rotation: -30 });
  const knife = useDrag({ x: 440, y: 220, rotation: 20 });

  const [forkSnapped,  setForkSnapped]  = useState(false);
  const [knifeSnapped, setKnifeSnapped] = useState(false);

  const checkSnap = useCallback((
    item: 'fork' | 'knife',
    pos: { x: number; y: number; rotation: number },
  ) => {
    const target = item === 'fork' ? FORK_TARGET : KNIFE_TARGET;
    const snapped = isSnapped(pos, target);
    if (item === 'fork')  setForkSnapped(snapped);
    if (item === 'knife') setKnifeSnapped(snapped);

    const otherSnapped = item === 'fork' ? knifeSnapped : forkSnapped;
    if (snapped && otherSnapped) onWin();
  }, [forkSnapped, knifeSnapped, onWin]);

  const renderUtensil = (
    label: string,
    emoji: string,
    drag: ReturnType<typeof useDrag>,
    target: SnapTarget,
    snapped: boolean,
    item: 'fork' | 'knife',
  ) => (
    <div
      {...drag.handlers}
      style={{
        position: 'absolute',
        left: snapped ? target.x - 24 : drag.pos.x - 24,
        top:  snapped ? target.y - 24 : drag.pos.y - 24,
        transform: `rotate(${snapped ? target.rotation : drag.pos.rotation}deg)`,
        cursor: drag.isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: snapped ? 'all 0.15s ease' : 'none',
      }}
      onPointerUp={() => {
        drag.handlers.onPointerUp();
        checkSnap(item, drag.pos);
      }}
      className={[
        'w-12 h-12 rounded-lg text-2xl flex items-center justify-center',
        'border-2 touch-none',
        snapped ? 'border-[#e8c97a] bg-[#e8c97a22]' : 'border-white/30 bg-white/10',
      ].join(' ')}
      title={label}
    >
      {emoji}
    </div>
  );

  return (
    <div className="relative w-full" style={{ height: 320 }}>
      {/* Plate */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      w-32 h-32 rounded-full border-4 border-white/20 bg-white/5" />

      {/* Target outlines */}
      {[FORK_TARGET, KNIFE_TARGET].map((t, i) => (
        <div
          key={i}
          className="absolute w-12 h-12 rounded-lg border-2 border-dashed border-[#e8c97a44]"
          style={{ left: t.x - 24, top: t.y - 24, transform: `rotate(${t.rotation}deg)` }}
        />
      ))}

      {/* Utensils */}
      {renderUtensil('Fork',  '🍴', fork,  FORK_TARGET,  forkSnapped,  'fork')}
      {renderUtensil('Knife', '🔪', knife, KNIFE_TARGET, knifeSnapped, 'knife')}

      <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-widest uppercase">
        Drag to align
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
npm run test -- src/components/boss/__tests__/WhiteGloveGame.test.ts
```
Expected: all `isSnapped` tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/WhiteGloveGame.tsx src/components/boss/__tests__/WhiteGloveGame.test.ts
git commit -m "feat: implement WhiteGloveGame (drag-and-drop) for Grand Inquisitor"
```

---

### Task 5: Register `WhiteGloveGame` in the overlay

**Files:**
- Modify: `src/components/boss/BossEncounterOverlay.tsx`

- [ ] **Step 1: Replace the `WHITE_GLOVE` placeholder**

```tsx
import { WhiteGloveGame } from './WhiteGloveGame';

const MINI_GAMES: Record<MiniGameId, React.FC<MiniGameProps>> = {
  HANDSHAKE:   HandshakeGame,
  WHITE_GLOVE: WhiteGloveGame,
  PAPARAZZI:   ({ onWin, onLose }) => ( /* placeholder */ ),
  COAT_CHECK:  ({ onWin, onLose }) => ( /* placeholder */ ),
};
```

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Lower Grand Inquisitor spawn condition temporarily: `(s) => s.rating >= 0`. Verify:
- Inquisitor appears in queue as BANNED character
- Click REFUSE → full-screen black overlay, "REFUSE." command
- Fork and knife appear draggable at haphazard positions
- Dashed outlines show target positions
- Drag both into position → overlay closes with success toast
- Timer expires → overlay closes with fail toast, rating penalty

- [ ] **Step 4: Commit**

```bash
git add src/components/boss/BossEncounterOverlay.tsx
git commit -m "feat: register WhiteGloveGame in BossEncounterOverlay"
```
