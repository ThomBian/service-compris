# Factions & Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 lore characters (Donny Tromp, Gordon Angry, Mr. Feast, Phantom Eater, Chef Balzac, Sodium Bae), a new `OversizeVip` behavior class, faction-weighted spawn bias driven by campaign path scores, and a Factions tab on the Clipboard.

**Architecture:** Add `factionPath` to `CharacterDefinition` and `FACTION_BOOST`/`MAX_PATH_SCORE` constants; create `OversizeVip`; expand `CHARACTER_ROSTER`; update `generateDailyCharacters` to accept optional `PathScores`; thread `pathScores` from `useCampaign` through `GameProvider` → `useGameEngine` → `buildInitialState`; add a Factions tab to `Clipboard.tsx` that reads `pathScores` from context.

**Tech Stack:** TypeScript, React 19, Vitest, Tailwind CSS 4

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/types.ts` | `factionPath?` on `CharacterDefinition`; `neckwear: 3` on `VisualTraits` |
| Modify | `src/constants.ts` | Add `FACTION_BOOST`, `MAX_PATH_SCORE` |
| Create | `src/logic/characters/OversizeVip.ts` | New behavior class |
| Modify | `src/logic/characters/factory.ts` | Register `OVERSIZE_VIP` |
| Modify | `src/components/scene/ClientAvatar.tsx` | Render `neckwear === 3` |
| Modify | `src/logic/characterRoster.ts` | `factionPath` on all entries; 6 new definitions; updated `generateDailyCharacters` signature |
| Modify | `src/logic/gameLogic.ts` | Pass `pathScores` to `generateDailyCharacters` in `buildInitialState` |
| Modify | `src/context/GameContext.tsx` | Add `pathScores` to context |
| Modify | `src/hooks/useGameEngine.ts` | Accept `pathScores` param; pass to `buildInitialState` |
| Modify | `src/App.tsx` | Pass `pathScores` to `GameProvider` |
| Modify | `src/components/desk/Clipboard.tsx` | Factions tab with intensity indicator |
| Modify | `src/logic/__tests__/characterRoster.test.ts` | Tests for faction spawn bias and new characters |

---

## Task 1: Extend types and constants

**Files:**
- Modify: `src/types.ts`
- Modify: `src/constants.ts`

- [ ] **Step 1: Add `factionPath` to `CharacterDefinition` and expand `neckwear` union in `src/types.ts`**

Find the `CharacterDefinition` interface. Add `factionPath` after `consequenceDescription`:

```ts
// in CharacterDefinition, after refusalDescription?
factionPath?: 'underworld' | 'michelin' | 'viral';
```

Find the `VisualTraits` interface. Change the `neckwear` line:

```ts
// Before:
neckwear?:   0 | 1 | 2;  // 0=red tie, 1=gold cravat, 2=red scarf
// After:
neckwear?:   0 | 1 | 2 | 3;  // 0=red tie, 1=gold cravat, 2=red scarf, 3=long red tie
```

- [ ] **Step 2: Add faction constants to `src/constants.ts`**

Add at the end, before the closing of `INITIAL_RESERVATIONS` (after `LAST_CALL_RATING_PENALTY`):

```ts
/** Maximum additive probability increase from faction path score at MAX_PATH_SCORE. */
export const FACTION_BOOST = 0.4;
/** Path score value treated as fully committed to a faction (spawn probability capped at 0.95). */
export const MAX_PATH_SCORE = 10;
```

- [ ] **Step 3: Run type-check to verify no regressions**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/constants.ts
git commit -m "feat: add factionPath to CharacterDefinition, extend neckwear union, add faction constants"
```

---

## Task 2: OversizeVip class + factory registration

**Files:**
- Create: `src/logic/characters/OversizeVip.ts`
- Modify: `src/logic/characters/factory.ts`
- Test: `src/logic/__tests__/characterRoster.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/logic/__tests__/characterRoster.test.ts`, inside `describe('createCharacter factory', ...)`:

```ts
it('creates OversizeVip for OVERSIZE_VIP behaviorType', () => {
  const def = CHARACTER_ROSTER.find(c => c.id === 'donny-tromp')!;
  // donny-tromp doesn't exist yet — this test will fail until Task 3 adds it
  // For now test with a mock def
  const mockDef = { ...CHARACTER_ROSTER[0], behaviorType: 'OVERSIZE_VIP' };
  const { OversizeVip } = require('../characters/OversizeVip');
  expect(createCharacter(mockDef)).toBeInstanceOf(OversizeVip);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test -- characterRoster
```

Expected: FAIL — `OversizeVip` module not found or factory throws unknown behaviorType.

- [ ] **Step 3: Create `src/logic/characters/OversizeVip.ts`**

```ts
import { type GameState } from '../../types';
import { VipCharacter } from './VipCharacter';

export class OversizeVip extends VipCharacter {
  onSeated(state: GameState): Partial<GameState> {
    return { cash: state.cash + (this.def.cashBonus ?? 0) };
  }

  onRefused(state: GameState): Partial<GameState> {
    return {
      rating: Math.max(0, state.rating - (this.def.ratingPenalty ?? 0)),
      morale: Math.max(0, state.morale - (this.def.moralePenalty ?? 0)),
    };
  }
}
```

- [ ] **Step 4: Register in `src/logic/characters/factory.ts`**

```ts
import type { CharacterDefinition } from '../../types';
import type { SpecialCharacter } from './SpecialCharacter';
import { BypassQueueVip } from './BypassQueueVip';
import { AuraDrainVip } from './AuraDrainVip';
import { StandardVip } from './StandardVip';
import { StandardBanned } from './StandardBanned';
import { OversizeVip } from './OversizeVip';

export function createCharacter(def: CharacterDefinition): SpecialCharacter {
  switch (def.behaviorType) {
    case 'BYPASS_QUEUE':    return new BypassQueueVip(def);
    case 'AURA_DRAIN':      return new AuraDrainVip(def);
    case 'STANDARD_VIP':    return new StandardVip(def);
    case 'STANDARD_BANNED': return new StandardBanned(def);
    case 'OVERSIZE_VIP':    return new OversizeVip(def);
    default: throw new Error(`Unknown behaviorType: ${def.behaviorType}`);
  }
}
```

- [ ] **Step 5: Simplify the test to not use `require`**

Replace the test written in Step 1 with:

```ts
import { OversizeVip } from '../characters/OversizeVip';

// inside describe('createCharacter factory', ...)
it('creates OversizeVip for OVERSIZE_VIP behaviorType', () => {
  const mockDef = { ...CHARACTER_ROSTER[0], behaviorType: 'OVERSIZE_VIP' };
  expect(createCharacter(mockDef)).toBeInstanceOf(OversizeVip);
});
```

Add the import at the top of the test file alongside the existing imports.

- [ ] **Step 6: Run tests to confirm passing**

```bash
npm run test -- characterRoster
```

Expected: all factory tests pass.

- [ ] **Step 7: Add unit tests for OversizeVip behavior**

Add a new `describe` block to `src/logic/__tests__/characterRoster.test.ts`:

```ts
import { OversizeVip } from '../characters/OversizeVip';
import type { CharacterDefinition, GameState } from '../../types';

// Minimal GameState for testing
const baseState = (): Partial<GameState> => ({
  cash: 100,
  rating: 4.0,
  morale: 80,
});

describe('OversizeVip', () => {
  const def: Partial<CharacterDefinition> = {
    id: 'test-oversize',
    behaviorType: 'OVERSIZE_VIP',
    cashBonus: 300,
    ratingPenalty: 1.0,
    moralePenalty: 15,
  };
  const vip = new OversizeVip(def as CharacterDefinition);

  it('onSeated adds cashBonus to cash', () => {
    const result = vip.onSeated(baseState() as GameState);
    expect(result.cash).toBe(400);
  });

  it('onRefused applies ratingPenalty and moralePenalty', () => {
    const result = vip.onRefused(baseState() as GameState);
    expect(result.rating).toBe(3.0);
    expect(result.morale).toBe(65);
  });

  it('onRefused floors rating and morale at 0', () => {
    const result = vip.onRefused({ cash: 0, rating: 0.5, morale: 5 } as GameState);
    expect(result.rating).toBe(0);
    expect(result.morale).toBe(0);
  });
});
```

- [ ] **Step 8: Run tests to confirm all pass**

```bash
npm run test -- characterRoster
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/logic/characters/OversizeVip.ts src/logic/characters/factory.ts src/logic/__tests__/characterRoster.test.ts
git commit -m "feat: add OversizeVip behavior class and factory registration"
```

---

## Task 3: Add neckwear:3 to ClientAvatar

**Files:**
- Modify: `src/components/scene/ClientAvatar.tsx`

This must be done before Task 4 adds Donny Tromp to the roster, otherwise `visualTraits: { neckwear: 3 }` would silently render nothing.

- [ ] **Step 1: Update `Accessories` function signature and render `neckwear === 3`**

Find the `Accessories` function in `src/components/scene/ClientAvatar.tsx`. Change the `neckwear` prop type and add the new render block after the `neckwear === 2` block:

```ts
// Change prop type:
neckwear?: 0 | 1 | 2 | 3;

// Add after {neckwear === 2 && ...}:
{neckwear === 3 && (
  // Long red tie — same shape as neckwear:0 but extended further down
  <g>
    <polygon points="22,27 26,27 25,50 24,53 23,50" fill="#c0392b" />
    <polygon points="22,27 26,27 24.5,31 23.5,31" fill="#e74c3c" />
  </g>
)}
```

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/ClientAvatar.tsx
git commit -m "feat: add neckwear:3 (long red tie) to ClientAvatar"
```

---

## Task 4: Expand CHARACTER_ROSTER with 6 lore characters and factionPath

**Files:**
- Modify: `src/logic/characterRoster.ts`
- Test: `src/logic/__tests__/characterRoster.test.ts`

- [ ] **Step 1: Write failing tests for new characters**

Add to `src/logic/__tests__/characterRoster.test.ts`, inside `describe('CHARACTER_ROSTER', ...)`:

```ts
it('contains all 6 new lore characters', () => {
  const ids = CHARACTER_ROSTER.map(c => c.id);
  expect(ids).toContain('donny-tromp');
  expect(ids).toContain('gordon-angry');
  expect(ids).toContain('mr-feast');
  expect(ids).toContain('the-phantom-eater');
  expect(ids).toContain('chef-balzac');
  expect(ids).toContain('sodium-bae');
});

it('all faction-aligned characters have valid factionPath', () => {
  const factionChars = CHARACTER_ROSTER.filter(c => c.factionPath !== undefined);
  factionChars.forEach(c => {
    expect(['underworld', 'michelin', 'viral']).toContain(c.factionPath);
  });
});

it('the-syndicate and manu-macaroon are underworld', () => {
  expect(CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')?.factionPath).toBe('underworld');
  expect(CHARACTER_ROSTER.find(c => c.id === 'manu-macaroon')?.factionPath).toBe('underworld');
});

it('gordon-angry is michelin, mr-feast and sodium-bae are viral', () => {
  expect(CHARACTER_ROSTER.find(c => c.id === 'gordon-angry')?.factionPath).toBe('michelin');
  expect(CHARACTER_ROSTER.find(c => c.id === 'mr-feast')?.factionPath).toBe('viral');
  expect(CHARACTER_ROSTER.find(c => c.id === 'sodium-bae')?.factionPath).toBe('viral');
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- characterRoster
```

Expected: FAIL on the four new tests.

- [ ] **Step 3: Update `src/logic/characterRoster.ts` — add `factionPath` to existing characters**

For each existing character definition, add `factionPath` as specified:

```ts
// the-syndicate — add:
factionPath: 'underworld',

// manu-macaroon — add:
factionPath: 'underworld',

// food-critic — add:
factionPath: 'michelin',

// the-owner — leave factionPath absent (independent)

// the-inspector — add:
factionPath: 'michelin',

// fake-hipster, drunk-group, small-spender, the-dictator — leave absent (independent)

// fake-influencer — add:
factionPath: 'viral',
```

- [ ] **Step 4: Add the 6 new character definitions to `CHARACTER_ROSTER`**

Append after the last existing `BANNED` entry (after `the-dictator`):

```ts
// ── Lore VIPs (new) ────────────────────────────────────────────────────────
{
  id: 'donny-tromp',
  name: 'Donny Tromp',
  role: 'VIP',
  behaviorType: 'OVERSIZE_VIP',
  factionPath: undefined,
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Donald',
  aliasLastName: 'Tromp',
  reservedPartySize: 2,
  expectedPartySize: 4,
  clueText: 'Booking for 2, but the red tie goes past his knees. He never comes alone.',
  visualTraits: { skinTone: 4, hairStyle: 2, hairColor: 1, clothingStyle: 0, clothingColor: 4, height: 2, neckwear: 3 },
  cashBonus: 300,
  ratingPenalty: 1.0,
  moralePenalty: 15,
  consequenceDescription: 'Tromp storms out. Loud complaints all evening. −1 star.',
  refusalDescription: 'He would have paid triple. Next time.',
},
{
  id: 'gordon-angry',
  name: 'Gordon Angry',
  role: 'VIP',
  behaviorType: 'STANDARD_VIP',
  factionPath: 'michelin',
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Gord',
  aliasLastName: 'Ramsden',
  expectedPartySize: 2,
  clueText: 'He books under aliases. Look for the man holding two slices of white bread.',
  visualTraits: { skinTone: 0, hairStyle: 1, hairColor: 2, clothingStyle: 0, clothingColor: 1, height: 2, facialHair: 0 },
  ratingPenalty: 2.0,
  consequenceDescription: 'Gordon Angry reviews the restaurant mid-meal. −2 stars.',
  refusalDescription: 'The bread man was turned away. Fortunate.',
},
{
  id: 'mr-feast',
  name: 'Mr. Feast',
  role: 'VIP',
  behaviorType: 'BYPASS_QUEUE',
  factionPath: 'viral',
  arrivalMO: 'BYPASS',
  expectedPartySize: 1,
  clueText: 'Neon hoodie. Permanent open mouth. He will push to the front.',
  visualTraits: { skinTone: 3, hairStyle: 4, hairColor: 3, clothingStyle: 1, clothingColor: 2, height: 1 },
  cashBonus: 400,
  moralePenalty: 10,
  consequenceDescription: 'Mr. Feast leaves in a rage. Staff morale suffers. −10 morale.',
  refusalDescription: 'Turned away the influencer. No viral moment tonight.',
},
// ── Lore Banned (new) ──────────────────────────────────────────────────────
{
  id: 'the-phantom-eater',
  name: 'The Phantom Eater',
  role: 'BANNED',
  behaviorType: 'STANDARD_BANNED',
  factionPath: undefined,
  arrivalMO: 'WALK_IN',
  expectedPartySize: 1,
  clueText: 'Different disguise each time. Always the same chipped gold tooth.',
  visualTraits: { skinTone: 2, hairStyle: 0, hairColor: 4, clothingStyle: 2, clothingColor: 3, height: 1 },
  cashPenalty: 120,
  consequenceDescription: 'The Phantom Eater finishes every course and leaves €0. −€120.',
  refusalDescription: 'Not tonight, Phantom.',
},
{
  id: 'chef-balzac',
  name: 'Chef Balzac',
  role: 'BANNED',
  behaviorType: 'STANDARD_BANNED',
  factionPath: undefined,
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Balzac',
  aliasLastName: 'Dupuis',
  reservedPartySize: 3,
  expectedPartySize: 4,
  clueText: 'He hides in legitimate parties. Look for the fake nose and glasses at the back.',
  visualTraits: { skinTone: 1, hairStyle: 3, hairColor: 0, clothingStyle: 0, clothingColor: 0, height: 0, glasses: 0, facialHair: 1 },
  ratingPenalty: 2.5,
  consequenceDescription: 'Chef Balzac sabotages the kitchen mid-service. −2.5 stars.',
  refusalDescription: 'Whole party turned away — collateral damage, but the saboteur is gone.',
},
{
  id: 'sodium-bae',
  name: 'Sodium Bae',
  role: 'BANNED',
  behaviorType: 'STANDARD_BANNED',
  factionPath: 'viral',
  arrivalMO: 'WALK_IN',
  expectedPartySize: 1,
  clueText: 'Claims to be a VIP. Not on the list. Arm always raised in a salt sprinkle pose.',
  visualTraits: { skinTone: 3, hairStyle: 2, hairColor: 3, clothingStyle: 1, clothingColor: 2, height: 1, glasses: 1 },
  moralePenalty: 20,
  cashPenalty: 60,
  consequenceDescription: 'Sodium Bae salts neighbouring tables. Guests leave early. −€60, −20 morale.',
  refusalDescription: 'No salt sprinkled tonight.',
},
```

- [ ] **Step 5: Run tests to confirm all pass**

```bash
npm run test -- characterRoster
```

Expected: all tests pass including the 4 new ones.

- [ ] **Step 6: Commit**

```bash
git add src/logic/characterRoster.ts src/logic/__tests__/characterRoster.test.ts
git commit -m "feat: add 6 lore characters and factionPath to CHARACTER_ROSTER"
```

---

## Task 5: Faction spawn bias in generateDailyCharacters

**Files:**
- Modify: `src/logic/characterRoster.ts`
- Test: `src/logic/__tests__/characterRoster.test.ts`

- [ ] **Step 1: Write failing tests for faction spawn bias**

Add to `src/logic/__tests__/characterRoster.test.ts`:

```ts
import { FACTION_BOOST, MAX_PATH_SCORE, SPAWN_PROBABILITY } from '../../constants';
import type { PathScores } from '../../types/campaign';

describe('generateDailyCharacters — faction spawn bias', () => {
  it('behaves identically to current when pathScores is omitted', () => {
    // Run 50 times — should never crash or change structure
    for (let i = 0; i < 50; i++) {
      const result = generateDailyCharacters(2, CHARACTER_ROSTER);
      expect(result.length).toBeLessThanOrEqual(CHARACTER_ROSTER.length);
      const ids = result.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('at max path score, faction characters spawn more often than base probability', () => {
    const maxScores: PathScores = { underworld: MAX_PATH_SCORE, michelin: 0, viral: 0 };
    const underworldChars = CHARACTER_ROSTER.filter(c => c.factionPath === 'underworld');
    const base = SPAWN_PROBABILITY[2]; // 0.7 at difficulty 2

    let totalSpawned = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const result = generateDailyCharacters(2, underworldChars, maxScores);
      totalSpawned += result.length;
    }
    const avgRate = totalSpawned / (runs * underworldChars.length);
    // At max score: p = min(0.95, 0.7 + 0.4) = 0.95 — expect average > base
    expect(avgRate).toBeGreaterThan(base);
  });

  it('returns empty array at difficulty 0 even with pathScores', () => {
    const scores: PathScores = { underworld: 10, michelin: 10, viral: 10 };
    expect(generateDailyCharacters(0, CHARACTER_ROSTER, scores)).toEqual([]);
  });

  it('never returns more characters than roster size with pathScores', () => {
    const scores: PathScores = { underworld: 10, michelin: 10, viral: 10 };
    for (let i = 0; i < 20; i++) {
      const result = generateDailyCharacters(3, CHARACTER_ROSTER, scores);
      expect(result.length).toBeLessThanOrEqual(CHARACTER_ROSTER.length);
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- characterRoster
```

Expected: FAIL — `generateDailyCharacters` doesn't accept a third argument yet.

- [ ] **Step 3: Update `generateDailyCharacters` in `src/logic/characterRoster.ts`**

Add the `PathScores` import at the top of the file:

```ts
import type { CharacterDefinition, Reservation } from '../types';
import type { PathScores } from '../types/campaign';
import { START_TIME, SPAWN_PROBABILITY, FACTION_BOOST, MAX_PATH_SCORE } from '../constants';
```

Replace the existing `generateDailyCharacters` function body:

```ts
export function generateDailyCharacters(
  difficulty: number,
  roster: CharacterDefinition[],
  pathScores?: PathScores,
): CharacterDefinition[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  return [...roster].sort(() => Math.random() - 0.5).filter(char => {
    const boost =
      char.factionPath && pathScores
        ? (pathScores[char.factionPath] / MAX_PATH_SCORE) * FACTION_BOOST
        : 0;
    return Math.random() < Math.min(0.95, p + boost);
  });
}
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
npm run test -- characterRoster
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/characterRoster.ts src/logic/__tests__/characterRoster.test.ts
git commit -m "feat: faction spawn bias in generateDailyCharacters via pathScores param"
```

---

## Task 6: Thread pathScores to buildInitialState

**Files:**
- Modify: `src/logic/gameLogic.ts`
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/context/GameContext.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `buildInitialState` in `src/logic/gameLogic.ts`**

The function signature currently is:

```ts
export function buildInitialState(
  difficulty: number,
  persist?: PersistState,
  rules: ActiveRule[] = [],
  characterIds?: string[],
): GameState
```

Add `pathScores` as a fifth parameter and use it in the `generateDailyCharacters` call:

```ts
import type { PathScores } from '../types/campaign';

export function buildInitialState(
  difficulty: number,
  persist?: PersistState,
  rules: ActiveRule[] = [],
  characterIds?: string[],
  pathScores?: PathScores,
): GameState {
  const nightNumber = persist?.nightNumber ?? 1;
  const rating = persist ? Math.max(1.0, persist.rating) : 5.0;

  const dailyChars = characterIds && characterIds.length > 0
    ? CHARACTER_ROSTER.filter(c => characterIds.includes(c.id))
    : generateDailyCharacters(difficulty, CHARACTER_ROSTER, pathScores);

  // ... rest unchanged
```

- [ ] **Step 2: Update `useGameEngine` in `src/hooks/useGameEngine.ts`**

Add `pathScores` to the function signature and pass it to `buildInitialState`. The hook currently takes one optional `incrementPathScore` param:

```ts
import type { PathScores } from '../types/campaign';

export function useGameEngine(
  incrementPathScore?: (path: CampaignPath, delta: number) => void,
  pathScores?: PathScores,
) {
  const [gameState, setGameState] = useState<GameState>(() => buildInitialState(0));

  const resetGame = useCallback((difficulty: number, persist?: PersistState) => {
    setGameState(buildInitialState(difficulty, persist, [], undefined, pathScores));
  }, [pathScores]);

  // rest unchanged...
```

- [ ] **Step 3: Update `GameContext` to accept and expose `pathScores`**

In `src/context/GameContext.tsx`:

```ts
import type { CampaignPath, PathScores } from '../types/campaign';

interface GameProviderProps {
  children: ReactNode;
  incrementPathScore?: (path: CampaignPath, delta: number) => void;
  pathScores?: PathScores;
}

export function GameProvider({ children, incrementPathScore, pathScores }: GameProviderProps) {
  const engine = useGameEngine(incrementPathScore, pathScores);

  return (
    <GameContext.Provider value={engine}>
      {children}
    </GameContext.Provider>
  );
}
```

Also add `pathScores` to `GameContextType` so `Clipboard` can read it:

```ts
interface GameContextType {
  gameState: GameState;
  pathScores?: PathScores;
  // ... existing fields unchanged
}
```

And expose it from `useGameEngine`'s return value by passing it through:

In `useGameEngine`, add to the return object:

```ts
return {
  gameState,
  pathScores,  // pass through so context consumers can read it
  askQuestion,
  // ...rest unchanged
};
```

- [ ] **Step 4: Pass `pathScores` from `useCampaign` in `src/App.tsx`**

Find the `<GameProvider>` usage (line ~278). Pass `pathScores`:

```tsx
<GameProvider
  incrementPathScore={campaign.incrementPathScore}
  pathScores={campaign.campaignState.pathScores}
>
```

- [ ] **Step 5: Run type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Run all tests**

```bash
npm run test
```

Expected: all existing tests pass (the signature change is backward-compatible — `pathScores` is optional).

- [ ] **Step 7: Commit**

```bash
git add src/logic/gameLogic.ts src/hooks/useGameEngine.ts src/context/GameContext.tsx src/App.tsx
git commit -m "feat: thread pathScores through GameProvider to buildInitialState for faction spawn bias"
```

---

## Task 7: Factions tab in Clipboard

**Files:**
- Modify: `src/components/desk/Clipboard.tsx`

- [ ] **Step 1: Add `"Factions"` to the `TABS` constant**

```ts
const TABS = [
  "VIPs",
  "Banned",
  "Factions",
  "Log",
] as const;
```

- [ ] **Step 2: Add the `FACTION_DISPLAY` static registry and `factionIntensity` helper inside the file, before the `Clipboard` component**

Add these imports at the top of the file:

```ts
import type { CampaignPath, PathScores } from '../../types/campaign';
import { MAX_PATH_SCORE } from '../../constants';
```

Add before the `Clipboard` component:

```ts
const FACTION_DISPLAY: Array<{
  path: CampaignPath;
  name: string;
  icon: string;
  markerText: string;
  accentColor: string;
  borderColor: string;
  bgColor: string;
}> = [
  {
    path: 'underworld',
    name: 'The Syndicate',
    icon: '🤵',
    markerText: 'Matching pinstripe suits. Walk-in, party of 4. No reservation.',
    accentColor: 'text-yellow-700',
    borderColor: 'border-yellow-400',
    bgColor: 'bg-yellow-50',
  },
  {
    path: 'michelin',
    name: 'The Culinary Inquisition',
    icon: '🎩',
    markerText: 'Hyper-formal wear. Crimson ascot. Parties of 1–2.',
    accentColor: 'text-red-700',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-50',
  },
  {
    path: 'viral',
    name: 'The Hype Train',
    icon: '📱',
    markerText: 'Neon gear. Large groups. Zero patience.',
    accentColor: 'text-blue-700',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
  },
];

function factionIntensity(score: number): 0 | 1 | 2 | 3 {
  if (score <= 0)                       return 0;
  if (score < MAX_PATH_SCORE * 0.33)    return 1;
  if (score < MAX_PATH_SCORE * 0.66)    return 2;
  return 3;
}

function intensityLabel(level: 0 | 1 | 2 | 3): string {
  switch (level) {
    case 0: return 'QUIET ○○○';
    case 1: return 'WEAK ●○○';
    case 2: return 'ACTIVE ●●○';
    case 3: return 'DOMINANT ●●●';
  }
}
```

- [ ] **Step 3: Read `pathScores` from context inside the `Clipboard` component**

The `Clipboard` component uses `useGame()`. `pathScores` is now on the context:

```ts
export const Clipboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("VIPs");
  const { gameState, pathScores } = useGame();
  // ... rest unchanged
```

- [ ] **Step 4: Add the Factions tab render block**

In the `Clipboard` return, after the `{activeTab === "Banned" && ...}` block and before `{activeTab === "Log" && ...}`, add:

```tsx
{activeTab === "Factions" && (
  <div className="flex flex-col gap-2 p-1">
    {FACTION_DISPLAY.map(faction => {
      const score = pathScores?.[faction.path] ?? 0;
      const level = factionIntensity(score);
      const isActive = level >= 2;
      return (
        <div
          key={faction.path}
          className={`rounded-md border p-2 transition-opacity ${
            isActive
              ? `${faction.borderColor} ${faction.bgColor}`
              : 'border-[#141414]/10 bg-white/60'
          }`}
          style={{ opacity: level === 0 ? 0.45 : 1 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#141414]">
              {faction.icon} {faction.name}
            </span>
            <span className={`text-[8px] font-bold uppercase tracking-wide ${isActive ? faction.accentColor : 'text-[#999]'}`}>
              {intensityLabel(level)}
            </span>
          </div>
          <p className="text-[8px] text-[#555] leading-tight">
            <span className="font-semibold">Spot them:</span> {faction.markerText}
          </p>
        </div>
      );
    })}
  </div>
)}
```

- [ ] **Step 5: Run type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Start dev server and manually verify Factions tab appears**

```bash
npm run dev
```

Open `http://localhost:3000`, start a game, open the Clipboard. Confirm:
- A "Factions" tab appears between "Banned" and "Log"
- All three factions are listed
- At campaign start (path scores all 0), all show "QUIET ○○○" at 45% opacity

- [ ] **Step 7: Commit**

```bash
git add src/components/desk/Clipboard.tsx
git commit -m "feat: add Factions tab to Clipboard with intensity indicator"
```

---

## Task 8: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit if any outstanding changes**

```bash
git status
```

If clean, proceed. If there are any unstaged fixes, commit them now.

---

## Self-Review Notes

- `buildInitialState` in `gameLogic.ts` currently uses `generateDailyCharacters` when no `characterIds` are provided. The `pathScores` param slots in there cleanly.
- `useGameEngine` returns `pathScores` through the context — this is the only way `Clipboard` can read it without a separate context or prop drilling.
- `GameContextType` needs `pathScores?: PathScores` added — this is a non-breaking addition (optional field).
- All new characters reference `neckwear: 3` (Donny Tromp) — Task 3 handles that before Task 4 adds the roster entry.
- `chef-balzac` uses `reservedPartySize: 3` with `expectedPartySize: 4` — same pattern as `manu-macaroon`, handled by existing `injectCharacterReservations` logic.
