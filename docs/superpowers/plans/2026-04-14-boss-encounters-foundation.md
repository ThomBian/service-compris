# Boss Encounters — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the boss encounter infrastructure — types, boss roster, spawn conditions, action interception, clock pause, overlay shell with cinematic intro and timer bar.

**Architecture:** `BossDefinition` extends `CharacterDefinition` with a `spawnCondition` and `miniGame` id. When a VIP boss's SEAT or BANNED boss's REFUSE action fires, `useDecisionActions` sets `activeBossEncounter` in `GameState` instead of proceeding. This freezes the clock. `BossEncounterOverlay` renders full-screen; on resolve, `clearBossEncounter('WIN'|'LOSE')` applies consequences and restores the clock. Each mini-game plan registers its component in the MINI_GAMES map.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, i18next

---

### Task 1: Add types to `src/types.ts`

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add new types after the `GameOverReason` type (line 137)**

```ts
// --- Boss Encounters ---

export type MiniGameId = 'HANDSHAKE' | 'WHITE_GLOVE' | 'PAPARAZZI' | 'COAT_CHECK';

export interface BossDefinition extends CharacterDefinition {
  miniGame: MiniGameId;
  /** i18n key in the 'game' namespace — boss taunt shown during intro */
  quoteKey: string;
  spawnCondition: (state: GameState) => boolean;
}

export interface ActiveBossEncounter {
  bossId: string;
  interceptedAction: 'SEAT' | 'REFUSE';
  miniGame: MiniGameId;
  /** Restored when encounter ends so the clock resumes at the same speed */
  previousTimeMultiplier: number;
}
```

- [ ] **Step 2: Add `activeBossEncounter` field to `GameState` (after `nightEndPending` on line 190)**

```ts
/** Non-null while a boss mini-game overlay is active. Pauses the clock. */
activeBossEncounter: ActiveBossEncounter | null;
```

- [ ] **Step 3: Run type-check**

```bash
npm run lint
```
Expected: no new errors (existing test helpers use `as GameState` casts, so missing field is OK).

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add MiniGameId, BossDefinition, ActiveBossEncounter types"
```

---

### Task 2: Create the boss roster

**Files:**
- Create: `src/data/bossRoster.ts`
- Create: `src/logic/__tests__/bossRoster.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/logic/__tests__/bossRoster.test.ts
import { describe, it, expect } from 'vitest';
import { BOSS_ROSTER } from '../../data/bossRoster';
import type { GameState } from '../../types';
import { CellState } from '../../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    inGameMinutes: 1200,
    timeMultiplier: 1,
    difficulty: 1,
    reservations: [],
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: Array(4).fill(null).map((_, y) =>
      Array(4).fill(null).map((_, x) => ({ id: `${x}-${y}`, x, y, state: CellState.EMPTY }))
    ),
    cash: 0,
    rating: 3.0,
    morale: 80,
    logs: [],
    dailyCharacterIds: [],
    seatedCharacterIds: [],
    gameOverCharacterId: null,
    strikeActive: false,
    gameOver: false,
    gameOverReason: null,
    nightNumber: 2,
    coversSeated: 0,
    shiftRevenue: 0,
    activeRules: [],
    firedEventIds: [],
    revealedTools: ['LEDGER', 'PARTY_TICKET', 'CLIPBOARD_VIP', 'CLIPBOARD_BANNED'],
    nightEndPending: false,
    activeBossEncounter: null,
    ...overrides,
  } as GameState;
}

describe('BOSS_ROSTER', () => {
  it('has exactly 4 bosses', () => {
    expect(BOSS_ROSTER).toHaveLength(4);
  });

  it('each boss has a unique id', () => {
    const ids = BOSS_ROSTER.map(b => b.id);
    expect(new Set(ids).size).toBe(4);
  });

  describe('Syndicate Don (syndicate-don)', () => {
    const don = () => BOSS_ROSTER.find(b => b.id === 'syndicate-don')!;
    it('exists and is VIP', () => {
      expect(don().role).toBe('VIP');
      expect(don().miniGame).toBe('HANDSHAKE');
    });
    it('spawns when cash >= 600', () => {
      expect(don().spawnCondition(makeState({ cash: 599 }))).toBe(false);
      expect(don().spawnCondition(makeState({ cash: 600 }))).toBe(true);
    });
  });

  describe('Grand Inquisitor (grand-inquisitor)', () => {
    const inq = () => BOSS_ROSTER.find(b => b.id === 'grand-inquisitor')!;
    it('exists and is BANNED', () => {
      expect(inq().role).toBe('BANNED');
      expect(inq().miniGame).toBe('WHITE_GLOVE');
    });
    it('spawns when rating >= 4.0 and time >= 1290', () => {
      expect(inq().spawnCondition(makeState({ rating: 4.0, inGameMinutes: 1289 }))).toBe(false);
      expect(inq().spawnCondition(makeState({ rating: 3.9, inGameMinutes: 1290 }))).toBe(false);
      expect(inq().spawnCondition(makeState({ rating: 4.0, inGameMinutes: 1290 }))).toBe(true);
    });
  });

  describe('Influencer Megastar (influencer-megastar)', () => {
    const inf = () => BOSS_ROSTER.find(b => b.id === 'influencer-megastar')!;
    it('exists and is VIP', () => {
      expect(inf().role).toBe('VIP');
      expect(inf().miniGame).toBe('PAPARAZZI');
    });
    it('spawns when shiftRevenue >= 400', () => {
      expect(inf().spawnCondition(makeState({ shiftRevenue: 399 }))).toBe(false);
      expect(inf().spawnCondition(makeState({ shiftRevenue: 400 }))).toBe(true);
    });
  });

  describe('Aristocrat (aristocrat)', () => {
    const aris = () => BOSS_ROSTER.find(b => b.id === 'aristocrat')!;
    it('exists and is BANNED', () => {
      expect(aris().role).toBe('BANNED');
      expect(aris().miniGame).toBe('COAT_CHECK');
    });
    it('spawns when morale <= 65 and queue.length >= 3', () => {
      const q3 = Array(3).fill({ id: 'x', patience: 100 });
      expect(aris().spawnCondition(makeState({ morale: 65, queue: [] }))).toBe(false);
      expect(aris().spawnCondition(makeState({ morale: 66, queue: q3 as any }))).toBe(false);
      expect(aris().spawnCondition(makeState({ morale: 65, queue: q3 as any }))).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (file doesn't exist)**

```bash
npm run test -- src/logic/__tests__/bossRoster.test.ts
```
Expected: FAIL — cannot find module `../../data/bossRoster`

- [ ] **Step 3: Create the boss roster**

```ts
// src/data/bossRoster.ts
import type { BossDefinition } from '../types';

export const BOSS_ROSTER: BossDefinition[] = [
  {
    id: 'syndicate-don',
    name: 'The Syndicate Don',
    role: 'VIP',
    behaviorType: 'STANDARD_VIP',
    miniGame: 'HANDSHAKE',
    quoteKey: 'boss.syndicateDon.quote',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 4,
    clueText: 'Watch out for the Pinstripes tonight.',
    visualTraits: {
      skinTone: 1,
      hairStyle: 1,
      hairColor: 1,
      clothingStyle: 3,
      clothingColor: 4,
      height: 2,
      facialHair: 1,
      neckwear: 0,
    },
    cashBonus: 1000,
    moralePenalty: 25,
    ratingPenalty: 1.0,
    consequenceDescription: 'They leave a briefcase of cash on the ledger.',
    refusalDescription: 'The Don smashes the front window.',
    spawnCondition: (s) => s.cash >= 600,
  },
  {
    id: 'grand-inquisitor',
    name: 'The Grand Inquisitor',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    miniGame: 'WHITE_GLOVE',
    quoteKey: 'boss.grandInquisitor.quote',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    clueText: 'The Inquisition is doing random inspections. Look for the Crimson Ascot.',
    visualTraits: {
      skinTone: 2,
      hairStyle: 3,
      hairColor: 1,
      clothingStyle: 3,
      clothingColor: 1,
      height: 2,
      neckwear: 2,
    },
    ratingPenalty: 2.0,
    moralePenalty: 0,
    consequenceDescription: 'The Inquisitor mutters, "Acceptable." Rating immunity granted.',
    refusalDescription: 'The Inquisitor screams. Two full stars lost immediately.',
    spawnCondition: (s) => s.rating >= 4.0 && s.inGameMinutes >= 1290,
  },
  {
    id: 'influencer-megastar',
    name: 'The Influencer',
    role: 'VIP',
    behaviorType: 'STANDARD_VIP',
    miniGame: 'PAPARAZZI',
    quoteKey: 'boss.influencer.quote',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 2,
    clueText: 'A megastar is rumored to visit tonight. Neon hoodie.',
    visualTraits: {
      skinTone: 3,
      hairStyle: 2,
      hairColor: 5,
      clothingStyle: 2,
      clothingColor: 3,
      height: 1,
    },
    moralePenalty: 15,
    ratingPenalty: 0,
    consequenceDescription: 'Their viral post instantly refills the queue patience meters.',
    refusalDescription: 'The Influencer is caught from a bad angle. Massive queue patience drain.',
    spawnCondition: (s) => s.shiftRevenue >= 400,
  },
  {
    id: 'aristocrat',
    name: 'The Duchess',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    miniGame: 'COAT_CHECK',
    quoteKey: 'boss.aristocrat.quote',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 2,
    clueText: 'The Duchess is coming. She brings her own lighting.',
    visualTraits: {
      skinTone: 0,
      hairStyle: 4,
      hairColor: 0,
      clothingStyle: 3,
      clothingColor: 1,
      height: 2,
      hat: 0,
    },
    gameOver: true,
    moralePenalty: 0,
    ratingPenalty: 0,
    consequenceDescription: 'The Duchess scoffs and demands her table.',
    refusalDescription: 'The poodle hits the floor. YOU ARE FIRED.',
    spawnCondition: (s) => s.morale <= 65 && s.queue.length >= 3,
  },
];
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- src/logic/__tests__/bossRoster.test.ts
```
Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/bossRoster.ts src/logic/__tests__/bossRoster.test.ts
git commit -m "feat: add BOSS_ROSTER with 4 static boss definitions and spawn conditions"
```

---

### Task 3: Add `activeBossEncounter: null` to `buildInitialState`

**Files:**
- Modify: `src/logic/gameLogic.ts`

- [ ] **Step 1: Add field to the return object of `buildInitialState` (after `nightEndPending: false`)**

```ts
activeBossEncounter: null,
```

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/logic/gameLogic.ts
git commit -m "feat: initialise activeBossEncounter in buildInitialState"
```

---

### Task 4: Add boss spawn logic to `useClientSpawner`

**Files:**
- Modify: `src/hooks/useClientSpawner.ts`

- [ ] **Step 1: Add import at the top of the file**

```ts
import { BOSS_ROSTER } from '../data/bossRoster';
```

- [ ] **Step 2: Add boss spawn evaluation inside the `useEffect` (after the `bypassChars.forEach` block, before the closing `}`)**

The existing `useEffect` already guards on `timeMultiplier === 0`. Bosses use the same guard. Add:

```ts
// BOSS CHARACTERS — condition-based spawn (once per shift)
BOSS_ROSTER.forEach(boss => {
  const spawnKey = 'boss-' + boss.id;
  if (gameState.spawnedReservationIds.includes(spawnKey)) return;
  if (!boss.spawnCondition(gameState)) return;
  spawnCharacterWalkIn(boss);
  // spawnCharacterWalkIn uses 'char-walkin-' prefix, we need to track with 'boss-' too
  // We set spawnedReservationIds manually after spawnCharacterWalkIn is called:
});
```

Wait — `spawnCharacterWalkIn` already uses `'char-walkin-' + def.id` internally. So boss spawning deduplication is handled by that prefix. The condition `BOSS_ROSTER` check above would re-evaluate every tick. Fix: check `'char-walkin-' + boss.id` instead:

```ts
// BOSS CHARACTERS — condition-based spawn (once per shift)
BOSS_ROSTER.forEach(boss => {
  const spawnKey = 'char-walkin-' + boss.id;
  if (gameState.spawnedReservationIds.includes(spawnKey)) return;
  if (!boss.spawnCondition(gameState)) return;
  spawnCharacterWalkIn(boss);
});
```

- [ ] **Step 3: Add `BOSS_ROSTER` to the `useEffect` deps array**

The dep array currently ends with `spawnBypassCharacter]`. Add `BOSS_ROSTER` — but since it's a module-level constant (stable reference), TypeScript/ESLint may warn. Instead, just add it without listing (it's stable):

The `spawnCharacterWalkIn` is already in deps. `BOSS_ROSTER` is a module constant so no dep needed.

- [ ] **Step 4: Run type-check and tests**

```bash
npm run lint && npm run test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useClientSpawner.ts
git commit -m "feat: add condition-based boss spawn to useClientSpawner"
```

---

### Task 5: Intercept SEAT / REFUSE for boss characters in `useDecisionActions`

**Files:**
- Modify: `src/hooks/useDecisionActions.ts`

- [ ] **Step 1: Add imports at the top**

```ts
import { BOSS_ROSTER } from '../data/bossRoster';
import { createCharacter } from '../logic/characters/factory';
import { applyMoraleGameOver } from '../logic/gameLogic';
```

Note: `applyMoraleGameOver` is already imported. Only add the two new ones.

- [ ] **Step 2: Replace the `seatParty` callback with the boss-intercepting version**

```ts
const seatParty = useCallback(() => {
  setGameState((prev) => {
    if (!prev.currentClient) return prev;
    const boss = prev.currentClient.characterId
      ? BOSS_ROSTER.find(b => b.id === prev.currentClient!.characterId && b.role === 'VIP')
      : undefined;
    if (boss) {
      return {
        ...prev,
        activeBossEncounter: {
          bossId: boss.id,
          interceptedAction: 'SEAT' as const,
          miniGame: boss.miniGame,
          previousTimeMultiplier: prev.timeMultiplier,
        },
        timeMultiplier: 0,
      };
    }
    return {
      ...prev,
      grid: clearFloorplanSelection(prev.grid),
      currentClient: {
        ...prev.currentClient,
        physicalState: PhysicalState.SEATING,
      },
    };
  });
}, [setGameState]);
```

- [ ] **Step 3: Add BANNED boss interception inside `handleDecision`**

Inside the `flushSync(() => { setGameState((prev) => {` block, add this check **before** the existing `// CHARACTER REFUSE` block:

```ts
// BOSS BANNED interception — gate the refuse behind a mini-game
if (deskClient.characterId) {
  const boss = BOSS_ROSTER.find(b => b.id === deskClient.characterId && b.role === 'BANNED');
  if (boss) {
    return {
      ...prev,
      activeBossEncounter: {
        bossId: boss.id,
        interceptedAction: 'REFUSE' as const,
        miniGame: boss.miniGame,
        previousTimeMultiplier: prev.timeMultiplier,
      },
      timeMultiplier: 0,
    };
  }
}
```

Also add a guard after `flushSync` to skip toasts when intercepted. The `toastArgs` variable will remain `null` since we returned early — so no change needed there. The `pathScoreEvent` also remains null. Existing behavior preserved.

- [ ] **Step 4: Add `clearBossEncounter` callback at the end of `useDecisionActions`, before the return**

```ts
const clearBossEncounter = useCallback((outcome: 'WIN' | 'LOSE') => {
  let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

  flushSync(() => {
    setGameState((prev) => {
      if (!prev.activeBossEncounter) return prev;
      const { bossId, interceptedAction, previousTimeMultiplier } = prev.activeBossEncounter;
      const boss = BOSS_ROSTER.find(b => b.id === bossId);
      const base = { ...prev, activeBossEncounter: null, timeMultiplier: previousTimeMultiplier };
      if (!boss) return base;

      const ch = createCharacter(boss);

      if (outcome === 'WIN') {
        if (interceptedAction === 'SEAT') {
          // VIP boss: won → proceed to floorplan seating
          toastArgs = [tGame('boss.winSeat', { name: boss.name }), undefined, 'success'];
          return {
            ...base,
            currentClient: prev.currentClient
              ? { ...prev.currentClient, physicalState: PhysicalState.SEATING }
              : null,
          };
        } else {
          // BANNED boss: correctly refused
          const charOutcome = ch.onRefused(prev);
          toastArgs = [tGame('boss.winRefuse', { name: boss.name }), undefined, 'success'];
          return applyMoraleGameOver({
            ...base,
            ...charOutcome,
            currentClient: null,
            logs: [tGame('logVipRefused', { role: tGame('roleBanned'), name: boss.name }), ...base.logs].slice(0, 50),
          });
        }
      } else {
        // LOSE
        if (interceptedAction === 'SEAT') {
          // VIP boss: failed mini-game → penalty fires, boss storms out
          const charOutcome = ch.onRefused(prev);
          toastArgs = [tGame('boss.loseSeat', { name: boss.name }), undefined, 'error'];
          return applyMoraleGameOver({
            ...base,
            ...charOutcome,
            currentClient: null,
            logs: [tGame('boss.stormedOut', { name: boss.name }), ...base.logs].slice(0, 50),
          });
        } else {
          // BANNED boss: failed mini-game → forced to seat → floorplan opens
          toastArgs = [tGame('boss.loseRefuse', { name: boss.name }), undefined, 'error'];
          return {
            ...base,
            currentClient: prev.currentClient
              ? { ...prev.currentClient, physicalState: PhysicalState.SEATING }
              : null,
          };
        }
      }
    });
  });

  if (toastArgs) showToast(...toastArgs);
}, [setGameState, showToast]);
```

- [ ] **Step 5: Add `clearBossEncounter` to the return object**

```ts
return {
  handleDecision,
  waitInLine,
  seatParty,
  toggleCellSelection,
  confirmSeating,
  refuseSeatedParty,
  lastCallTable,
  clearBossEncounter,
};
```

- [ ] **Step 6: Add i18n keys to both locale files**

`src/i18n/locales/en/game.json` — add inside the root object:
```json
"boss": {
  "winSeat": "{{name}} is satisfied. Proceed to seating.",
  "winRefuse": "Well handled. {{name}} turned away.",
  "loseSeat": "{{name}} is furious.",
  "loseRefuse": "You failed. {{name}} forces their way in.",
  "stormedOut": "{{name}} stormed out in fury."
}
```

`src/i18n/locales/fr/game.json` — add:
```json
"boss": {
  "winSeat": "{{name}} est satisfait. Passez à la table.",
  "winRefuse": "Bien géré. {{name}} renvoyé.",
  "loseSeat": "{{name}} est furieux.",
  "loseRefuse": "Vous avez échoué. {{name}} s'impose.",
  "stormedOut": "{{name}} est parti en furie."
}
```

- [ ] **Step 7: Run type-check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useDecisionActions.ts src/i18n/locales/en/game.json src/i18n/locales/fr/game.json
git commit -m "feat: intercept SEAT/REFUSE for boss characters, add clearBossEncounter"
```

---

### Task 6: Expose `clearBossEncounter` through `useGameEngine` and `GameContext`

**Files:**
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Destructure `clearBossEncounter` from `useDecisionActions` in `useGameEngine`**

```ts
const {
  handleDecision,
  waitInLine,
  seatParty,
  toggleCellSelection,
  confirmSeating,
  refuseSeatedParty,
  lastCallTable,
  clearBossEncounter,
} = useDecisionActions(setGameState, showToast, characters, incrementPathScore);
```

- [ ] **Step 2: Add `clearBossEncounter` to the `useGameEngine` return object**

```ts
return {
  gameState,
  pathScores,
  askQuestion,
  callOutLie,
  handleDecision,
  waitInLine,
  seatParty,
  toggleCellSelection,
  confirmSeating,
  refuseSeatedParty,
  toggleReservationArrived,
  setTimeMultiplier,
  resetGame,
  lastCallTable,
  clearBossEncounter,
};
```

- [ ] **Step 3: Add `clearBossEncounter` to `GameContextType` in `GameContext.tsx`**

```ts
interface GameContextType {
  // ... existing fields ...
  clearBossEncounter: (outcome: 'WIN' | 'LOSE') => void;
}
```

- [ ] **Step 4: Run type-check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGameEngine.ts src/context/GameContext.tsx
git commit -m "feat: expose clearBossEncounter through useGameEngine and GameContext"
```

---

### Task 7: Create `useCountdown` hook

**Files:**
- Create: `src/hooks/useCountdown.ts`
- Create: `src/hooks/__tests__/useCountdown.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/__tests__/useCountdown.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../useCountdown';

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts at progress 1', () => {
    const { result } = renderHook(() => useCountdown(1000));
    expect(result.current.progress).toBe(1);
  });

  it('decreases progress over time', () => {
    const { result } = renderHook(() => useCountdown(1000));
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.progress).toBeGreaterThan(0);
    expect(result.current.progress).toBeLessThan(1);
  });

  it('reaches 0 after full duration', () => {
    const { result } = renderHook(() => useCountdown(1000));
    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current.progress).toBe(0);
  });

  it('calls onExpire once after duration', () => {
    const onExpire = vi.fn();
    renderHook(() => useCountdown(1000, onExpire));
    act(() => { vi.advanceTimersByTime(1100); });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('does not call onExpire twice on extra ticks', () => {
    const onExpire = vi.fn();
    renderHook(() => useCountdown(1000, onExpire));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onExpire).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/hooks/__tests__/useCountdown.test.ts
```
Expected: FAIL — cannot find module `../useCountdown`

- [ ] **Step 3: Implement `useCountdown`**

```ts
// src/hooks/useCountdown.ts
import { useState, useEffect, useRef } from 'react';

/**
 * Returns a progress value from 1.0 → 0.0 over durationMs.
 * Calls onExpire once when it hits 0.
 */
export function useCountdown(durationMs: number, onExpire?: () => void) {
  const [progress, setProgress] = useState(1);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
    setProgress(1);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const next = Math.max(0, 1 - elapsed / durationMs);
      setProgress(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [durationMs]);

  return { progress };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- src/hooks/__tests__/useCountdown.test.ts
```
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCountdown.ts src/hooks/__tests__/useCountdown.test.ts
git commit -m "feat: add useCountdown hook"
```

---

### Task 8: Create `BossEncounterOverlay` shell

**Files:**
- Create: `src/components/boss/BossEncounterOverlay.tsx`

- [ ] **Step 1: Create the overlay component**

```tsx
// src/components/boss/BossEncounterOverlay.tsx
import React, { useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useCountdown } from '../../hooks/useCountdown';
import type { MiniGameId } from '../../types';
import { useTranslation } from 'react-i18next';
import { BOSS_ROSTER } from '../../data/bossRoster';

export interface MiniGameProps {
  onWin: () => void;
  onLose: () => void;
  durationMs: number;
}

// Populated by each mini-game plan. Placeholder stubs for now.
const MINI_GAMES: Record<MiniGameId, React.FC<MiniGameProps>> = {
  HANDSHAKE:   ({ onWin, onLose }) => (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-white/60 text-sm tracking-widest uppercase">Handshake — coming soon</p>
      <div className="flex gap-4">
        <button onClick={onWin}  className="px-4 py-2 bg-green-700 text-white rounded">Win</button>
        <button onClick={onLose} className="px-4 py-2 bg-red-700   text-white rounded">Lose</button>
      </div>
    </div>
  ),
  WHITE_GLOVE: ({ onWin, onLose }) => (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-white/60 text-sm tracking-widest uppercase">White Glove — coming soon</p>
      <div className="flex gap-4">
        <button onClick={onWin}  className="px-4 py-2 bg-green-700 text-white rounded">Win</button>
        <button onClick={onLose} className="px-4 py-2 bg-red-700   text-white rounded">Lose</button>
      </div>
    </div>
  ),
  PAPARAZZI:   ({ onWin, onLose }) => (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-white/60 text-sm tracking-widest uppercase">Paparazzi — coming soon</p>
      <div className="flex gap-4">
        <button onClick={onWin}  className="px-4 py-2 bg-green-700 text-white rounded">Win</button>
        <button onClick={onLose} className="px-4 py-2 bg-red-700   text-white rounded">Lose</button>
      </div>
    </div>
  ),
  COAT_CHECK:  ({ onWin, onLose }) => (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-white/60 text-sm tracking-widest uppercase">Coat Check — coming soon</p>
      <div className="flex gap-4">
        <button onClick={onWin}  className="px-4 py-2 bg-green-700 text-white rounded">Win</button>
        <button onClick={onLose} className="px-4 py-2 bg-red-700   text-white rounded">Lose</button>
      </div>
    </div>
  ),
};

// Duration (ms) per mini-game
const DURATIONS: Record<MiniGameId, number> = {
  HANDSHAKE:   10000,
  WHITE_GLOVE:  4000,
  PAPARAZZI:    4000,
  COAT_CHECK:  12000,
};

export function BossEncounterOverlay() {
  const { gameState, clearBossEncounter } = useGame();
  const { t } = useTranslation('game');
  const encounter = gameState.activeBossEncounter;
  const resolvedRef = useRef(false);

  // Reset resolved flag when a new encounter starts
  React.useEffect(() => {
    resolvedRef.current = false;
  }, [encounter?.bossId]);

  const resolve = (outcome: 'WIN' | 'LOSE') => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearBossEncounter(outcome);
  };

  const durationMs = encounter ? DURATIONS[encounter.miniGame] : 4000;
  useCountdown(durationMs, () => resolve('LOSE'));

  if (!encounter) return null;

  const boss = BOSS_ROSTER.find(b => b.id === encounter.bossId);
  const Game = MINI_GAMES[encounter.miniGame];
  const commandWord = encounter.interceptedAction === 'SEAT' ? 'SEAT.' : 'REFUSE.';
  const quote = boss ? t(boss.quoteKey, { defaultValue: '' }) : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      {/* Boss intro */}
      <div className="flex flex-col items-center gap-2 mb-8" style={{ animation: 'slamIn 0.6s cubic-bezier(0.22,1,0.36,1)' }}>
        <p className="text-white/40 text-xs tracking-[4px] uppercase">⚡ Boss Encounter</p>
        <h1 className="text-[#e8c97a] text-2xl font-black tracking-[3px] uppercase">
          {boss?.name ?? encounter.bossId}
        </h1>
        <div className="w-10 h-px bg-white/20 my-1" />
        <p className="text-white text-4xl font-black tracking-[6px] uppercase">{commandWord}</p>
        {quote && (
          <p className="text-white/50 text-sm italic mt-1 max-w-xs text-center">{quote}</p>
        )}
      </div>

      {/* Mini-game area */}
      <div className="w-full max-w-lg">
        <Game
          onWin={() => resolve('WIN')}
          onLose={() => resolve('LOSE')}
          durationMs={durationMs}
        />
      </div>

      {/* Timer bar */}
      <TimerBar durationMs={durationMs} onExpire={() => resolve('LOSE')} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slamIn { from { transform: scale(1.15); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function TimerBar({ durationMs, onExpire }: { durationMs: number; onExpire: () => void }) {
  const { progress } = useCountdown(durationMs, onExpire);
  const color = progress > 0.5 ? '#e8c97a' : progress > 0.25 ? '#f59e0b' : '#ef4444';
  return (
    <div className="fixed bottom-0 left-0 right-0 h-1 bg-white/10">
      <div
        className="h-full transition-none"
        style={{ width: `${progress * 100}%`, background: color }}
      />
    </div>
  );
}
```

**Note on `useCountdown` double-call:** The overlay shell and `TimerBar` both instantiate `useCountdown`. The shell's `onExpire` calls `resolve('LOSE')` — but `resolvedRef` guards against double-firing. The `TimerBar`'s `onExpire` prop is the same function, also guarded. This is safe.

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/BossEncounterOverlay.tsx
git commit -m "feat: add BossEncounterOverlay shell with placeholder mini-games"
```

---

### Task 9: Render overlay and handle view transition in `GameContent`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import at the top of `App.tsx`**

```ts
import { BossEncounterOverlay } from './components/boss/BossEncounterOverlay';
```

- [ ] **Step 2: Add `useEffect` in `GameContent` to switch to floorplan view after a WIN on SEAT**

Inside `GameContent`, after the existing `React.useEffect` for view management:

```tsx
// After boss encounter clears with SEAT WIN, currentClient is in SEATING state → show floorplan
React.useEffect(() => {
  if (
    !gameState.activeBossEncounter &&
    gameState.currentClient?.physicalState === PhysicalState.SEATING
  ) {
    setView('floorplan');
  }
}, [gameState.activeBossEncounter, gameState.currentClient?.physicalState]);
```

- [ ] **Step 3: Render `<BossEncounterOverlay />` inside `GameContent`'s return, as the last child of the outermost div**

```tsx
return (
  <div className="h-screen relative ...">
    {/* ... existing JSX ... */}
    <BossEncounterOverlay />
  </div>
);
```

- [ ] **Step 4: Run type-check and start dev server**

```bash
npm run lint
npm run dev
```

Verify manually:
- Start a game, let cash reach €600 (or temporarily lower the spawn threshold in bossRoster.ts for testing)
- Syndicate Don appears in queue
- Seat Don → full black screen appears with "SEAT." command word and Win/Lose buttons
- Win → proceeds to floorplan
- Lose → penalty applied, Don removed from desk

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: render BossEncounterOverlay in GameContent with view transition hook"
```

---

### Task 10: Final type-check and full test run

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```
Expected: all existing tests pass + new bossRoster + useCountdown tests pass.

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit if clean**

```bash
git add -A
git commit -m "feat: boss encounter foundation complete"
```
