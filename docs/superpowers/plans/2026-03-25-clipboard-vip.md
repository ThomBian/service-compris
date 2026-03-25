# Clipboard — VIP Dossier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed VIP roster with unique visual traits, arrival mechanics, refusal consequences, and a dossier tab on the Clipboard.

**Architecture:** Three new files (vipRoster.ts, vipLogic.ts, vipLogic.test.ts) form a pure-function layer tested in isolation before wiring into hooks. Types are extended first so TypeScript validates the wiring at every step. The five tasks are sequentially dependent: types → logic → avatar → engine → UI.

**Tech Stack:** TypeScript, React 19, Vitest (unit tests), SVG (avatar accessories)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types.ts` | Modify | Add accessory fields to VisualTraits; add Vip, VipConsequenceTier; add Client.vipId; add GameState.dailyVips/seatedVipIds/gameOver |
| `src/logic/vipRoster.ts` | Create | VIP_ROSTER constant array — 3 initial VIP entries |
| `src/logic/vipLogic.ts` | Create | generateDailyVips, injectVipReservations, computeVipRefusalOutcome, traitsMatch |
| `src/logic/__tests__/vipLogic.test.ts` | Create | 8 unit tests for pure VIP logic + trait exclusion |
| `src/logic/gameLogic.ts` | Modify | generateClientData gains excludeTraits param; do-while retry loop |
| `src/components/scene/ClientAvatar.tsx` | Modify | Add Accessories SVG function for hat/facialHair/neckwear |
| `src/hooks/useGameEngine.ts` | Modify | Lazy useState initializer: generateDailyVips + injectVipReservations on game start |
| `src/hooks/useClientSpawner.ts` | Modify | Pass excludeTraits; detect vip-res- prefix; spawn WALK_IN/LATE VIPs at scheduled time |
| `src/hooks/useDecisionActions.ts` | Modify | VIP consequence on REFUSE; seatedVipIds push + toast on SEATING |
| `src/App.tsx` | Modify | Game-over overlay when gameState.gameOver |
| `src/components/desk/Clipboard.tsx` | Modify | VIP tab with VipDossierEntry list; other tabs keep "coming soon" |

---

## Task 1: Types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add optional accessory fields to VisualTraits**

In `src/types.ts`, after `height: 0 | 1 | 2;` (line 52), add:

```ts
  // VIP-only accessories — undefined on regular clients
  hat?:        0 | 1 | 2;  // 0=top hat, 1=beret, 2=chef's toque
  facialHair?: 0 | 1;       // 0=curled moustache, 1=full beard
  neckwear?:   0 | 1 | 2;  // 0=red tie, 1=gold cravat, 2=red scarf
```

- [ ] **Step 2: Add VipConsequenceTier and Vip types**

After the closing `}` of the `VisualTraits` interface, add:

```ts
export type VipConsequenceTier = 'RATING' | 'CASH_FINE' | 'GAME_OVER';

export interface Vip {
  id: string;
  name: string;
  visualTraits: VisualTraits;
  arrivalMO: 'RESERVATION_ALIAS' | 'WALK_IN' | 'LATE';
  aliasFirstName?: string;
  aliasLastName?: string;
  expectedPartySize: number;
  consequenceTier: VipConsequenceTier;
  cashFinePenalty?: number;
  consequenceDescription: string;
}
```

- [ ] **Step 3: Add vipId to Client**

After `isCaught: boolean;` (line 97), add:

```ts
  vipId?: string;
```

- [ ] **Step 4: Add VIP fields to GameState**

After `logs: string[];` (line 116), add:

```ts
  dailyVips: Vip[];
  seatedVipIds: string[];
  gameOver: boolean;
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npm run lint`
Expected: 0 errors (Vip/VisualTraits changes may surface "property missing" errors in useGameEngine — that's fine, it means the wiring task is needed)

- [ ] **Step 6: Commit**

```bash
git add src/types.ts
git commit -m "feat: extend types for VIP system (VisualTraits accessories, Vip, Client.vipId, GameState fields)"
```

---

## Task 2: VIP roster, pure logic, and trait exclusion (TDD)

**Files:**
- Create: `src/logic/vipRoster.ts`
- Create: `src/logic/vipLogic.ts`
- Create: `src/logic/__tests__/vipLogic.test.ts`
- Modify: `src/logic/gameLogic.ts`

- [ ] **Step 1: Write failing tests**

Create `src/logic/__tests__/vipLogic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateDailyVips, injectVipReservations, computeVipRefusalOutcome } from '../vipLogic';
import { generateClientData } from '../gameLogic';
import type { Vip } from '../../types';
import { START_TIME } from '../../constants';

const FOOD_CRITIC: Vip = {
  id: 'food-critic',
  name: 'The Food Critic',
  visualTraits: { skinTone: 1, hairStyle: 0, hairColor: 5, clothingStyle: 0, clothingColor: 0, height: 1, facialHair: 0, neckwear: 0 },
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Marcel', aliasLastName: 'Dupont',
  expectedPartySize: 2,
  consequenceTier: 'RATING',
  consequenceDescription: 'The review will be devastating.',
};

const THE_OWNER: Vip = {
  id: 'the-owner',
  name: 'The Owner',
  visualTraits: { skinTone: 2, hairStyle: 3, hairColor: 1, clothingStyle: 0, clothingColor: 0, height: 2, hat: 0, neckwear: 1 },
  arrivalMO: 'WALK_IN',
  expectedPartySize: 1,
  consequenceTier: 'GAME_OVER',
  consequenceDescription: "You're fired.",
};

const THE_INSPECTOR: Vip = {
  id: 'the-inspector',
  name: 'The Health Inspector',
  visualTraits: { skinTone: 0, hairStyle: 2, hairColor: 3, clothingStyle: 3, clothingColor: 2, height: 0, facialHair: 1, neckwear: 2 },
  arrivalMO: 'LATE',
  expectedPartySize: 3,
  consequenceTier: 'CASH_FINE',
  cashFinePenalty: 200,
  consequenceDescription: 'The fine will sting.',
};

describe('generateDailyVips', () => {
  it('returns empty array when roster is empty', () => {
    expect(generateDailyVips(1, [])).toEqual([]);
  });

  it('returns exactly 1 VIP from roster regardless of difficulty', () => {
    const result = generateDailyVips(1, [FOOD_CRITIC, THE_OWNER]);
    expect(result).toHaveLength(1);
    expect([FOOD_CRITIC, THE_OWNER]).toContainEqual(result[0]);
  });
});

describe('injectVipReservations', () => {
  it('creates a fake reservation for RESERVATION_ALIAS VIPs', () => {
    const result = injectVipReservations([FOOD_CRITIC], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vip-res-food-critic');
    expect(result[0].firstName).toBe('Marcel');
    expect(result[0].lastName).toBe('Dupont');
    expect(result[0].partySize).toBe(2);
    expect(result[0].time).toBe(START_TIME + 60);
    expect(result[0].arrived).toBe(false);
    expect(result[0].partySeated).toBe(false);
  });

  it('does not inject a reservation for WALK_IN VIPs', () => {
    const result = injectVipReservations([THE_OWNER], []);
    expect(result).toHaveLength(0);
  });
});

describe('generateClientData excludeTraits', () => {
  it('never generates a client whose visualTraits exactly match an excluded VIP', () => {
    const vipTraits = FOOD_CRITIC.visualTraits;
    for (let i = 0; i < 200; i++) {
      const { visualTraits } = generateClientData(undefined, [], undefined, [], [vipTraits]);
      const isMatch =
        visualTraits.skinTone      === vipTraits.skinTone &&
        visualTraits.hairStyle     === vipTraits.hairStyle &&
        visualTraits.hairColor     === vipTraits.hairColor &&
        visualTraits.clothingStyle === vipTraits.clothingStyle &&
        visualTraits.clothingColor === vipTraits.clothingColor &&
        visualTraits.height        === vipTraits.height &&
        visualTraits.hat           === vipTraits.hat &&
        visualTraits.facialHair    === vipTraits.facialHair &&
        visualTraits.neckwear      === vipTraits.neckwear;
      expect(isMatch, `Collision at iteration ${i}`).toBe(false);
    }
  });
});

describe('computeVipRefusalOutcome', () => {
  it('subtracts 1.5 stars for RATING tier, clamped to 0', () => {
    const result = computeVipRefusalOutcome(FOOD_CRITIC, { cash: 100, rating: 3.0, gameOver: false });
    expect(result.rating).toBeCloseTo(1.5);
    expect(result.cash).toBe(100);
    expect(result.gameOver).toBe(false);

    const clamped = computeVipRefusalOutcome(FOOD_CRITIC, { cash: 100, rating: 1.0, gameOver: false });
    expect(clamped.rating).toBe(0);
  });

  it('subtracts cashFinePenalty from cash for CASH_FINE tier, clamped to 0', () => {
    const result = computeVipRefusalOutcome(THE_INSPECTOR, { cash: 300, rating: 4.0, gameOver: false });
    expect(result.cash).toBe(100);
    expect(result.rating).toBe(4.0);

    const clamped = computeVipRefusalOutcome(THE_INSPECTOR, { cash: 50, rating: 4.0, gameOver: false });
    expect(clamped.cash).toBe(0);
  });

  it('sets gameOver to true for GAME_OVER tier', () => {
    const result = computeVipRefusalOutcome(THE_OWNER, { cash: 100, rating: 4.0, gameOver: false });
    expect(result.gameOver).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

Run: `npm run test -- vipLogic`
Expected: FAIL with "Cannot find module '../vipLogic'"

- [ ] **Step 3: Create vipRoster.ts**

Create `src/logic/vipRoster.ts`:

```ts
import type { Vip } from '../types';

export const VIP_ROSTER: Vip[] = [
  {
    id: 'food-critic',
    name: 'The Food Critic',
    visualTraits: {
      skinTone: 1, hairStyle: 0, hairColor: 5,
      clothingStyle: 0, clothingColor: 0, height: 1,
      facialHair: 0, neckwear: 0,
    },
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Marcel',
    aliasLastName: 'Dupont',
    expectedPartySize: 2,
    consequenceTier: 'RATING',
    consequenceDescription: 'The review will be devastating.',
  },
  {
    id: 'the-owner',
    name: 'The Owner',
    visualTraits: {
      skinTone: 2, hairStyle: 3, hairColor: 1,
      clothingStyle: 0, clothingColor: 0, height: 2,
      hat: 0, neckwear: 1,
    },
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    consequenceTier: 'GAME_OVER',
    consequenceDescription: "You're fired.",
  },
  {
    id: 'the-inspector',
    name: 'The Health Inspector',
    visualTraits: {
      skinTone: 0, hairStyle: 2, hairColor: 3,
      clothingStyle: 3, clothingColor: 2, height: 0,
      facialHair: 1, neckwear: 2,
    },
    arrivalMO: 'LATE',
    expectedPartySize: 3,
    consequenceTier: 'CASH_FINE',
    cashFinePenalty: 200,
    consequenceDescription: 'The fine will sting.',
  },
];
```

- [ ] **Step 4: Create vipLogic.ts**

Create `src/logic/vipLogic.ts`:

```ts
import type { Vip, Reservation, VisualTraits } from '../types';
import { START_TIME } from '../constants';

export function generateDailyVips(_difficulty: number, roster: Vip[]): Vip[] {
  if (roster.length === 0) return [];
  return [roster[Math.floor(Math.random() * roster.length)]];
}

export function injectVipReservations(
  dailyVips: Vip[],
  existingReservations: Reservation[],
): Reservation[] {
  const vipReservations: Reservation[] = dailyVips
    .filter((v) => v.arrivalMO === 'RESERVATION_ALIAS')
    .map((v) => ({
      id: 'vip-res-' + v.id,
      time: START_TIME + 60,
      firstName: v.aliasFirstName ?? v.name,
      lastName: v.aliasLastName ?? '',
      partySize: v.expectedPartySize,
      arrived: false,
      partySeated: false,
    }));
  return [...existingReservations, ...vipReservations];
}

export function computeVipRefusalOutcome(
  vip: Vip,
  current: { cash: number; rating: number; gameOver: boolean },
): { cash: number; rating: number; gameOver: boolean } {
  switch (vip.consequenceTier) {
    case 'RATING':
      return { ...current, rating: Math.max(0, current.rating - 1.5) };
    case 'CASH_FINE':
      return { ...current, cash: Math.max(0, current.cash - (vip.cashFinePenalty ?? 0)) };
    case 'GAME_OVER':
      return { ...current, gameOver: true };
  }
}

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
    a.neckwear      === b.neckwear
  );
}
```

- [ ] **Step 5: Add excludeTraits to generateClientData in gameLogic.ts**

In `src/logic/gameLogic.ts`:

1. Add import: `import { traitsMatch } from './vipLogic';`

2. Add `excludeTraits?: VisualTraits[]` as a 5th parameter:

```ts
export const generateClientData = (
  res?: Reservation,
  allReservations: Reservation[] = [],
  currentInGameMinutes?: number,
  spawnedReservationIds: string[] = [],
  excludeTraits?: VisualTraits[],
): { ... } => {
```

3. Replace the `const visualTraits: VisualTraits = { ... }` block (lines 134–141) with a do/while loop:

```ts
  let visualTraits: VisualTraits;
  do {
    visualTraits = {
      skinTone:      Math.floor(Math.random() * 5) as VisualTraits['skinTone'],
      hairStyle:     Math.floor(Math.random() * 5) as VisualTraits['hairStyle'],
      hairColor:     Math.floor(Math.random() * 6) as VisualTraits['hairColor'],
      clothingStyle: Math.floor(Math.random() * 4) as VisualTraits['clothingStyle'],
      clothingColor: Math.floor(Math.random() * 5) as VisualTraits['clothingColor'],
      height:        Math.floor(Math.random() * 3) as VisualTraits['height'],
    };
  } while (excludeTraits?.some((e) => traitsMatch(e, visualTraits)));
```

- [ ] **Step 6: Run tests — confirm all pass**

Run: `npm run test`
Expected: 84 passing (76 existing + 8 new)

- [ ] **Step 7: Commit**

```bash
git add src/logic/vipRoster.ts src/logic/vipLogic.ts src/logic/__tests__/vipLogic.test.ts src/logic/gameLogic.ts
git commit -m "feat: add VIP roster, pure vipLogic functions, and trait exclusion in generateClientData"
```

---

## Task 3: ClientAvatar accessories

**Files:**
- Modify: `src/components/scene/ClientAvatar.tsx`

- [ ] **Step 1: Add Accessories function**

In `src/components/scene/ClientAvatar.tsx`, after the closing `}` of the `Clothing` function (line 107), add:

```tsx
function Accessories({ hat, facialHair, neckwear, hairColor }: {
  hat?: 0 | 1 | 2;
  facialHair?: 0 | 1;
  neckwear?: 0 | 1 | 2;
  hairColor: string;
}) {
  return (
    <>
      {facialHair === 0 && (
        <g>
          <path d="M19 20.5 Q21 18.5 24 19.5 Q27 18.5 29 20.5" stroke={hairColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M19 20.5 Q17.5 22.5 19.5 22" stroke={hairColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M29 20.5 Q30.5 22.5 28.5 22" stroke={hairColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      )}
      {facialHair === 1 && (
        <path d="M15 20 Q15 28 24 30 Q33 28 33 20 Q29 23 24 23.5 Q19 23 15 20Z" fill={hairColor} />
      )}
      {neckwear === 0 && (
        <g>
          <polygon points="22,27 26,27 25,44 24,46 23,44" fill="#c0392b" />
          <polygon points="22,27 26,27 24.5,31 23.5,31" fill="#e74c3c" />
        </g>
      )}
      {neckwear === 1 && (
        <g>
          <path d="M20,27 Q24,33 28,27" fill="#d4af37" stroke="#b8960c" strokeWidth="0.5" />
          <circle cx="24" cy="28.5" r="2" fill="#b8960c" />
        </g>
      )}
      {neckwear === 2 && (
        <path d="M16,27 Q18,30 24,29 Q30,30 32,27 Q30,32 26,33 L24,38 L22,33 Q18,32 16,27Z" fill="#c0392b" />
      )}
      {hat === 0 && (
        <g>
          <rect x="17" y="1" width="14" height="12" rx="1" fill="#1a1a1a" />
          <rect x="12" y="12" width="24" height="3" rx="1" fill="#141414" />
        </g>
      )}
      {hat === 1 && (
        <g>
          <ellipse cx="24" cy="9" rx="13" ry="7" fill="#8B0000" />
          <circle cx="30" cy="7" r="2" fill="#6b0000" />
        </g>
      )}
      {hat === 2 && (
        <g>
          <rect x="18" y="1" width="12" height="12" rx="2" fill="white" stroke="#ddd" strokeWidth="0.5" />
          <rect x="15" y="12" width="18" height="2.5" rx="1" fill="#ddd" />
        </g>
      )}
    </>
  );
}
```

- [ ] **Step 2: Call Accessories inside ClientAvatar SVG**

In the `ClientAvatar` component's SVG (after line 150 `<Clothing ...>`), add the `<Accessories>` call. Place it after `<Clothing>` and before the `{traits.clothingStyle !== 2 && ...}` shoes block:

```tsx
<Accessories
  hat={traits.hat}
  facialHair={traits.facialHair}
  neckwear={traits.neckwear}
  hairColor={hairColor}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run test`
Expected: 0 errors, 84 tests passing

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/ClientAvatar.tsx
git commit -m "feat: render VIP accessories in ClientAvatar (hat, facial hair, neckwear)"
```

---

## Task 4: Game engine wiring

**Files:**
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/hooks/useClientSpawner.ts`
- Modify: `src/hooks/useDecisionActions.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Initialize VIP state in useGameEngine**

In `src/hooks/useGameEngine.ts`:

1. Add imports:
```ts
import { generateDailyVips, injectVipReservations } from '../logic/vipLogic';
import { VIP_ROSTER } from '../logic/vipRoster';
```

2. Change `useState<GameState>({ ... })` to a lazy initializer:

```ts
const [gameState, setGameState] = useState<GameState>(() => {
  const dailyVips = generateDailyVips(1, VIP_ROSTER);
  const reservations = injectVipReservations(dailyVips, INITIAL_RESERVATIONS);
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
    gameOver: false,
  };
});
```

- [ ] **Step 2: Wire VIP spawning in useClientSpawner**

In `src/hooks/useClientSpawner.ts`:

1. Add imports:
```ts
import { Client, ClientType, PhysicalState, DialogueState, LieType, Vip } from '../types';
import { START_TIME } from '../constants';
```

2. In `spawnClient`, pass `excludeTraits` to `generateClientData` and detect VIP reservation alias:

```ts
const spawnClient = useCallback((res?: Reservation) => {
  setGameState(prev => {
    const excludeTraits = prev.dailyVips.map(v => v.visualTraits);
    const clientData = generateClientData(
      res,
      prev.reservations,
      prev.inGameMinutes,
      prev.spawnedReservationIds,
      excludeTraits,
    );
    let newClient = createNewClient({
      data: clientData,
      currentMinutes: prev.inGameMinutes,
      res,
    });

    // VIP RESERVATION_ALIAS: override visualTraits + set vipId
    if (res?.id.startsWith('vip-res-')) {
      const vipId = res.id.slice('vip-res-'.length);
      const vip = prev.dailyVips.find(v => v.id === vipId);
      if (vip) {
        newClient = { ...newClient, visualTraits: vip.visualTraits, vipId: vip.id };
      }
    }

    const nextSpawned = res
      ? [...prev.spawnedReservationIds, res.id]
      : prev.spawnedReservationIds;
    const nextReservations = res != null
      ? prev.reservations.map(r => r.id === res.id ? { ...r, legitQueuedAt: prev.inGameMinutes } : r)
      : prev.reservations;

    return {
      ...prev,
      queue: [...prev.queue, newClient],
      spawnedReservationIds: nextSpawned,
      reservations: nextReservations,
    };
  });
}, [setGameState]);
```

3. Add a `spawnVipWalkIn` callback for WALK_IN and LATE VIPs:

```ts
const spawnVipWalkIn = useCallback((v: Vip) => {
  setGameState(prev => {
    const walkinKey = 'vip-walkin-' + v.id;
    if (prev.spawnedReservationIds.includes(walkinKey)) return prev;
    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      type: ClientType.WALK_IN,
      patience: 100,
      physicalState: PhysicalState.IN_QUEUE,
      dialogueState: DialogueState.AWAITING_GREETING,
      spawnTime: prev.inGameMinutes,
      trueFirstName: v.name,
      trueLastName: '',
      truePartySize: v.expectedPartySize,
      isLate: v.arrivalMO === 'LATE',
      lieType: LieType.NONE,
      hasLied: false,
      visualTraits: v.visualTraits,
      isCaught: false,
      vipId: v.id,
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

4. In the `useEffect`, after the random walk-in block, add the WALK_IN/LATE VIP scheduled spawn check:

```ts
gameState.dailyVips
  .filter(v => v.arrivalMO === 'WALK_IN' || v.arrivalMO === 'LATE')
  .forEach(v => {
    const walkinKey = 'vip-walkin-' + v.id;
    const spawnAt = v.arrivalMO === 'LATE' ? START_TIME + 91 : START_TIME + 90;
    if (
      gameState.inGameMinutes >= spawnAt &&
      !gameState.spawnedReservationIds.includes(walkinKey)
    ) {
      spawnVipWalkIn(v);
    }
  });
```

5. Add `gameState.dailyVips` and `spawnVipWalkIn` to the `useEffect` dependency array.

- [ ] **Step 3: Add VIP consequence on REFUSE in useDecisionActions**

In `src/hooks/useDecisionActions.ts`:

1. Add import:
```ts
import { computeVipRefusalOutcome } from '../logic/vipLogic';
```

2. In `handleDecision`, inside `setGameState`, add a VIP check **before** the existing `handleRefusedClient` call:

```ts
// VIP REFUSE — short-circuit normal logic
if (deskClient.vipId) {
  const vip = prev.dailyVips.find(v => v.id === deskClient.vipId);
  if (vip) {
    const outcome = computeVipRefusalOutcome(vip, {
      cash: prev.cash,
      rating: prev.rating,
      gameOver: prev.gameOver,
    });
    toastArgs = [vip.consequenceDescription, undefined, 'error'];
    return {
      ...prev,
      currentClient: null,
      cash: outcome.cash,
      rating: outcome.rating,
      gameOver: outcome.gameOver,
      logs: [`VIP refused: ${vip.name}.`, ...prev.logs].slice(0, 50),
    };
  }
}
```

- [ ] **Step 4: Push seatedVipIds and fire success toast in confirmSeating**

In `confirmSeating`, inside `setGameState`, after `const nextReservations = ...`:

```ts
const nextSeatedVipIds = client.vipId
  ? [...prev.seatedVipIds, client.vipId]
  : prev.seatedVipIds;

if (client.vipId) {
  const vip = prev.dailyVips.find(v => v.id === client.vipId);
  if (vip) {
    toastArgs = [`Well handled — ${vip.name} has been seated.`, undefined, 'success'];
  }
}
```

And add `seatedVipIds: nextSeatedVipIds` to the returned state object.

- [ ] **Step 5: Add game-over overlay in App.tsx**

In `GameContent`, inside the main `div`, after the `gameState.timeMultiplier === 0` pause overlay block, add:

```tsx
{gameState.gameOver && (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#141414]/80">
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-[#141414] bg-[#E4E3E0] px-8 py-6 text-center shadow-[4px_4px_0_0_rgba(20,20,20,1)]">
      <span className="text-4xl">☠️</span>
      <span className="text-2xl font-bold uppercase tracking-[0.2em]">Game Over</span>
      <span className="text-sm opacity-60">You have been fired.</span>
    </div>
  </div>
)}
```

- [ ] **Step 6: Lint and run tests**

Run: `npm run lint && npm run test`
Expected: 0 errors, 84 tests passing

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useGameEngine.ts src/hooks/useClientSpawner.ts src/hooks/useDecisionActions.ts src/App.tsx
git commit -m "feat: wire VIP initialization, spawning, refusal consequences, seating success, and game-over overlay"
```

---

## Task 5: Clipboard VIP tab

**Files:**
- Modify: `src/components/desk/Clipboard.tsx`

- [ ] **Step 1: Rewrite Clipboard with VIP tab**

Replace the full contents of `src/components/desk/Clipboard.tsx`:

```tsx
import React from 'react';
import { Clipboard as ClipboardIcon } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ClientAvatar } from '../scene/ClientAvatar';
import type { Vip } from '../../types';

const TABS = ['Menu', 'VIPs', 'Banned'] as const;

function VipDossierEntry({ vip, isSeated }: { vip: Vip; isSeated: boolean }) {
  const arrivalText =
    vip.arrivalMO === 'RESERVATION_ALIAS'
      ? `Books as "${vip.aliasFirstName} ${vip.aliasLastName}" · Party of ${vip.expectedPartySize}`
      : vip.arrivalMO === 'WALK_IN'
      ? `Walk-in, no reservation · Party of ${vip.expectedPartySize}`
      : `Late arrival · Party of ${vip.expectedPartySize}`;

  const consequenceBadge = isSeated ? (
    <div className="inline-flex items-center gap-1 rounded bg-green-100 border border-green-400 px-1 py-0.5 w-fit">
      <span className="text-[9px]">✓</span>
      <span className="text-[8px] text-green-700 font-semibold">Seated</span>
    </div>
  ) : vip.consequenceTier === 'GAME_OVER' ? (
    <div className="inline-flex items-center gap-1 rounded bg-[#1a0a0a] border border-[#5a1010] px-1 py-0.5 w-fit">
      <span className="text-[9px]">☠️</span>
      <span className="text-[8px] text-[#ff6b6b] font-semibold">Game over</span>
    </div>
  ) : vip.consequenceTier === 'CASH_FINE' ? (
    <div className="inline-flex items-center gap-1 rounded bg-orange-50 border border-orange-300 px-1 py-0.5 w-fit">
      <span className="text-[9px]">💸</span>
      <span className="text-[8px] text-orange-700 font-semibold">Cash fine</span>
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
        isSeated ? 'border-green-400 bg-green-50' : 'border-[#e0d8cc] bg-[#fffdf8]'
      }`}
    >
      <div
        className="shrink-0 w-10 h-10 overflow-hidden flex items-end justify-center"
        style={{ opacity: isSeated ? 0.6 : 1 }}
      >
        <ClientAvatar traits={vip.visualTraits} />
      </div>
      <div className={`flex flex-col gap-1 flex-1 ${isSeated ? 'opacity-70' : ''}`}>
        <div className={`text-[10px] font-bold ${isSeated ? 'text-green-700' : 'text-[#141414]'}`}>
          {vip.name}
        </div>
        <div className="text-[8px] text-[#666] leading-tight">{arrivalText}</div>
        {consequenceBadge}
      </div>
      {isSeated && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-700 flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">✓</span>
        </div>
      )}
    </div>
  );
}

export const Clipboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<(typeof TABS)[number]>('Menu');
  const { gameState } = useGame();

  return (
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <ClipboardIcon size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Clipboard</span>
      </div>
      <div className="flex gap-1 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'bg-[#141414]/10 hover:bg-[#141414]/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'VIPs' ? (
          <div className="flex flex-col gap-2 p-1">
            {gameState.dailyVips.length === 0 ? (
              <p className="text-[10px] opacity-40 italic p-1">No VIPs expected tonight.</p>
            ) : (
              gameState.dailyVips.map(vip => (
                <VipDossierEntry
                  key={vip.id}
                  vip={vip}
                  isSeated={gameState.seatedVipIds.includes(vip.id)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="p-2 text-[10px] opacity-40 italic">{activeTab} — coming soon</div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Lint and run tests**

Run: `npm run lint && npm run test`
Expected: 0 errors, 84 tests passing

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, open the app, and verify:
- VIPs tab shows the 1 nightly VIP with mini portrait, arrival info, and consequence badge
- Refusing a VIP fires the consequence toast (rating hit, cash fine, or game-over overlay)
- Seating a VIP highlights the entry green with a ✓ badge

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/Clipboard.tsx
git commit -m "feat: Clipboard VIP dossier tab with seated state highlight"
```
