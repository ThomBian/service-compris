# Banned Customers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 banned characters with exclusive visual accessories, passive detection, and automatic seating consequences — mirroring the VIP system.

**Architecture:** Banned mirrors VIP: new `bannedRoster.ts` + `bannedLogic.ts` parallel `vipRoster.ts` + `vipLogic.ts`. Two new banned-exclusive `VisualTraits` fields (`glasses`, `eyebrows`) guarantee no collision with regular clients via `traitsMatch` strict equality. Seating consequence fires automatically in `confirmSeating` — no explicit spot action. Clipboard Banned tab fills with `BannedDossierEntry` components mirroring `VipDossierEntry`.

**Tech Stack:** TypeScript, React 19, Vitest, Tailwind CSS 4, SVG

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types.ts` | Modify | Add `glasses?`/`eyebrows?` to `VisualTraits`; add `BannedConsequenceTier`, `Banned` interface; add `bannedId?` to `Client`; add `dailyBanned`/`seatedBannedIds` to `GameState` |
| `src/constants.ts` | Modify | Add `SPAWN_PROBABILITY: readonly number[]` |
| `src/logic/vipLogic.ts` | Modify | `traitsMatch` extended with `glasses`/`eyebrows`; `generateDailyVips` made probabilistic using `SPAWN_PROBABILITY` |
| `src/logic/__tests__/vipLogic.test.ts` | Modify | Replace 3 exact-count tests with probabilistic assertions |
| `src/components/scene/ClientAvatar.tsx` | Modify | `Accessories` gains `glasses`, `eyebrows`, `skin` props; 4 new SVG render blocks |
| `src/logic/bannedRoster.ts` | Create | 5 banned characters with distinct base traits + banned-exclusive accessories |
| `src/logic/bannedLogic.ts` | Create | `generateDailyBanned`, `injectBannedReservations`, `computeBannedSeatingOutcome` |
| `src/logic/__tests__/bannedLogic.test.ts` | Create | Full test suite for banned logic functions |
| `src/hooks/useClientSpawner.ts` | Modify | Add `spawnBannedWalkIn`; detect `banned-res-` prefix; expand `excludeTraits`; add `dailyBanned` to dep array |
| `src/hooks/useDecisionActions.ts` | Modify | `confirmSeating`: add banned check after VIP check; apply consequence; add to `seatedBannedIds` |
| `src/hooks/useGameEngine.ts` | Modify | `buildInitialState` calls `generateDailyBanned` + `injectBannedReservations`; returns `dailyBanned`/`seatedBannedIds` |
| `src/components/desk/Clipboard.tsx` | Modify | Add `BannedDossierEntry`; fill Banned tab; import `Banned` type |

---

## Task 1: Type Foundation

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add two banned-exclusive fields to `VisualTraits`**

In `src/types.ts`, after `neckwear?: 0 | 1 | 2;` add:
```ts
  // Banned-only accessories — undefined on regular clients and VIPs
  glasses?:  0 | 1;  // 0=round wire-frame, 1=oversized sunglasses
  eyebrows?: 0 | 1;  // 0=heavy furrowed brow, 1=droopy half-closed lids (drunk)
```

- [ ] **Step 2: Add `BannedConsequenceTier` and `Banned` interface**

After the `VipConsequenceTier` line add:
```ts
export type BannedConsequenceTier = 'CASH_FINE' | 'MORALE' | 'RATING' | 'GAME_OVER';

export interface Banned {
  id: string;
  name: string;
  visualTraits: VisualTraits;
  arrivalMO: 'RESERVATION_ALIAS' | 'WALK_IN' | 'LATE';
  aliasFirstName?: string;
  aliasLastName?: string;
  expectedPartySize: number;
  consequenceTier: BannedConsequenceTier;
  cashFinePenalty?: number;
  moralePenalty?: number;
  ratingPenalty?: number;
  consequenceDescription: string;
}
```

- [ ] **Step 3: Add `bannedId?` to `Client`**

After `vipId?: string;` in the `Client` interface add:
```ts
  bannedId?: string;
```

- [ ] **Step 4: Add `dailyBanned` and `seatedBannedIds` to `GameState`**

After `seatedVipIds: string[];` in the `GameState` interface add:
```ts
  dailyBanned: Banned[];
  seatedBannedIds: string[];
```

- [ ] **Step 5: Run type-check to verify no errors**

```bash
cd /Users/tbianchini/workspace/service-compris/.worktrees/feat/clipboard-vip && npm run lint
```
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Banned types, BannedConsequenceTier, glasses/eyebrows to VisualTraits"
```

---

## Task 2: SPAWN_PROBABILITY + Probabilistic VIP Logic + Updated Tests

**Files:**
- Modify: `src/constants.ts`
- Modify: `src/logic/vipLogic.ts`
- Modify: `src/logic/__tests__/vipLogic.test.ts`

- [ ] **Step 1: Add `SPAWN_PROBABILITY` to constants**

In `src/constants.ts`, after the `TABLE_TURNING_SOON_THRESHOLD` line add:
```ts
// Probability per character slot at each difficulty level (0–3)
export const SPAWN_PROBABILITY: readonly number[] = [0, 0.5, 0.7, 0.9];
```

- [ ] **Step 2: Update `traitsMatch` to compare `glasses` and `eyebrows`**

In `src/logic/vipLogic.ts`, replace the `traitsMatch` function:
```ts
export function traitsMatch(a: VisualTraits, b: VisualTraits): boolean {
  return (
    a.skinTone      === b.skinTone &&
    a.hairStyle     === b.hairStyle &&
    a.hairColor     === b.hairColor &&
    a.clothingStyle === b.clothingStyle &&
    a.clothingColor === b.clothingColor &&
    a.height        === b.height &&
    a.hat           === b.hat &&
    a.facialHair    === b.facialHair &&
    a.neckwear      === b.neckwear &&
    a.glasses       === b.glasses &&
    a.eyebrows      === b.eyebrows
  );
}
```

- [ ] **Step 3: Update `generateDailyVips` to use probabilistic spawning**

In `src/logic/vipLogic.ts`, add the import:
```ts
import { START_TIME, SPAWN_PROBABILITY } from '../constants';
```

Replace `generateDailyVips`:
```ts
export function generateDailyVips(difficulty: number, roster: Vip[]): Vip[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.filter(() => Math.random() < p);
}
```

- [ ] **Step 4: Replace exact-count tests with probabilistic assertions in `vipLogic.test.ts`**

The three tests "returns exactly 1 VIP at difficulty 1", "returns 2 unique VIPs at difficulty 2", and any cap test must be replaced. Remove those tests and add:

```ts
it('never returns duplicates across 50 runs', () => {
  for (let i = 0; i < 50; i++) {
    const result = generateDailyVips(2, [FOOD_CRITIC, THE_OWNER, THE_INSPECTOR]);
    const ids = result.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  }
});

it('never returns more VIPs than roster size', () => {
  for (let i = 0; i < 50; i++) {
    const result = generateDailyVips(3, [FOOD_CRITIC, THE_OWNER]);
    expect(result.length).toBeLessThanOrEqual(2);
  }
});

it('is probabilistic at difficulty 1 — count varies across 200 runs', () => {
  const counts = new Set<number>();
  for (let i = 0; i < 200; i++) {
    counts.add(generateDailyVips(1, [FOOD_CRITIC, THE_OWNER, THE_INSPECTOR]).length);
  }
  expect(counts.size).toBeGreaterThan(1); // at least two different counts observed
});
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
npm run test -- --reporter=verbose src/logic/__tests__/vipLogic.test.ts
```
Expected: all tests pass (the two deterministic tests stay; the three probabilistic tests pass).

- [ ] **Step 6: Commit**

```bash
git add src/constants.ts src/logic/vipLogic.ts src/logic/__tests__/vipLogic.test.ts
git commit -m "feat: add SPAWN_PROBABILITY, probabilistic generateDailyVips, extend traitsMatch"
```

---

## Task 3: ClientAvatar Accessories (glasses + eyebrows)

**Files:**
- Modify: `src/components/scene/ClientAvatar.tsx`

The `Accessories` function is at line 109. It renders inside the 48×80 SVG viewBox. Eye ellipses are at cx=20.5/27.5, cy=14.

- [ ] **Step 1: Add `glasses`, `eyebrows`, `skin` props to `Accessories` signature**

Replace the `Accessories` function signature:
```ts
function Accessories({ hat, facialHair, neckwear, hairColor, glasses, eyebrows, skin }: {
  hat?: 0 | 1 | 2;
  facialHair?: 0 | 1;
  neckwear?: 0 | 1 | 2;
  hairColor: string;
  glasses?: 0 | 1;
  eyebrows?: 0 | 1;
  skin: string;
}) {
```

- [ ] **Step 2: Add the 4 new SVG render blocks inside `Accessories` return**

Add after the existing `{hat === 2 && ...}` block, before the closing `</>`:

```tsx
      {eyebrows === 0 && (
        <g>
          <path d="M16 11 Q19 10 21 11.5" stroke="#141414" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M32 11 Q29 10 27 11.5" stroke="#141414" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      )}
      {eyebrows === 1 && (
        <g>
          <ellipse cx="20.5" cy="12.8" rx="2.8" ry="2.2" fill={skin} />
          <ellipse cx="27.5" cy="12.8" rx="2.8" ry="2.2" fill={skin} />
        </g>
      )}
      {glasses === 0 && (
        <g>
          <circle cx="20.5" cy="14" r="3.2" stroke="#2a2a2a" strokeWidth="0.8" fill="none" />
          <circle cx="27.5" cy="14" r="3.2" stroke="#2a2a2a" strokeWidth="0.8" fill="none" />
          <line x1="23.7" y1="14" x2="24.3" y2="14" stroke="#2a2a2a" strokeWidth="0.8" />
          <line x1="17.3" y1="14" x2="14" y2="13" stroke="#2a2a2a" strokeWidth="0.8" />
          <line x1="30.7" y1="14" x2="34" y2="13" stroke="#2a2a2a" strokeWidth="0.8" />
        </g>
      )}
      {glasses === 1 && (
        <g>
          <rect x="16" y="11.5" width="16" height="5.5" rx="2" fill="#141414" opacity="0.85" />
          <line x1="16" y1="14" x2="13" y2="13" stroke="#141414" strokeWidth="0.8" opacity="0.85" />
          <line x1="32" y1="14" x2="35" y2="13" stroke="#141414" strokeWidth="0.8" opacity="0.85" />
        </g>
      )}
```

- [ ] **Step 3: Thread `skin` and new fields into the `Accessories` call site**

At the `<Accessories ... />` call (around line 206), replace:
```tsx
        <Accessories
          hat={traits.hat}
          facialHair={traits.facialHair}
          neckwear={traits.neckwear}
          hairColor={hairColor}
        />
```
With:
```tsx
        <Accessories
          hat={traits.hat}
          facialHair={traits.facialHair}
          neckwear={traits.neckwear}
          hairColor={hairColor}
          glasses={traits.glasses}
          eyebrows={traits.eyebrows}
          skin={skin}
        />
```

- [ ] **Step 4: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/ClientAvatar.tsx
git commit -m "feat: render glasses and eyebrows accessories in ClientAvatar"
```

---

## Task 4: Banned Roster

**Files:**
- Create: `src/logic/bannedRoster.ts`

Base traits must be distinct from VIP roster:
- Food Critic: (skinTone=1, hairStyle=0, hairColor=5, clothingStyle=0, clothingColor=0, height=1)
- The Owner: (skinTone=2, hairStyle=3, hairColor=1, clothingStyle=0, clothingColor=0, height=2)
- Health Inspector: (skinTone=0, hairStyle=2, hairColor=3, clothingStyle=3, clothingColor=2, height=0)

- [ ] **Step 1: Create `src/logic/bannedRoster.ts`**

```ts
import type { Banned } from '../types';

export const BANNED_ROSTER: Banned[] = [
  {
    id: 'fake-hipster',
    name: 'The Fake Hipster',
    visualTraits: {
      skinTone: 3, hairStyle: 4, hairColor: 2,
      clothingStyle: 1, clothingColor: 3, height: 1,
      glasses: 0,
    },
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    consequenceTier: 'CASH_FINE',
    cashFinePenalty: 80,
    consequenceDescription: 'The Fake Hipster skips the bill. -€80.',
  },
  {
    id: 'drunk-group',
    name: 'The Drunk Group',
    visualTraits: {
      skinTone: 2, hairStyle: 1, hairColor: 0,
      clothingStyle: 2, clothingColor: 1, height: 2,
      eyebrows: 1,
    },
    arrivalMO: 'LATE',
    expectedPartySize: 4,
    consequenceTier: 'MORALE',
    moralePenalty: 30,
    consequenceDescription: "Rowdy crew all night. Staff morale tanks. -30 morale.",
  },
  {
    id: 'small-spender',
    name: 'The Small Spender',
    visualTraits: {
      skinTone: 0, hairStyle: 3, hairColor: 4,
      clothingStyle: 3, clothingColor: 4, height: 0,
      glasses: 0, eyebrows: 0,
    },
    arrivalMO: 'WALK_IN',
    expectedPartySize: 2,
    consequenceTier: 'CASH_FINE',
    cashFinePenalty: 30,
    consequenceDescription: 'They order tap water and share a starter. -€30.',
  },
  {
    id: 'fake-influencer',
    name: 'The Fake Influencer',
    visualTraits: {
      skinTone: 4, hairStyle: 0, hairColor: 3,
      clothingStyle: 1, clothingColor: 2, height: 1,
      glasses: 1,
    },
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Chloé',
    aliasLastName: 'Lacroix',
    expectedPartySize: 1,
    consequenceTier: 'RATING',
    ratingPenalty: 1.5,
    consequenceDescription: 'Charmed a free meal, then posted a hit piece. -1.5 stars.',
  },
  {
    id: 'the-dictator',
    name: 'The Dictator',
    visualTraits: {
      skinTone: 1, hairStyle: 2, hairColor: 1,
      clothingStyle: 0, clothingColor: 4, height: 2,
      eyebrows: 0,
    },
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Viktor',
    aliasLastName: 'Blanc',
    expectedPartySize: 3,
    consequenceTier: 'GAME_OVER',
    consequenceDescription: "Didn't like the food. Attacked the restaurant.",
  },
];
```

- [ ] **Step 2: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/logic/bannedRoster.ts
git commit -m "feat: add banned roster with 5 characters across 4 consequence tiers"
```

---

## Task 5: Banned Logic (TDD)

**Files:**
- Create: `src/logic/bannedLogic.ts`
- Create: `src/logic/__tests__/bannedLogic.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/logic/__tests__/bannedLogic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateDailyBanned, injectBannedReservations, computeBannedSeatingOutcome } from '../bannedLogic';
import type { Banned } from '../../types';
import { START_TIME } from '../../constants';

const CASH_FINE_BANNED: Banned = {
  id: 'fake-hipster',
  name: 'The Fake Hipster',
  visualTraits: { skinTone: 3, hairStyle: 4, hairColor: 2, clothingStyle: 1, clothingColor: 3, height: 1, glasses: 0 },
  arrivalMO: 'WALK_IN',
  expectedPartySize: 1,
  consequenceTier: 'CASH_FINE',
  cashFinePenalty: 80,
  consequenceDescription: 'Skips the bill.',
};

const MORALE_BANNED: Banned = {
  id: 'drunk-group',
  name: 'The Drunk Group',
  visualTraits: { skinTone: 2, hairStyle: 1, hairColor: 0, clothingStyle: 2, clothingColor: 1, height: 2, eyebrows: 1 },
  arrivalMO: 'LATE',
  expectedPartySize: 4,
  consequenceTier: 'MORALE',
  moralePenalty: 30,
  consequenceDescription: 'Morale tanks.',
};

const RATING_BANNED: Banned = {
  id: 'fake-influencer',
  name: 'The Fake Influencer',
  visualTraits: { skinTone: 4, hairStyle: 0, hairColor: 3, clothingStyle: 1, clothingColor: 2, height: 1, glasses: 1 },
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Chloé',
  aliasLastName: 'Lacroix',
  expectedPartySize: 1,
  consequenceTier: 'RATING',
  ratingPenalty: 1.5,
  consequenceDescription: 'Hit piece published.',
};

const GAME_OVER_BANNED: Banned = {
  id: 'the-dictator',
  name: 'The Dictator',
  visualTraits: { skinTone: 1, hairStyle: 2, hairColor: 1, clothingStyle: 0, clothingColor: 4, height: 2, eyebrows: 0 },
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Viktor',
  aliasLastName: 'Blanc',
  expectedPartySize: 3,
  consequenceTier: 'GAME_OVER',
  consequenceDescription: 'Game over.',
};

const ALL_FOUR = [CASH_FINE_BANNED, MORALE_BANNED, RATING_BANNED, GAME_OVER_BANNED];

describe('generateDailyBanned', () => {
  it('returns [] at difficulty 0', () => {
    expect(generateDailyBanned(0, ALL_FOUR)).toEqual([]);
  });

  it('returns [] for empty roster', () => {
    expect(generateDailyBanned(2, [])).toEqual([]);
  });

  it('never returns duplicates across 50 runs', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyBanned(2, ALL_FOUR);
      const ids = result.map(b => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('never returns more than roster size', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyBanned(3, ALL_FOUR);
      expect(result.length).toBeLessThanOrEqual(ALL_FOUR.length);
    }
  });
});

describe('injectBannedReservations', () => {
  it('injects a reservation for RESERVATION_ALIAS banned', () => {
    const result = injectBannedReservations([RATING_BANNED], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('banned-res-fake-influencer');
    expect(result[0].time).toBe(START_TIME + 60);
  });

  it('does not inject reservation for WALK_IN banned', () => {
    const result = injectBannedReservations([CASH_FINE_BANNED], []);
    expect(result).toHaveLength(0);
  });

  it('does not inject reservation for LATE banned', () => {
    const result = injectBannedReservations([MORALE_BANNED], []);
    expect(result).toHaveLength(0);
  });
});

describe('computeBannedSeatingOutcome', () => {
  it('CASH_FINE subtracts penalty from cash', () => {
    const out = computeBannedSeatingOutcome(CASH_FINE_BANNED, { cash: 200, morale: 100, rating: 5, gameOver: false });
    expect(out.cash).toBe(120);
    expect(out.morale).toBe(100);
    expect(out.gameOver).toBe(false);
  });

  it('CASH_FINE floors cash at 0', () => {
    const out = computeBannedSeatingOutcome(CASH_FINE_BANNED, { cash: 50, morale: 100, rating: 5, gameOver: false });
    expect(out.cash).toBe(0);
  });

  it('MORALE subtracts penalty from morale', () => {
    const out = computeBannedSeatingOutcome(MORALE_BANNED, { cash: 200, morale: 60, rating: 5, gameOver: false });
    expect(out.morale).toBe(30);
  });

  it('MORALE floors morale at 0', () => {
    const out = computeBannedSeatingOutcome(MORALE_BANNED, { cash: 200, morale: 20, rating: 5, gameOver: false });
    expect(out.morale).toBe(0);
  });

  it('RATING subtracts penalty from rating', () => {
    const out = computeBannedSeatingOutcome(RATING_BANNED, { cash: 200, morale: 100, rating: 5, gameOver: false });
    expect(out.rating).toBeCloseTo(3.5);
  });

  it('RATING floors rating at 0', () => {
    const out = computeBannedSeatingOutcome(RATING_BANNED, { cash: 200, morale: 100, rating: 1, gameOver: false });
    expect(out.rating).toBe(0);
  });

  it('GAME_OVER sets gameOver to true', () => {
    const out = computeBannedSeatingOutcome(GAME_OVER_BANNED, { cash: 200, morale: 100, rating: 5, gameOver: false });
    expect(out.gameOver).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- src/logic/__tests__/bannedLogic.test.ts
```
Expected: FAIL — `bannedLogic` module not found.

- [ ] **Step 3: Create `src/logic/bannedLogic.ts`**

```ts
import type { Banned, Reservation } from '../types';
import { START_TIME, SPAWN_PROBABILITY } from '../constants';

export function generateDailyBanned(difficulty: number, roster: Banned[]): Banned[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.filter(() => Math.random() < p);
}

export function injectBannedReservations(
  dailyBanned: Banned[],
  existingReservations: Reservation[],
): Reservation[] {
  const bannedReservations: Reservation[] = dailyBanned
    .filter(b => b.arrivalMO === 'RESERVATION_ALIAS')
    .map(b => ({
      id: 'banned-res-' + b.id,
      time: START_TIME + 60,
      firstName: b.aliasFirstName ?? b.name,
      lastName: b.aliasLastName ?? '',
      partySize: b.expectedPartySize,
      arrived: false,
      partySeated: false,
    }));
  return [...existingReservations, ...bannedReservations];
}

export function computeBannedSeatingOutcome(
  banned: Banned,
  current: { cash: number; morale: number; rating: number; gameOver: boolean },
): { cash: number; morale: number; rating: number; gameOver: boolean } {
  switch (banned.consequenceTier) {
    case 'CASH_FINE':
      return { ...current, cash: Math.max(0, current.cash - (banned.cashFinePenalty ?? 0)) };
    case 'MORALE':
      return { ...current, morale: Math.max(0, current.morale - (banned.moralePenalty ?? 0)) };
    case 'RATING':
      return { ...current, rating: Math.max(0, current.rating - (banned.ratingPenalty ?? 0)) };
    case 'GAME_OVER':
      return { ...current, gameOver: true };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/logic/__tests__/bannedLogic.test.ts
```
Expected: all tests pass.

- [ ] **Step 5: Run full suite to check no regressions**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/logic/bannedLogic.ts src/logic/__tests__/bannedLogic.test.ts
git commit -m "feat: add bannedLogic with generateDailyBanned, injectBannedReservations, computeBannedSeatingOutcome"
```

---

## Task 6: useClientSpawner — Banned Spawning

**Files:**
- Modify: `src/hooks/useClientSpawner.ts`

Mirror the VIP spawning pattern. `spawnBannedWalkIn` mirrors `spawnVipWalkIn`. RESERVATION_ALIAS banned detected via `banned-res-` prefix in the reservation spawner. WALK_IN banned at `START_TIME + 90`, LATE at `START_TIME + 91`.

- [ ] **Step 1: Add `Banned` to the types import**

In `src/hooks/useClientSpawner.ts`, update the types import to include `Banned`:
```ts
import {
  GameState,
  Reservation,
  Client,
  ClientType,
  PhysicalState,
  DialogueState,
  LieType,
  Vip,
  Banned,
} from '../types';
```

No import from `bannedLogic` is needed — the spawner only uses the `Banned` type to detect reservations and build clients with `bannedId`.

Actually the spawner only needs the `Banned` type — no logic imports needed.

- [ ] **Step 2: Expand `excludeTraits` to include banned traits**

Replace:
```ts
const excludeTraits = prev.dailyVips.map(v => v.visualTraits);
```
With:
```ts
const excludeTraits = [
  ...prev.dailyVips.map(v => v.visualTraits),
  ...prev.dailyBanned.map(b => b.visualTraits),
];
```

- [ ] **Step 3: Add RESERVATION_ALIAS banned detection in `spawnClient`**

After the existing VIP reservation block:
```ts
      // VIP RESERVATION_ALIAS: override visualTraits + set vipId
      if (res?.id.startsWith('vip-res-')) {
        ...
      }
```
Add:
```ts
      // Banned RESERVATION_ALIAS: override visualTraits + set bannedId
      if (res?.id.startsWith('banned-res-')) {
        const bannedId = res.id.slice('banned-res-'.length);
        const banned = prev.dailyBanned.find(b => b.id === bannedId);
        if (banned) {
          newClient = { ...newClient, visualTraits: banned.visualTraits, bannedId: banned.id };
        }
      }
```

- [ ] **Step 4: Add `spawnBannedWalkIn` callback**

After the `spawnVipWalkIn` callback, add:
```ts
  const spawnBannedWalkIn = useCallback((b: Banned) => {
    setGameState(prev => {
      const walkinKey = 'banned-walkin-' + b.id;
      if (prev.spawnedReservationIds.includes(walkinKey)) return prev;
      const newClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        type: ClientType.WALK_IN,
        patience: 100,
        physicalState: PhysicalState.IN_QUEUE,
        dialogueState: DialogueState.AWAITING_GREETING,
        spawnTime: prev.inGameMinutes,
        trueFirstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
        trueLastName: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
        truePartySize: b.expectedPartySize,
        isLate: b.arrivalMO === 'LATE',
        lieType: LieType.NONE,
        hasLied: false,
        visualTraits: b.visualTraits,
        isCaught: false,
        bannedId: b.id,
        lastMessage: 'Waiting in line...',
        chatHistory: [],
      };
      return {
        ...prev,
        queue: [...prev.queue, newClient],
        spawnedReservationIds: [...prev.spawnedReservationIds, walkinKey],
      };
    });
  }, [setGameState]);
```

- [ ] **Step 5: Add banned walk-in spawning to the `useEffect`**

After the VIP walk-in block:
```ts
    gameState.dailyVips
      .filter(v => v.arrivalMO === 'WALK_IN' || v.arrivalMO === 'LATE')
      .forEach(v => { ... });
```
Add:
```ts
    gameState.dailyBanned
      .filter(b => b.arrivalMO === 'WALK_IN' || b.arrivalMO === 'LATE')
      .forEach(b => {
        const walkinKey = 'banned-walkin-' + b.id;
        const spawnAt = b.arrivalMO === 'LATE' ? START_TIME + 91 : START_TIME + 90;
        if (
          gameState.inGameMinutes >= spawnAt &&
          !gameState.spawnedReservationIds.includes(walkinKey)
        ) {
          spawnBannedWalkIn(b);
        }
      });
```

- [ ] **Step 6: Add `gameState.dailyBanned` and `spawnBannedWalkIn` to the `useEffect` dependency array**

Replace the existing dep array:
```ts
  }, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.reservations, gameState.spawnedReservationIds, gameState.queue.length, gameState.dailyVips, spawnClient, spawnVipWalkIn]);
```
With:
```ts
  }, [gameState.inGameMinutes, gameState.timeMultiplier, gameState.reservations, gameState.spawnedReservationIds, gameState.queue.length, gameState.dailyVips, gameState.dailyBanned, spawnClient, spawnVipWalkIn, spawnBannedWalkIn]);
```

Also update the return:
```ts
  return { spawnClient, spawnVipWalkIn, spawnBannedWalkIn };
```

- [ ] **Step 7: Type-check**

```bash
npm run lint
```
Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useClientSpawner.ts
git commit -m "feat: add banned spawning to useClientSpawner (RESERVATION_ALIAS + WALK_IN/LATE)"
```

---

## Task 7: Seating Consequence + Game Initialisation

**Files:**
- Modify: `src/hooks/useDecisionActions.ts`
- Modify: `src/hooks/useGameEngine.ts`

- [ ] **Step 1: Add banned imports to `useDecisionActions.ts`**

Add to imports:
```ts
import { computeBannedSeatingOutcome } from '../logic/bannedLogic';
```

- [ ] **Step 2: Add the banned check in `confirmSeating`**

After the VIP success block (around line 260, after the `if (client.vipId)` block), add the banned check **before** the final `return` of `confirmSeating`:

```ts
        if (client.bannedId) {
          const banned = prev.dailyBanned.find(b => b.id === client.bannedId);
          if (banned) {
            const outcome = computeBannedSeatingOutcome(banned, prev);
            toastArgs = [banned.consequenceDescription, undefined, 'error'];
            return {
              ...prev,
              currentClient: null,
              cash: outcome.cash,
              morale: outcome.morale,
              rating: outcome.rating,
              gameOver: outcome.gameOver,
              timeMultiplier: outcome.gameOver ? 0 : prev.timeMultiplier,
              seatedBannedIds: [...prev.seatedBannedIds, banned.id],
              logs: [`Banned customer seated: ${banned.name}.`, ...prev.logs].slice(0, 50),
            };
          }
        }
```

This returns early — the banned client is evicted from the desk but not placed at a grid cell.

- [ ] **Step 3: Update `buildInitialState` in `useGameEngine.ts`**

Add imports:
```ts
import { generateDailyBanned, injectBannedReservations } from '../logic/bannedLogic';
import { BANNED_ROSTER } from '../logic/bannedRoster';
```

Replace `buildInitialState`:
```ts
function buildInitialState(difficulty: number): GameState {
  const dailyVips = generateDailyVips(difficulty, VIP_ROSTER);
  const dailyBanned = generateDailyBanned(difficulty, BANNED_ROSTER);
  const reservations = injectBannedReservations(
    dailyBanned,
    injectVipReservations(dailyVips, INITIAL_RESERVATIONS),
  );
  return {
    inGameMinutes: START_TIME,
    timeMultiplier: 1,
    reservations,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: 0,
    rating: 5.0,
    morale: 100,
    logs: ["Welcome to The Maitre D'. The doors are open."],
    dailyVips,
    seatedVipIds: [],
    dailyBanned,
    seatedBannedIds: [],
    gameOver: false,
  };
}
```

- [ ] **Step 4: Type-check and run tests**

```bash
npm run lint && npm run test
```
Expected: zero type errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDecisionActions.ts src/hooks/useGameEngine.ts
git commit -m "feat: fire banned seating consequence in confirmSeating; wire bannedLogic into buildInitialState"
```

---

## Task 8: Clipboard — BannedDossierEntry

**Files:**
- Modify: `src/components/desk/Clipboard.tsx`

Mirror `VipDossierEntry` exactly. Card states: neutral (unseated), alarming red (seated/missed). Consequence badge colors: GAME_OVER=dark red + skull, CASH_FINE=orange + 💸, MORALE=purple + 😵, RATING=amber + ⭐.

- [ ] **Step 1: Add `Banned` import to `Clipboard.tsx`**

```ts
import type { Vip, Banned } from '../../types';
```

- [ ] **Step 2: Add `BannedDossierEntry` component**

After the closing `};` of `VipDossierEntry`, add:

```tsx
interface BannedDossierEntryProps {
  banned: Banned;
  isSeated: boolean;
}

const BannedDossierEntry: React.FC<BannedDossierEntryProps> = ({ banned, isSeated }) => {
  const arrivalText =
    banned.arrivalMO === 'RESERVATION_ALIAS'
      ? `Books as "${banned.aliasFirstName} ${banned.aliasLastName}" · Party of ${banned.expectedPartySize}`
      : banned.arrivalMO === 'WALK_IN'
        ? `Walk-in, no reservation · Party of ${banned.expectedPartySize}`
        : `Late arrival · Party of ${banned.expectedPartySize}`;

  const consequenceBadge = isSeated ? (
    <div className="inline-flex items-center gap-1 rounded bg-red-100 border border-red-400 px-1 py-0.5 w-fit">
      <span className="text-[9px]">⚠️</span>
      <span className="text-[8px] text-red-700 font-semibold">Slipped through</span>
    </div>
  ) : banned.consequenceTier === 'GAME_OVER' ? (
    <div className="inline-flex items-center gap-1 rounded bg-[#1a0a0a] border border-[#5a1010] px-1 py-0.5 w-fit">
      <span className="text-[9px]">☠️</span>
      <span className="text-[8px] text-[#ff6b6b] font-semibold">Game over</span>
    </div>
  ) : banned.consequenceTier === 'CASH_FINE' ? (
    <div className="inline-flex items-center gap-1 rounded bg-orange-50 border border-orange-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">💸</span>
      <span className="text-[8px] text-orange-700 font-semibold">Cash fine</span>
    </div>
  ) : banned.consequenceTier === 'MORALE' ? (
    <div className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">😵</span>
      <span className="text-[8px] text-purple-700 font-semibold">Morale hit</span>
    </div>
  ) : (
    <div className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">⭐</span>
      <span className="text-[8px] text-amber-700 font-semibold">Rating loss</span>
    </div>
  );

  return (
    <div
      className={`relative rounded-md border p-2 flex gap-2 items-start ${
        isSeated
          ? 'border-red-500 bg-red-50'
          : 'bg-white/60 border-[#141414]/10'
      }`}
    >
      <div
        className="shrink-0 w-10 flex items-end justify-center"
        style={{ opacity: isSeated ? 0.6 : 1 }}
      >
        <div className="w-full [&_svg]:w-full [&_svg]:h-auto">
          <ClientAvatar traits={banned.visualTraits} />
        </div>
      </div>
      <div className={`flex flex-col gap-1 flex-1 ${isSeated ? 'opacity-70' : ''}`}>
        <div
          className={`text-[10px] font-bold ${isSeated ? 'text-red-700' : 'text-[#141414]'}`}
        >
          {banned.name}
        </div>
        <div className="text-[8px] text-[#666] leading-tight">
          {arrivalText}
        </div>
        {consequenceBadge}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Fill the Banned tab**

In the `Clipboard` component, replace the Banned "coming soon" placeholder. Find:
```tsx
        ) : (
          <div className="p-2 text-[10px] opacity-40 italic">
            {activeTab} — coming soon
          </div>
        )}
```
Replace with:
```tsx
        ) : activeTab === 'Banned' ? (
          <div className="flex flex-col gap-2 p-1">
            {gameState.dailyBanned.length === 0 ? (
              <p className="text-[10px] opacity-40 italic p-1">
                No trouble expected tonight.
              </p>
            ) : (
              gameState.dailyBanned.map((banned) => (
                <BannedDossierEntry
                  key={banned.id}
                  banned={banned}
                  isSeated={gameState.seatedBannedIds.includes(banned.id)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="p-2 text-[10px] opacity-40 italic">
            {activeTab} — coming soon
          </div>
        )}
```

- [ ] **Step 4: Type-check and full test run**

```bash
npm run lint && npm run test
```
Expected: zero errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/Clipboard.tsx
git commit -m "feat: add BannedDossierEntry and fill Banned tab in Clipboard"
```

---

## Verification Checklist

After all tasks:

- [ ] `npm run lint` — zero TypeScript errors
- [ ] `npm run test` — all tests pass (including new bannedLogic suite + updated vipLogic suite)
- [ ] At difficulty 0: Clipboard Banned tab shows "No trouble expected tonight."
- [ ] At difficulty 1+: Banned tab shows character cards with accessory-bearing avatars
- [ ] Seating a banned client triggers error toast + consequence + "Slipped through" badge on Clipboard card
- [ ] Seating a GAME_OVER banned (`the-dictator`) sets `gameOver = true`, stops time
- [ ] Regular client walk-ins never share traits with banned characters (excluded by `excludeTraits`)
