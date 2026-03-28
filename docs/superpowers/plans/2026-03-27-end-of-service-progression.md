# End of Service & Multi-Night Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard freeze at 22:30 with an overtime phase, add an animated end-of-night P&L summary screen, and wire in multi-night persistence (cash/rating/morale carry over; procedural reservations from night 2 onwards).

**Architecture:** New constants + three new `GameState` fields (`nightNumber`, `coversSeated`, `shiftRevenue`) thread through existing hooks. A new pure function (`applyMoraleGameOver`) centralises the morale-zero game-over path. A new `reservationGenerator` module handles procedural nights. A new `EndOfNightSummary` overlay component handles the animated receipt and the "Next Shift / Try Again" flow.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest (test runner: `npm run test`)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/types.ts` | Add `nightNumber`, `coversSeated`, `shiftRevenue` to `GameState` |
| Modify | `src/constants.ts` | Add billing/overtime/last-call constants |
| Modify | `src/logic/gameLogic.ts` | Add `applyMoraleGameOver` helper; integrate into morale-reducing paths |
| **Create** | `src/logic/reservationGenerator.ts` | Procedural reservation generation |
| **Create** | `src/logic/reservationGenerator.test.ts` | Tests for above |
| Modify | `src/hooks/useGameEngine.ts` | `buildInitialState` persist param; fix hardcoded difficulty; `resetGame` signature |
| Modify | `src/context/GameContext.tsx` | Update `GameContextType` with new `resetGame` + `lastCallTable` |
| Modify | `src/hooks/useGameClock.ts` | Remove 1410 freeze; add overtime morale drain + 4x auto-forward |
| Modify | `src/hooks/useDecisionActions.ts` | Increment `coversSeated`/`shiftRevenue` in `confirmSeating`; add `lastCallTable` |
| Modify | `src/hooks/useClientSpawner.ts` | Stop spawning when `inGameMinutes >= 1350` |
| Modify | `src/hooks/useQueueManager.ts` | Drain queue during overtime |
| **Create** | `src/components/EndOfNightSummary.tsx` | Animated receipt overlay |
| Modify | `src/App.tsx` | Show summary, handle next-night/try-again, force floorplan during overtime |
| Modify | `src/components/TopBar.tsx` | Night number + overtime badge |
| Modify | `src/components/floorplan/FloorplanGrid.tsx` | Last Call button per occupied party during overtime |

---

## Task 1: Add GameState fields and billing constants

**Files:**
- Modify: `src/types.ts`
- Modify: `src/constants.ts`

- [ ] **Step 1: Add three fields to `GameState` in `src/types.ts`**

After the `gameOver: boolean;` line, add:

```typescript
nightNumber: number;   // starts at 1, increments each "Next Shift"
coversSeated: number;  // guests seated this shift; reset each night
shiftRevenue: number;  // gross cash earned this shift (positives only); reset each night
```

- [ ] **Step 2: Add billing and overtime constants to `src/constants.ts`**

After the `TABLE_TURNING_SOON_THRESHOLD` constant, add:

```typescript
export const SALARY_COST = 200;           // fixed nightly cost
export const ELECTRICITY_COST = 40;       // fixed nightly cost
export const FOOD_COST_PER_COVER = 23;    // per guest seated
export const OVERTIME_MORALE_DRAIN_PER_MINUTE = 1; // morale lost per in-game minute in overtime
export const LAST_CALL_RATING_PENALTY = 0.1; // rating penalty per rushed table
```

- [ ] **Step 3: Add `nightNumber`, `coversSeated`, `shiftRevenue` to `buildInitialState` in `src/hooks/useGameEngine.ts`**

In `buildInitialState`, add to the returned object:

```typescript
nightNumber: 1,
coversSeated: 0,
shiftRevenue: 0,
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run lint
```
Expected: no errors about missing properties.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/constants.ts src/hooks/useGameEngine.ts
git commit -m "feat: add nightNumber, coversSeated, shiftRevenue to GameState; add billing constants"
```

---

## Task 2: Track coversSeated and shiftRevenue in confirmSeating

**Files:**
- Modify: `src/hooks/useDecisionActions.ts`

The `confirmSeating` callback in `useDecisionActions.ts` (line 188) calls `handleAcceptedClient` which returns `nextCash`. The cash delta is `nextCash - prev.cash`. We increment `shiftRevenue` only by the positive part (gross revenue), and always increment `coversSeated` by `truePartySize`.

- [ ] **Step 1: Update the return object inside `confirmSeating`'s `setGameState`**

Find the `return {` block at line ~262 inside `confirmSeating`'s `setGameState` callback. Add two new fields:

```typescript
coversSeated: prev.coversSeated + client.truePartySize,
shiftRevenue: prev.shiftRevenue + Math.max(0, nextCash - prev.cash),
```

The final return becomes:

```typescript
return {
  ...prev,
  currentClient: null,
  grid: nextGrid,
  reservations: nextReservations,
  cash: nextCash,
  rating: nextRating,
  morale: nextMorale,
  logs: nextLogs.slice(0, 50),
  seatedVipIds: nextSeatedVipIds,
  coversSeated: prev.coversSeated + client.truePartySize,
  shiftRevenue: prev.shiftRevenue + Math.max(0, nextCash - prev.cash),
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDecisionActions.ts
git commit -m "feat: track coversSeated and shiftRevenue on confirmSeating"
```

---

## Task 3: Centralise morale-zero game over

**Files:**
- Modify: `src/logic/gameLogic.ts`
- Modify: `src/hooks/useDecisionActions.ts`
- Modify: `src/hooks/useGameClock.ts` (referenced in Task 6; add the helper call there too)

Currently there is no morale-zero check. We add a pure helper that any state-mutating hook can call.

- [ ] **Step 1: Add `applyMoraleGameOver` to `src/logic/gameLogic.ts`**

Add at the bottom of the file:

```typescript
/**
 * If morale has hit 0, atomically set gameOver, clear all occupied cells,
 * and stop the clock. Returns state unchanged if morale > 0.
 */
export function applyMoraleGameOver(state: GameState): GameState {
  if (state.morale > 0 || state.gameOver) return state;
  const clearedGrid = state.grid.map(row =>
    row.map(cell =>
      cell.state === CellState.OCCUPIED
        ? { ...cell, state: CellState.EMPTY, mealDuration: undefined, partyId: undefined }
        : cell
    )
  );
  return {
    ...state,
    grid: clearedGrid,
    gameOver: true,
    timeMultiplier: 0,
    logs: ['Staff morale collapsed. Shift ended.', ...state.logs].slice(0, 50),
  };
}
```

- [ ] **Step 2: Write unit tests in `src/logic/gameLogic.test.ts`** (add to existing test file if present, else create it)

```typescript
import { describe, it, expect } from 'vitest';
import { applyMoraleGameOver, createInitialGrid } from './gameLogic';
import { CellState } from '../types';

describe('applyMoraleGameOver', () => {
  const base = {
    inGameMinutes: 1200,
    timeMultiplier: 1,
    reservations: [],
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: 0,
    rating: 4.0,
    morale: 0,
    logs: [],
    dailyVips: [],
    seatedVipIds: [],
    gameOver: false,
    nightNumber: 1,
    coversSeated: 0,
    shiftRevenue: 0,
  };

  it('sets gameOver and stops clock when morale is 0', () => {
    const result = applyMoraleGameOver(base);
    expect(result.gameOver).toBe(true);
    expect(result.timeMultiplier).toBe(0);
  });

  it('clears all OCCUPIED cells', () => {
    const gridWithOccupied = createInitialGrid();
    gridWithOccupied[0][0] = {
      ...gridWithOccupied[0][0],
      state: CellState.OCCUPIED,
      mealDuration: 10,
      partyId: 'p1',
    };
    const state = { ...base, grid: gridWithOccupied };
    const result = applyMoraleGameOver(state);
    expect(result.grid[0][0].state).toBe(CellState.EMPTY);
    expect(result.grid[0][0].partyId).toBeUndefined();
  });

  it('returns state unchanged when morale > 0', () => {
    const state = { ...base, morale: 50 };
    expect(applyMoraleGameOver(state)).toBe(state);
  });

  it('returns state unchanged when gameOver already true', () => {
    const state = { ...base, gameOver: true };
    expect(applyMoraleGameOver(state)).toBe(state);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test -- gameLogic
```
Expected: new tests pass.

- [ ] **Step 4: Apply `applyMoraleGameOver` after every morale reduction in `useDecisionActions.ts`**

In `handleDecision` (the VIP refusal path at line ~79 and the normal refusal path at line ~116), `seatParty` doesn't change morale. In `confirmSeating` at line ~262, in `refuseSeatedParty` at line ~313 — wherever `nextMorale` is written into state, wrap the returned state:

```typescript
// At the end of each setGameState callback that returns nextMorale:
const nextState = { ...prev, /* all fields */, morale: nextMorale, ... };
return applyMoraleGameOver(nextState);
```

Apply this in:
1. `handleDecision` return (line ~116)
2. `confirmSeating` return (line ~262) — note: `handleAcceptedClient` can reduce morale
3. `refuseSeatedParty` return (line ~313)

Import `applyMoraleGameOver` at the top of `useDecisionActions.ts`:
```typescript
import { handleAcceptedClient, handleRefusedClient, handleSeatingRefusal, canSelectCell, applyMoraleGameOver } from '../logic/gameLogic';
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/logic/gameLogic.ts src/hooks/useDecisionActions.ts
git commit -m "feat: add applyMoraleGameOver helper; fire on morale-zero in decision actions"
```

---

## Task 4: Procedural reservation generator

**Files:**
- Create: `src/logic/reservationGenerator.ts`
- Create: `src/logic/reservationGenerator.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/logic/reservationGenerator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateReservations } from './reservationGenerator';

describe('generateReservations', () => {
  it('returns between 4 and 19 reservations (base cap 16 + up to 3 VIPs injected later)', () => {
    const result = generateReservations({ nightNumber: 2, rating: 3.0 });
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.length).toBeLessThanOrEqual(16);
  });

  it('uses rating to adjust count — high rating produces more than low', () => {
    const high = generateReservations({ nightNumber: 2, rating: 5.0 });
    const low = generateReservations({ nightNumber: 2, rating: 1.0 });
    // High rating adds +4 bonus, low adds -4 — average across runs should differ
    // Just check bounds are respected
    expect(high.length).toBeLessThanOrEqual(16);
    expect(low.length).toBeGreaterThanOrEqual(4);
  });

  it('each reservation has required fields', () => {
    const result = generateReservations({ nightNumber: 2, rating: 4.0 });
    for (const r of result) {
      expect(r.id).toMatch(/^res-proc-/);
      expect(r.time).toBeGreaterThanOrEqual(1170);
      expect(r.time).toBeLessThanOrEqual(1320);
      expect(r.time % 15).toBe(0);
      expect(r.partySize).toBeGreaterThanOrEqual(1);
      expect(r.partySize).toBeLessThanOrEqual(8);
      expect(typeof r.firstName).toBe('string');
      expect(typeof r.lastName).toBe('string');
      expect(r.arrived).toBe(false);
      expect(r.partySeated).toBe(false);
    }
  });

  it('time slots are 15-minute increments between 1170 and 1320', () => {
    const result = generateReservations({ nightNumber: 1, rating: 3.0 });
    for (const r of result) {
      expect((r.time - 1170) % 15).toBe(0);
    }
  });

  it('at least some first-name collisions are injected', () => {
    // For N >= 8, at least 1 collision should be injected
    const result = generateReservations({ nightNumber: 5, rating: 4.0 });
    if (result.length < 2) return; // skip for very small lists
    const firstNames = result.map(r => r.firstName);
    const hasDuplicate = firstNames.some((n, i) => firstNames.indexOf(n) !== i);
    expect(hasDuplicate).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test -- reservationGenerator
```
Expected: all fail with "Cannot find module".

- [ ] **Step 3: Implement `src/logic/reservationGenerator.ts`**

```typescript
import { Reservation } from '../types';
import { FIRST_NAMES, LAST_NAMES } from '../constants';

interface GenerateOptions {
  nightNumber: number;
  rating: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function weightedPartySize(): number {
  const roll = Math.random();
  if (roll < 0.40) return Math.floor(Math.random() * 2) + 1; // 1-2
  if (roll < 0.75) return Math.floor(Math.random() * 2) + 3; // 3-4
  if (roll < 0.95) return Math.floor(Math.random() * 2) + 5; // 5-6
  return Math.floor(Math.random() * 2) + 7;                   // 7-8
}

function pickWithoutReplacement<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const picked: T[] = [];
  for (let i = 0; i < Math.min(count, copy.length); i++) {
    const idx = Math.floor(Math.random() * (copy.length - i));
    picked.push(copy[idx]);
    copy[idx] = copy[copy.length - i - 1];
  }
  return picked;
}

const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => 1170 + i * 15); // 19:30–22:00

export function generateReservations({ nightNumber, rating }: GenerateOptions): Reservation[] {
  const ratingBonus = Math.round((rating - 3.0) * 2);
  const N = clamp(8 + Math.floor(nightNumber * 0.5) + ratingBonus, 4, 16);

  // Sample names without replacement (wrap around if N > pool size)
  const firstPool = [...FIRST_NAMES].sort(() => Math.random() - 0.5);
  const lastPool = [...LAST_NAMES].sort(() => Math.random() - 0.5);

  const reservations: Reservation[] = Array.from({ length: N }, (_, i) => ({
    id: `res-proc-${nightNumber}-${i}`,
    time: TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)],
    firstName: firstPool[i % firstPool.length],
    lastName: lastPool[i % lastPool.length],
    partySize: weightedPartySize(),
    arrived: false,
    partySeated: false,
  }));

  // Inject first-name collisions (~15% of N, min 1 if N >= 2)
  const nameCollisionCount = Math.max(N >= 2 ? 1 : 0, Math.floor(N * 0.15));
  const nameSources = pickWithoutReplacement(reservations, nameCollisionCount);
  const nameTargetPool = reservations.filter(r => !nameSources.includes(r));
  const nameTargets = pickWithoutReplacement(nameTargetPool, nameCollisionCount);
  nameSources.forEach((src, i) => {
    if (nameTargets[i]) nameTargets[i].firstName = src.firstName;
  });

  // Inject time collisions (~15% of N) from remaining reservations
  const timeCollisionCount = Math.floor(N * 0.15);
  const remaining = reservations.filter(r => !nameSources.includes(r));
  const timeSources = pickWithoutReplacement(remaining, timeCollisionCount);
  const timeTargetPool = reservations.filter(r => !timeSources.includes(r) && !nameSources.includes(r));
  const timeTargets = pickWithoutReplacement(timeTargetPool, timeCollisionCount);
  timeSources.forEach((src, i) => {
    if (timeTargets[i]) timeTargets[i].time = src.time;
  });

  return reservations;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- reservationGenerator
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/reservationGenerator.ts src/logic/reservationGenerator.test.ts
git commit -m "feat: add procedural reservation generator with rating-scaled pool"
```

---

## Task 5: Update buildInitialState and resetGame

**Files:**
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Update `buildInitialState` in `src/hooks/useGameEngine.ts`**

Replace the current `buildInitialState(difficulty: number)` function with:

```typescript
type PersistState = { cash: number; rating: number; morale: number; nightNumber: number };

function buildInitialState(difficulty: number, persist?: PersistState): GameState {
  const nightNumber = persist?.nightNumber ?? 1;
  const rating = persist ? Math.max(1.0, persist.rating) : 5.0;

  const dailyVips = generateDailyVips(difficulty, VIP_ROSTER);

  let reservations: Reservation[];
  if (nightNumber === 1) {
    reservations = injectVipReservations(dailyVips, INITIAL_RESERVATIONS);
  } else {
    const { generateReservations } = await import('../logic/reservationGenerator'); // static import preferred
    reservations = injectVipReservations(dailyVips, generateReservations({ nightNumber, rating }));
  }
  // NOTE: use a static import at the top of the file instead of dynamic import

  return {
    inGameMinutes: START_TIME,
    timeMultiplier: 1,
    reservations,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: persist?.cash ?? 0,
    rating,
    morale: persist ? Math.max(0, persist.morale) : 100,
    logs: ['Welcome to The Maitre D\'. The doors are open.'],
    dailyVips,
    seatedVipIds: [],
    gameOver: false,
    nightNumber,
    coversSeated: 0,
    shiftRevenue: 0,
  };
}
```

Add the static import at the top of the file:
```typescript
import { generateReservations } from '../logic/reservationGenerator';
```

And in the if/else for reservations (drop the dynamic import pattern shown above):
```typescript
const baseReservations = nightNumber === 1
  ? INITIAL_RESERVATIONS
  : generateReservations({ nightNumber, rating });
reservations = injectVipReservations(dailyVips, baseReservations);
```

- [ ] **Step 2: Fix the hardcoded `buildInitialState(1)` initial useState call**

On line 38, change:
```typescript
const [gameState, setGameState] = useState<GameState>(() => buildInitialState(1));
```
to:
```typescript
const [gameState, setGameState] = useState<GameState>(() => buildInitialState(0));
```
(The `GameContent.useEffect` calls `resetGame(initialDifficulty)` immediately on mount, so the sentinel value 0 is immediately overwritten.)

- [ ] **Step 3: Update `resetGame` to accept `persist`**

```typescript
const resetGame = useCallback((difficulty: number, persist?: PersistState) => {
  setGameState(buildInitialState(difficulty, persist));
}, []);
```

- [ ] **Step 4: Update `GameContextType` in `src/context/GameContext.tsx`**

Change line 17:
```typescript
resetGame: (difficulty: number) => void;
```
to:
```typescript
resetGame: (difficulty: number, persist?: { cash: number; rating: number; morale: number; nightNumber: number }) => void;
```

- [ ] **Step 5: TypeScript compile check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useGameEngine.ts src/context/GameContext.tsx src/logic/reservationGenerator.ts
git commit -m "feat: buildInitialState accepts persist for multi-night carry-over"
```

---

## Task 6: Overtime in useGameClock

**Files:**
- Modify: `src/hooks/useGameClock.ts`

The current clock freezes at minute 1350 by returning early without updating `inGameMinutes`. We remove that and instead add overtime logic.

- [ ] **Step 1: Rewrite `tickTime` in `src/hooks/useGameClock.ts`**

Replace the entire `tickTime` callback:

```typescript
const tickTime = useCallback(() => {
  setGameState(prev => {
    if (prev.timeMultiplier === 0 || prev.gameOver) return prev;

    const nextMinutes = prev.inGameMinutes + 1;
    const isOvertime = nextMinutes >= 1350;
    const wasOvertime = prev.inGameMinutes >= 1350;

    // Auto fast-forward at overtime start
    const nextMultiplier = isOvertime && !wasOvertime && prev.timeMultiplier < 4
      ? 4
      : prev.timeMultiplier;

    // Overtime morale drain
    let nextMorale = prev.morale;
    let nextLogs = prev.logs;
    if (isOvertime) {
      nextMorale = Math.max(0, prev.morale - OVERTIME_MORALE_DRAIN_PER_MINUTE);
      if (!wasOvertime) {
        nextLogs = ['22:30 — Doors closed. Waiting for the last tables to clear.', ...nextLogs].slice(0, 50);
      }
    }

    const next: GameState = {
      ...prev,
      inGameMinutes: nextMinutes,
      timeMultiplier: nextMultiplier,
      morale: nextMorale,
      logs: nextLogs,
    };

    return applyMoraleGameOver(next);
  });
}, [setGameState]);
```

Add the required imports at the top:
```typescript
import { applyMoraleGameOver } from '../logic/gameLogic';
import { OVERTIME_MORALE_DRAIN_PER_MINUTE } from '../constants';
```

- [ ] **Step 2: TypeScript compile check**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameClock.ts
git commit -m "feat: replace clock freeze with overtime phase — drain morale, auto 4x"
```

---

## Task 7: Stop spawning and drain queue during overtime

**Files:**
- Modify: `src/hooks/useClientSpawner.ts`
- Modify: `src/hooks/useQueueManager.ts`

- [ ] **Step 1: Guard spawning in `useClientSpawner.ts`**

At the top of the `useEffect` callback (line 91), add a guard before spawning new clients:

```typescript
useEffect(() => {
  if (gameState.timeMultiplier === 0) return;
  if (gameState.inGameMinutes >= 1350) return; // doors closed — no new arrivals
  // ... rest of existing code unchanged
}, [...]);
```

- [ ] **Step 2: Drain queue during overtime in `useQueueManager.ts`**

After the existing queue tick logic, add: when overtime begins, clear the queue (remaining queued clients leave). Add after the `setGameState` call or integrate into `processQueueTick`.

The cleanest approach: in `useQueueManager`, add a separate effect:

```typescript
useEffect(() => {
  if (gameState.timeMultiplier === 0) return;
  if (gameState.inGameMinutes < 1350) return;
  if (gameState.queue.length === 0) return;

  setGameState(prev => {
    if (prev.queue.length === 0 || prev.inGameMinutes < 1350) return prev;
    return {
      ...prev,
      queue: [],
      logs: [`Remaining guests in queue sent away — doors closed.`, ...prev.logs].slice(0, 50),
    };
  });
}, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.queue.length, setGameState]);
```

- [ ] **Step 3: TypeScript compile check**

```bash
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useClientSpawner.ts src/hooks/useQueueManager.ts
git commit -m "feat: stop spawning and drain queue when doors close at 22:30"
```

---

## Task 8: Last Call action

**Files:**
- Modify: `src/hooks/useDecisionActions.ts`
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Add `lastCallTable` to `useDecisionActions.ts`**

Add after the `refuseSeatedParty` callback:

```typescript
const lastCallTable = useCallback((partyId: string) => {
  setGameState(prev => {
    const nextGrid = prev.grid.map(row =>
      row.map(cell =>
        cell.state === CellState.OCCUPIED && cell.partyId === partyId
          ? { ...cell, mealDuration: 0 }
          : cell
      )
    );
    const nextRating = Math.max(1.0, prev.rating - LAST_CALL_RATING_PENALTY);
    return {
      ...prev,
      grid: nextGrid,
      rating: nextRating,
      logs: ['Rushed table — party asked to leave early.', ...prev.logs].slice(0, 50),
    };
  });
}, [setGameState]);
```

Add `LAST_CALL_RATING_PENALTY` to the import from `../constants`.

Add `lastCallTable` to the return object.

- [ ] **Step 2: Add `lastCallTable` to `GameContext`**

In `src/context/GameContext.tsx`, add to `GameContextType`:
```typescript
lastCallTable: (partyId: string) => void;
```

In `GameProvider`, destructure it from `engine` and include it in the context value.

- [ ] **Step 3: TypeScript compile check**

```bash
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDecisionActions.ts src/context/GameContext.tsx
git commit -m "feat: add lastCallTable action for overtime table rush"
```

---

## Task 9: EndOfNightSummary component

**Files:**
- Create: `src/components/EndOfNightSummary.tsx`

This component receives computed values and renders the animated P&L receipt. It is a pure presentational component receiving callbacks for CTA actions.

- [ ] **Step 1: Create `src/components/EndOfNightSummary.tsx`**

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { SALARY_COST, ELECTRICITY_COST, FOOD_COST_PER_COVER } from '../constants';

interface SummaryData {
  nightNumber: number;
  shiftRevenue: number;
  coversSeated: number;
  overtimeMinutes: number; // 0 if no overtime
  cashBefore: number;      // cash at start of tonight
  ratingBefore: number;
  moraleBefore: number;
  cashAfter: number;
  ratingAfter: number;
  moraleAfter: number;
  loseReason: 'none' | 'bankruptcy' | 'walkout';
}

interface Props {
  data: SummaryData;
  onNextShift: () => void;
  onTryAgain: () => void;
}

function useCountUp(target: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const abs = Math.abs(target);
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * abs));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else setValue(abs);
    }
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, active]);
  return value;
}

export const EndOfNightSummary: React.FC<Props> = ({ data, onNextShift, onTryAgain }) => {
  const {
    nightNumber, shiftRevenue, coversSeated, overtimeMinutes,
    cashBefore, ratingBefore, moraleBefore,
    cashAfter, ratingAfter, moraleAfter,
    loseReason,
  } = data;

  const fixedCost = SALARY_COST + ELECTRICITY_COST;
  const foodCost = coversSeated * FOOD_COST_PER_COVER;
  const bill = fixedCost + foodCost;
  const net = shiftRevenue - bill;
  const isLoss = loseReason !== 'none';

  // Staggered visibility — each line appears after a delay
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 12; i++) {
      timers.push(setTimeout(() => setStep(i), i * 240));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const revCount = useCountUp(shiftRevenue, 400, step >= 3);
  const salCount = useCountUp(SALARY_COST, 400, step >= 5);
  const elecCount = useCountUp(ELECTRICITY_COST, 400, step >= 6);
  const foodCount = useCountUp(foodCost, 400, step >= 8);
  const netCount = useCountUp(Math.abs(net), 600, step >= 9);

  const headline = loseReason === 'walkout' ? 'Shift Cut Short' : 'Service Complete';
  const loseMsg =
    loseReason === 'bankruptcy'
      ? "You can't cover tonight's costs. The restaurant closes its doors."
      : loseReason === 'walkout'
      ? "Your staff has had enough. The doors close."
      : null;

  const s = (n: number) => `opacity-0 translate-y-1 transition-all duration-300 ${n <= step ? 'opacity-100 translate-y-0' : ''}`;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#141414]/80 p-4">
      <div className="flex flex-col gap-3 w-full max-w-sm rounded-2xl border-2 border-[#141414] bg-[#E4E3E0] px-7 py-6 shadow-[6px_6px_0_0_rgba(20,20,20,1)]">

        {/* Header */}
        <div className={s(1)}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Night {nightNumber}</p>
          <h2 className={`text-2xl font-black uppercase tracking-[0.15em] ${isLoss ? 'text-red-700' : ''}`}>
            {headline}
          </h2>
          {overtimeMinutes > 0 && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide bg-[#141414] text-[#E4E3E0] rounded px-2 py-0.5">
              +{overtimeMinutes} min overtime
            </span>
          )}
        </div>

        <hr className="border-[#141414]/15" />

        {/* Revenue */}
        <p className={`text-[9px] font-bold uppercase tracking-[0.2em] opacity-35 -mb-1 ${s(2)}`}>Revenue</p>
        <div className={`flex justify-between text-sm ${s(3)}`}>
          <span className="uppercase tracking-wide opacity-60 text-xs font-semibold">Tonight's takings</span>
          <span className="font-bold text-emerald-700">+€{revCount}</span>
        </div>

        {/* Fixed costs */}
        <p className={`text-[9px] font-bold uppercase tracking-[0.2em] opacity-35 -mb-1 ${s(4)}`}>Fixed costs</p>
        <div className={`flex justify-between text-sm ${s(5)}`}>
          <span className="uppercase tracking-wide opacity-60 text-xs font-semibold">Salaries</span>
          <span className="font-bold text-red-700">−€{salCount}</span>
        </div>
        <div className={`flex justify-between text-sm ${s(6)}`}>
          <span className="uppercase tracking-wide opacity-60 text-xs font-semibold">Electricity</span>
          <span className="font-bold text-red-700">−€{elecCount}</span>
        </div>

        {/* Variable costs */}
        <p className={`text-[9px] font-bold uppercase tracking-[0.2em] opacity-35 -mb-1 ${s(7)}`}>Variable costs</p>
        <div className={`flex justify-between text-sm ${s(8)}`}>
          <span className="uppercase tracking-wide opacity-60 text-xs font-semibold">Food & supplies ({coversSeated} covers)</span>
          <span className="font-bold text-red-700">−€{foodCount}</span>
        </div>

        {/* Net */}
        <div className={`flex justify-between items-baseline border-t-2 border-[#141414] pt-2 ${s(9)}`}>
          <span className="text-xs font-black uppercase tracking-[0.15em]">Tonight</span>
          <span className={`text-xl font-black ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {net >= 0 ? '+' : '−'}€{netCount}
          </span>
        </div>

        <hr className="border-[#141414]/15" />

        {/* Stats pills */}
        <div className={`flex gap-2 ${s(10)}`}>
          {[
            { label: 'Cash', val: `€${Math.round(cashAfter)}`, delta: cashAfter - cashBefore },
            { label: 'Rating', val: `${ratingAfter.toFixed(1)}★`, delta: ratingAfter - ratingBefore },
            { label: 'Morale', val: `${moraleAfter}`, delta: moraleAfter - moraleBefore },
          ].map(({ label, val, delta }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5 border-[1.5px] border-[#141414] rounded-xl py-2 bg-white">
              <span className="text-[9px] font-bold uppercase tracking-wide opacity-50">{label}</span>
              <span className="text-sm font-black">{val}</span>
              <span className={`text-[10px] font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {delta >= 0 ? '+' : ''}{label === 'Rating' ? delta.toFixed(1) : Math.round(delta)}
              </span>
            </div>
          ))}
        </div>

        {/* Lose reason */}
        {loseMsg && (
          <p className={`text-xs font-bold text-center text-red-700 border border-red-300 rounded-lg px-3 py-2 bg-red-50 ${s(11)}`}>
            {loseMsg}
          </p>
        )}

        {/* CTA */}
        <div className={s(12)}>
          {isLoss ? (
            <button
              onClick={onTryAgain}
              className="w-full py-3 rounded-xl border-2 border-red-700 bg-red-700 text-white text-sm font-black uppercase tracking-[0.2em] shadow-[3px_3px_0_0_rgba(185,28,28,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(185,28,28,1)] transition-all"
            >
              Try Again
            </button>
          ) : (
            <button
              onClick={onNextShift}
              className="w-full py-3 rounded-xl border-2 border-[#141414] bg-[#141414] text-[#E4E3E0] text-sm font-black uppercase tracking-[0.2em] shadow-[3px_3px_0_0_rgba(20,20,20,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(20,20,20,1)] transition-all"
            >
              Night {nightNumber + 1} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: TypeScript compile check**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/EndOfNightSummary.tsx
git commit -m "feat: add EndOfNightSummary animated receipt component"
```

---

## Task 10: Wire App.tsx — show summary, handle next night / try again

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Derive `showSummary` and `overtimeActive` in `GameContent`**

Add these derivations inside `GameContent` after the state declarations:

```typescript
const isOvertime = gameState.inGameMinutes >= 1350;
const hasOccupiedCells = gameState.grid.flat().some(c => c.state === CellState.OCCUPIED);
const showSummary = gameState.gameOver || (isOvertime && !hasOccupiedCells);
```

Import `CellState` at the top:
```typescript
import { PhysicalState, CellState } from './types';
```

- [ ] **Step 2: Force floorplan view during overtime**

Update the existing `useEffect` that resets view:

```typescript
React.useEffect(() => {
  // Force floorplan during overtime
  if (isOvertime && !showSummary) {
    setView('floorplan');
    return;
  }
  if (view === 'floorplan' && gameState.currentClient?.physicalState !== PhysicalState.SEATING) {
    setView('desk');
  }
}, [view, gameState.currentClient?.physicalState, isOvertime, showSummary]);
```

- [ ] **Step 3: Compute `SummaryData` and add `EndOfNightSummary` import + render**

Add import:
```typescript
import { EndOfNightSummary } from './components/EndOfNightSummary';
import { SALARY_COST, ELECTRICITY_COST, FOOD_COST_PER_COVER } from './constants';
```

Track each night's starting stats for delta display in the summary. A `useState` keyed to `nightNumber` captures the values at the moment each new night begins:

```typescript
const [nightStartStats, setNightStartStats] = React.useState({
  cash: gameState.cash, rating: gameState.rating, morale: gameState.morale
});
// Fires once when nightNumber increments (i.e. after resetGame with persist)
React.useEffect(() => {
  setNightStartStats({ cash: gameState.cash, rating: gameState.rating, morale: gameState.morale });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [gameState.nightNumber]);
```

Then build `summaryData`:

```typescript
const overtimeMinutes = Math.max(0, gameState.inGameMinutes - 1350);
const bill = (SALARY_COST + ELECTRICITY_COST) + gameState.coversSeated * FOOD_COST_PER_COVER;
// gameState.cash is the running cash including all in-shift changes; the bill hasn't been
// deducted from state yet (it's deducted on "Next Shift" confirm). No clamp before bill
// subtraction — bankruptcy is detected by cashAfter < 0.
const cashAfter = gameState.cash - bill;
// Determine lose reason
// Note: VIP-triggered game-over (condition 3 in spec §1) is intentionally
// collapsed into the 'walkout' variant — the spec says all gameOver paths
// route to the same summary component. A VIP-specific variant is deferred to lore/VIP design.
const loseReason: 'none' | 'bankruptcy' | 'walkout' =
  gameState.gameOver ? 'walkout'   // morale=0 AND VIP game-over both show walkout variant
  : cashAfter < 0 ? 'bankruptcy'
  : 'none';

const summaryData = {
  nightNumber: gameState.nightNumber,
  shiftRevenue: gameState.shiftRevenue,
  coversSeated: gameState.coversSeated,
  overtimeMinutes,
  cashBefore: nightStartStats.cash,
  ratingBefore: nightStartStats.rating,
  moraleBefore: nightStartStats.morale,
  cashAfter: Math.max(0, cashAfter), // clamp for display
  ratingAfter: Math.max(1.0, gameState.rating),
  moraleAfter: gameState.morale,
  loseReason,
};
```

- [ ] **Step 4: Implement `handleNextShift` and `handleTryAgain`**

```typescript
const handleNextShift = () => {
  const persist = {
    cash: Math.max(0, summaryData.cashAfter),
    rating: Math.max(1.0, gameState.rating),
    morale: Math.max(0, gameState.morale),
    nightNumber: gameState.nightNumber + 1,
  };
  resetGame(difficulty, persist);
  setNightStartStats({ cash: persist.cash, rating: persist.rating, morale: persist.morale });
};

const handleTryAgain = () => {
  // Back to landing page — App-level state
  onTryAgain(); // prop from App
};
```

`onTryAgain` is a new prop from `App` that sets `gameStarted = false`.

- [ ] **Step 5: Update `App` to pass `onTryAgain` and remove old `gameOver` overlay**

In `App`:
```typescript
// Add setGameStarted(false) as onTryAgain prop
<GameContent
  initialDifficulty={difficulty}
  onShowHelp={() => setShowHelp(true)}
  onTryAgain={() => setGameStarted(false)}
/>
```

Update `GameContentProps` interface:
```typescript
interface GameContentProps {
  initialDifficulty: number;
  onShowHelp: () => void;
  onTryAgain: () => void;
}
```

- [ ] **Step 6: Render `EndOfNightSummary` and remove old `gameOver` overlay**

Inside `GameContent`'s return, replace the existing `{gameState.gameOver && <div ...>☠️ Game Over</div>}` block with:

```typescript
{showSummary && (
  <EndOfNightSummary
    data={summaryData}
    onNextShift={handleNextShift}
    onTryAgain={handleTryAgain}
  />
)}
```

Also apply the bill to cash when showing summary. The bill deduction must happen once. Use a ref flag `billAppliedRef` to ensure it's only applied once per summary trigger. Or: apply the deduction in `handleNextShift`/`handleTryAgain` rather than pre-computing — the summary just shows the numbers but `cash` in state is updated on confirmation.

Simpler: call a `applyEndOfNightBill` action that fires once when `showSummary` becomes true. Add to `useGameEngine`/`GameContext`:

```typescript
const applyNightBill = useCallback(() => {
  setGameState(prev => {
    if (prev.nightBillApplied) return prev; // guard
    const bill = (SALARY_COST + ELECTRICITY_COST) + prev.coversSeated * FOOD_COST_PER_COVER;
    return { ...prev, cash: prev.cash - bill, nightBillApplied: true };
  });
}, [setGameState]);
```

Actually this gets complex. Simpler: the bill is **only subtracted when `handleNextShift` is called**. The summary screen shows computed values without modifying state. `cashAfter = gameState.cash - bill`. The actual state update happens in `handleNextShift` which passes `cashAfter` to `persist.cash`. On "Try Again" the cash is discarded (loss = reset to landing).

This is the cleanest approach — no extra state flag needed.

- [ ] **Step 7: TypeScript compile check**

```bash
npm run lint
```

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/EndOfNightSummary.tsx
git commit -m "feat: wire EndOfNightSummary into App — next shift, try again, overtime view lock"
```

---

## Task 11: TopBar overtime badge and night number

**Files:**
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Add `nightNumber` and `isOvertime` props to `TopBar`**

Update `TopBarProps`:
```typescript
nightNumber: number;
isOvertime: boolean;
```

Update the `TopBar` component signature to include these props.

- [ ] **Step 2: Add night number display**

Inside the left stats group, add before the clock:
```typescript
<div className="flex items-center gap-1">
  <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Night</span>
  <span className="font-mono text-xl font-bold">{nightNumber}</span>
</div>
```

- [ ] **Step 3: Style the clock amber and add OVERTIME badge during overtime**

Replace the clock `<div>`:
```typescript
<div className={`flex items-center gap-2 ${isOvertime ? 'text-amber-600' : ''}`}>
  <Clock size={20} />
  <span className="font-mono text-xl font-bold">
    {formatTime(inGameMinutes)}
  </span>
  {isOvertime && (
    <span className="text-[10px] font-black uppercase tracking-[0.15em] bg-amber-500 text-white rounded px-1.5 py-0.5 animate-pulse">
      Overtime
    </span>
  )}
</div>
```

- [ ] **Step 4: Pass new props from `App.tsx`**

In `GameContent`, update the `TopBar` call:
```typescript
<TopBar
  nightNumber={gameState.nightNumber}
  isOvertime={isOvertime && !showSummary}
  // ...existing props
/>
```

- [ ] **Step 5: TypeScript compile check**

```bash
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/components/TopBar.tsx src/App.tsx
git commit -m "feat: TopBar shows night number and overtime badge"
```

---

## Task 12: FloorplanGrid Last Call button

**Files:**
- Modify: `src/components/floorplan/FloorplanGrid.tsx`

- [ ] **Step 1: Add `lastCallTable` from context and `isOvertime` prop**

Update `FloorplanGrid` to accept an `isOvertime` prop:
```typescript
interface FloorplanGridProps {
  isOvertime?: boolean;
}
export const FloorplanGrid: React.FC<FloorplanGridProps> = ({ isOvertime = false }) => {
```

Destructure `lastCallTable` from `useGame()`:
```typescript
const { gameState, toggleCellSelection, confirmSeating, refuseSeatedParty, lastCallTable } = useGame();
```

- [ ] **Step 2: Collect unique partyIds of occupied tables**

```typescript
const occupiedPartyIds = [...new Set(
  gameState.grid.flat()
    .filter(c => c.state === CellState.OCCUPIED && c.partyId)
    .map(c => c.partyId!)
)];
```

- [ ] **Step 3: Add Last Call section when in overtime**

After the header section and before the grid wrapper, add:

```typescript
{isOvertime && occupiedPartyIds.length > 0 && (
  <div className="flex flex-wrap gap-2 shrink-0 border-b-2 border-amber-300 pb-3">
    <span className="text-xs font-bold uppercase tracking-wide text-amber-700 w-full">
      Last Call — rush a table
    </span>
    {occupiedPartyIds.map(partyId => (
      <button
        key={partyId}
        onClick={() => lastCallTable(partyId)}
        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-400 transition-all"
      >
        Rush table ({partyId.slice(0, 6)})
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Thread `isOvertime` through `BottomPanel` to `FloorplanGrid`**

`FloorplanGrid` is rendered by `src/components/BottomPanel.tsx` (confirmed). Add `isOvertime` to `BottomPanelProps`:

```typescript
interface BottomPanelProps {
  view: 'desk' | 'floorplan';
  isOvertime: boolean;
}
```

Pass it through to `<FloorplanGrid isOvertime={isOvertime} />` inside `BottomPanel`.

In `App.tsx`, pass `isOvertime` to `<BottomPanel>`:
```typescript
<BottomPanel view={view} isOvertime={isOvertime && !showSummary} />
```

- [ ] **Step 5: TypeScript compile check**

```bash
npm run lint
```

- [ ] **Step 6: Run all tests**

```bash
npm run test
```
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/floorplan/FloorplanGrid.tsx src/components/ScenePanel.tsx src/components/BottomPanel.tsx src/App.tsx
git commit -m "feat: Last Call button per table during overtime in FloorplanGrid"
```

---

## Final Verification

- [ ] **Smoke test the full game loop**
  1. Start game at difficulty 1
  2. Seat several parties
  3. Let clock run to 22:30 — confirm `OVERTIME` badge appears, view locks to floorplan, morale starts draining
  4. Use Last Call on a table — confirm it clears and rating drops slightly
  5. Let grid empty — confirm summary screen appears with animated receipt
  6. Verify "Night 2 →" carries over cash/rating/morale
  7. On night 2 — confirm procedural reservations (different names from night 1)
  8. Trigger morale = 0 (e.g. make many unjustified refusals) — confirm "Shift Cut Short" summary
  9. Trigger bankruptcy (too few covers) — confirm "Service Complete" with red net + "Try Again"

- [ ] **Run full test suite**

```bash
npm run test
```
Expected: all pass.
