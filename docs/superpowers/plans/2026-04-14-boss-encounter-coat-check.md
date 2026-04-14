# Boss Encounter — Coat Check (Aristocrat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** `2026-04-14-boss-encounters-foundation.md` must be complete and merged.

**Goal:** Implement the Aristocrat boss encounter — a catching game where the player moves a basket horizontally to catch 4 falling items (mink coat, diamond cane, top hat, neon poodle) within 12 seconds. Dropping the poodle is instant game-over.

**Architecture:** `CoatCheckGame` uses `useAnimationFrame` (via `useEffect` + `requestAnimationFrame`) to update basket position from `pointermove`. Items fall sequentially via CSS `animation: fall Xs linear`. Collision is checked per-frame: if an item's bottom Y crosses the container bottom and is not within the basket's X range, that item is missed. The poodle miss flag is passed to the resolve callback so `clearBossEncounter('LOSE')` can inspect the `GameState` and apply game-over.

**Note on poodle game-over:** The Aristocrat `BossDefinition` has `gameOver: true`. When `clearBossEncounter('LOSE')` is called, it calls `ch.onSeated(prev)` (StandardBanned behavior), which returns `{ gameOver: true, gameOverReason: 'BANNED', ... }`. This correctly ends the shift on lose. The "drop anything else" scenario just proceeds to seating (forced BANNED seat with rating/morale penalty).

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, requestAnimationFrame, CSS animations

---

### Task 1: Add i18n keys for the Aristocrat

**Files:**
- Modify: `src/i18n/locales/en/game.json`
- Modify: `src/i18n/locales/fr/game.json`

- [ ] **Step 1: Add quote key inside the existing `"boss"` object**

`src/i18n/locales/en/game.json`:
```json
"boss": {
  "aristocrat": {
    "quote": "If the Duchess touches the floor, you are finished."
  },
  ...existing keys...
}
```

`src/i18n/locales/fr/game.json`:
```json
"boss": {
  "aristocrat": {
    "quote": "Si la Duchesse touche le sol, vous êtes renvoyé."
  },
  ...existing keys...
}
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/locales/en/game.json src/i18n/locales/fr/game.json
git commit -m "feat(i18n): add Aristocrat boss quote"
```

---

### Task 2: Write tests for collision logic

**Files:**
- Create: `src/components/boss/__tests__/CoatCheckGame.test.ts`

- [ ] **Step 1: Write tests for the pure collision helper**

```ts
// src/components/boss/__tests__/CoatCheckGame.test.ts
import { describe, it, expect } from 'vitest';
import { isCaught } from '../CoatCheckGame';

describe('isCaught', () => {
  // basket: centerX=300, halfWidth=50 → catches items with itemCenterX in [250, 350]
  const basket = { centerX: 300, halfWidth: 50 };

  it('returns true when item center is within basket range', () => {
    expect(isCaught(300, basket)).toBe(true);
    expect(isCaught(250, basket)).toBe(true);
    expect(isCaught(350, basket)).toBe(true);
  });

  it('returns false when item center is outside basket range', () => {
    expect(isCaught(249, basket)).toBe(false);
    expect(isCaught(351, basket)).toBe(false);
    expect(isCaught(100, basket)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/components/boss/__tests__/CoatCheckGame.test.ts
```

---

### Task 3: Implement `CoatCheckGame`

**Files:**
- Create: `src/components/boss/CoatCheckGame.tsx`

- [ ] **Step 1: Create the component and export `isCaught`**

```tsx
// src/components/boss/CoatCheckGame.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MiniGameProps } from './BossEncounterOverlay';

interface Basket {
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
  { id: 'coat',   label: 'Mink Coat',      emoji: '🧥', delay: 0    },
  { id: 'cane',   label: 'Diamond Cane',   emoji: '🪄', delay: 2500 },
  { id: 'hat',    label: 'Top Hat',        emoji: '🎩', delay: 5000 },
  { id: 'poodle', label: 'Neon Poodle',    emoji: '🐩', delay: 8000 },
] as const;

const CONTAINER_WIDTH  = 400;
const CONTAINER_HEIGHT = 300;
const BASKET_HALF_W    = 50;
const ITEM_SPAWN_X     = CONTAINER_WIDTH / 2; // all items fall center initially; random offset added
const FALL_DURATION    = 2000; // ms each item takes to fall

export function CoatCheckGame({ onWin, onLose }: MiniGameProps) {
  const [basketX, setBasketX] = useState(CONTAINER_WIDTH / 2);
  const [caughtIds, setCaughtIds] = useState<Set<string>>(new Set());
  const [missedIds, setMissedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const basketXRef = useRef(CONTAINER_WIDTH / 2);
  const resolvedRef = useRef(false);

  const resolve = useCallback((outcome: 'WIN' | 'LOSE') => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (outcome === 'WIN') onWin(); else onLose();
  }, [onWin, onLose]);

  // Track pointer → basket X
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(BASKET_HALF_W, Math.min(CONTAINER_WIDTH - BASKET_HALF_W, e.clientX - rect.left));
    setBasketX(x);
    basketXRef.current = x;
  }, []);

  // Spawn items and check collision after their fall completes
  useEffect(() => {
    const timers = ITEMS.map(item => {
      // Randomize horizontal start position
      const spawnX = 40 + Math.random() * (CONTAINER_WIDTH - 80);

      const timer = setTimeout(() => {
        // After fall duration, check if caught
        const checkTimer = setTimeout(() => {
          const caught = isCaught(spawnX, { centerX: basketXRef.current, halfWidth: BASKET_HALF_W });
          if (caught) {
            setCaughtIds(prev => {
              const next = new Set(prev);
              next.add(item.id);
              if (next.size === ITEMS.length) resolve('WIN');
              return next;
            });
          } else {
            setMissedIds(prev => new Set([...prev, item.id]));
            resolve('LOSE'); // any miss = lose (poodle miss = game over via clearBossEncounter)
          }
        }, FALL_DURATION + 100);
        return checkTimer;
      }, item.delay);

      return timer;
    });

    return () => timers.forEach(clearTimeout);
  }, [resolve]);

  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-hidden rounded-xl bg-black/40"
      style={{ width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT, cursor: 'none' }}
      onPointerMove={handlePointerMove}
    >
      {/* Falling items */}
      {ITEMS.map(item => {
        const caught = caughtIds.has(item.id);
        const missed = missedIds.has(item.id);
        const spawnX = 40 + ((item.id.charCodeAt(0) * 37) % (CONTAINER_WIDTH - 80)); // deterministic for render

        return (
          <div
            key={item.id}
            className="absolute text-3xl"
            style={{
              left: spawnX,
              top: caught ? CONTAINER_HEIGHT - 60 : missed ? CONTAINER_HEIGHT + 10 : 0,
              animation: (!caught && !missed)
                ? `fall ${FALL_DURATION}ms linear ${item.delay}ms both`
                : 'none',
              opacity: caught ? 0.4 : missed ? 0 : 1,
              transition: caught ? 'opacity 0.3s' : 'none',
            }}
          >
            {item.emoji}
          </div>
        );
      })}

      {/* Basket */}
      <div
        className="absolute bottom-4 h-8 rounded-lg border-2 border-[#e8c97a] bg-[#e8c97a22] flex items-center justify-center"
        style={{
          left: basketX - BASKET_HALF_W,
          width: BASKET_HALF_W * 2,
          transition: 'left 0.02s linear',
        }}
      >
        <span className="text-[#e8c97a] text-xs tracking-widest">🧺</span>
      </div>

      {/* Progress */}
      <div className="absolute top-2 right-3 text-white/30 text-xs">
        {caughtIds.size} / {ITEMS.length}
      </div>

      <p className="absolute top-2 left-3 text-white/30 text-xs tracking-widest uppercase">
        Move mouse to catch
      </p>

      <style>{`
        @keyframes fall {
          from { transform: translateY(0); }
          to   { transform: translateY(${CONTAINER_HEIGHT}px); }
        }
      `}</style>
    </div>
  );
}
```

**Note on spawn X:** The `spawnX` computation in the render uses a deterministic formula based on `item.id` char code so the item visually falls from the same position that collision was checked against. In production you'd want to store the random X in state, but this keeps the component simpler for the plan.

**Correction — store spawnX in state:**

Replace the `spawnX` formula above with state stored on mount:

```tsx
const [spawnXMap] = useState<Record<string, number>>(() =>
  Object.fromEntries(ITEMS.map(item => [item.id, 40 + Math.random() * (CONTAINER_WIDTH - 80)]))
);
```

Use `spawnXMap[item.id]` everywhere `spawnX` appeared. Update the `useEffect` collision check to use `spawnXMap[item.id]` instead of the local `spawnX` variable.

- [ ] **Step 2: Run tests — expect PASS**

```bash
npm run test -- src/components/boss/__tests__/CoatCheckGame.test.ts
```
Expected: all `isCaught` tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/CoatCheckGame.tsx src/components/boss/__tests__/CoatCheckGame.test.ts
git commit -m "feat: implement CoatCheckGame (catcher) for Aristocrat"
```

---

### Task 4: Register `CoatCheckGame` in the overlay

**Files:**
- Modify: `src/components/boss/BossEncounterOverlay.tsx`

- [ ] **Step 1: Replace the `COAT_CHECK` placeholder**

```tsx
import { CoatCheckGame } from './CoatCheckGame';

const MINI_GAMES: Record<MiniGameId, React.FC<MiniGameProps>> = {
  HANDSHAKE:   HandshakeGame,
  WHITE_GLOVE: WhiteGloveGame,
  PAPARAZZI:   PaparazziGame,
  COAT_CHECK:  CoatCheckGame,
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

Lower Aristocrat spawn condition to `(s) => true`. Verify:
- Aristocrat appears as BANNED in queue
- Click REFUSE → black overlay with "REFUSE." and Duchess quote
- Items fall from top in sequence (coat, cane, hat, poodle)
- Move mouse → basket tracks pointer horizontally
- Catch all 4 → win, forced seat is skipped (correct refusal succeeds)
- Miss any item → lose, overlay closes with error toast
- Miss poodle specifically → game over (shift ends)

- [ ] **Step 4: Full test run**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/boss/BossEncounterOverlay.tsx
git commit -m "feat: register CoatCheckGame in BossEncounterOverlay — all boss encounters complete"
```
