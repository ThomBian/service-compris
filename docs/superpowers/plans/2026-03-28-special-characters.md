# Special Characters — Unified VIP & Banned Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the parallel `Vip`/`Banned` flat-interface system with a unified `SpecialCharacter` class hierarchy backed by serializable `CharacterDefinition` data, implementing The Syndicate (queue bypass) and Manu Macaroon (patience drain aura) as the first two lore characters.

**Architecture:** `CharacterDefinition` (pure data, DB-safe) lives in `characterRoster.ts`; runtime `SpecialCharacter` subclasses instantiated once per session from that data live in `src/logic/characters/`; `GameState` stores only IDs. A `characters` ref created in `useGameEngine` is passed into the hooks that need it.

**Tech Stack:** React 19, TypeScript, Vitest (tests run with `npm run test`)

---

## File Map

### Created


| File                                          | Responsibility                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/logic/characters/SpecialCharacter.ts`    | Abstract base with lifecycle hooks                                             |
| `src/logic/characters/VipCharacter.ts`        | Abstract VIP mid-layer                                                         |
| `src/logic/characters/BannedCharacter.ts`     | Abstract Banned mid-layer                                                      |
| `src/logic/characters/StandardVip.ts`         | Translates old flat-tier VIP behavior                                          |
| `src/logic/characters/StandardBanned.ts`      | Translates old flat-tier Banned behavior                                       |
| `src/logic/characters/BypassQueueVip.ts`      | The Syndicate — queue bypass                                                   |
| `src/logic/characters/AuraDrainVip.ts`        | Manu Macaroon — patience drain aura                                            |
| `src/logic/characters/factory.ts`             | `createCharacter(def)` factory                                                 |
| `src/logic/characterRoster.ts`                | `CHARACTER_ROSTER` + `generateDailyCharacters` + `injectCharacterReservations` |
| `src/logic/__tests__/characters.test.ts`      | Tests for all character classes                                                |
| `src/logic/__tests__/characterRoster.test.ts` | Tests for roster/factory/generation                                            |


### Modified


| File                                | What changes                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/types.ts`                      | Add `CharacterDefinition`; update `Client` (`characterId?`); update `GameState` (unified fields + `strikeActive`)              |
| `src/logic/gameLogic.ts`            | `processQueueTick`: `strikeActive` multiplier + return `stormedOutClientIds`; `applyMoraleGameOver`: use `gameOverCharacterId` |
| `src/hooks/useGameEngine.ts`        | Create `characters` ref; use `generateDailyCharacters`; pass ref to hooks                                                      |
| `src/hooks/useClientSpawner.ts`     | Accept `characters` ref; use `characterId`; add BYPASS spawn path                                                              |
| `src/hooks/useQueueManager.ts`      | Accept `characters` ref; call `onStormOut` after `processQueueTick`                                                            |
| `src/hooks/useDecisionActions.ts`   | Use `characterId`; call `character.onRefused()`/`onSeated()` via ref                                                           |
| `src/hooks/useAccusationActions.ts` | Accept `characters` ref; call `character.onRefused()` when `characterId` is set                                                |
| `src/components/desk/Clipboard.tsx` | Render from `dailyCharacterIds` + `CHARACTER_ROSTER`                                                                           |
| `src/App.tsx`                       | Use `gameOverCharacterId` instead of `gameOverVipId`/`gameOverBannedId`                                                        |


---

## Task 1: Add `CharacterDefinition` to types.ts and update `Client` + `GameState`

**Files:**

- Modify: `src/types.ts`

This is a pure type change. No runtime behavior changes yet — the goal is a green build with the new schema in place alongside the old one temporarily.

- **Step 1: Add `CharacterDefinition` interface after the existing `Banned` interface**

```ts
export interface CharacterDefinition {
  id:                string;
  name:              string;
  role:              'VIP' | 'BANNED';
  behaviorType:      string;
  visualTraits:      VisualTraits;
  clueText:          string;
  arrivalMO:         'RESERVATION_ALIAS' | 'WALK_IN' | 'LATE' | 'BYPASS';
  aliasFirstName?:   string;
  aliasLastName?:    string;
  expectedPartySize: number;
  auraRecovery?:      'ON_SEATING';
  reservedPartySize?: number;  // size injected into the reservation (when different from expectedPartySize)
  cashBonus?:         number;
  cashPenalty?:       number;
  ratingPenalty?:     number;
  moralePenalty?:     number;
  gameOver?:          boolean;
  consequenceDescription: string;
}
```

- **Step 2: Update `Client` — replace `vipId?` and `bannedId?` with `characterId?`**

Find and replace in `src/types.ts`:

```ts
// Remove:
  vipId?: string;
  bannedId?: string;

// Add:
  characterId?: string;
```

- **Step 3: Update `GameState` — replace old VIP/Banned fields**

```ts
// Remove these 6 fields:
  dailyVips: Vip[];
  seatedVipIds: string[];
  dailyBanned: Banned[];
  seatedBannedIds: string[];
  gameOverVipId: string | null;
  gameOverBannedId: string | null;

// Add these 4 fields:
  dailyCharacterIds:   string[];
  seatedCharacterIds:  string[];
  gameOverCharacterId: string | null;
  strikeActive:        boolean;
```

- **Step 4: Verify the build fails with expected TypeScript errors**

```bash
npm run lint
```

Expected: errors in `useGameEngine.ts`, `useClientSpawner.ts`, `useDecisionActions.ts`, `Clipboard.tsx`, `App.tsx`, `gameLogic.ts` — all referencing the old fields. This confirms the type change landed correctly.

---

## Task 2: Create the `SpecialCharacter` class hierarchy

**Files:**

- Create: `src/logic/characters/SpecialCharacter.ts`
- Create: `src/logic/characters/VipCharacter.ts`
- Create: `src/logic/characters/BannedCharacter.ts`
- Create: `src/logic/characters/StandardVip.ts`
- Create: `src/logic/characters/StandardBanned.ts`
- Create: `src/logic/characters/BypassQueueVip.ts`
- Create: `src/logic/characters/AuraDrainVip.ts`
- Create: `src/logic/__tests__/characters.test.ts`
- **Step 1: Write the failing tests first**

`src/logic/__tests__/characters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BypassQueueVip } from '../characters/BypassQueueVip';
import { AuraDrainVip } from '../characters/AuraDrainVip';
import { StandardVip } from '../characters/StandardVip';
import { StandardBanned } from '../characters/StandardBanned';
import type { CharacterDefinition, GameState } from '../../types';
import { PhysicalState, DialogueState, CellState, ClientType, LieType } from '../../types';

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
      Array(4).fill(null).map((_, x) => ({
        id: `cell-${x}-${y}`, x, y, state: CellState.EMPTY,
      }))
    ),
    cash: 100,
    rating: 4.0,
    morale: 80,
    logs: [],
    dailyCharacterIds: [],
    seatedCharacterIds: [],
    gameOverCharacterId: null,
    strikeActive: false,
    gameOver: false,
    gameOverReason: null,
    nightNumber: 1,
    coversSeated: 0,
    shiftRevenue: 0,
  } as GameState;
}

function makeDef(overrides: Partial<CharacterDefinition> = {}): CharacterDefinition {
  return {
    id: 'test-vip',
    name: 'Test VIP',
    role: 'VIP',
    behaviorType: 'STANDARD',
    visualTraits: { skinTone: 0, hairStyle: 0, hairColor: 0, clothingStyle: 0, clothingColor: 0, height: 0 },
    clueText: 'Test clue',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 2,
    consequenceDescription: 'Test consequence',
    ...overrides,
  };
}

function makeClient(id = 'c1') {
  return {
    id,
    type: ClientType.WALK_IN,
    patience: 80,
    physicalState: PhysicalState.AT_DESK,
    dialogueState: DialogueState.WAITING_FOR_PLAYER,
    spawnTime: 1190,
    trueFirstName: 'John',
    trueLastName: 'Doe',
    truePartySize: 2,
    isLate: false,
    lieType: LieType.NONE,
    hasLied: false,
    visualTraits: { skinTone: 0, hairStyle: 0, hairColor: 0, clothingStyle: 0, clothingColor: 0, height: 0 },
    isCaught: false,
    lastMessage: '',
    chatHistory: [],
  };
}

// BypassQueueVip
describe('BypassQueueVip', () => {
  const def = makeDef({ id: 'the-syndicate', behaviorType: 'BYPASS_QUEUE', cashBonus: 500, ratingPenalty: 1.0, moralePenalty: 20 });
  const syndicate = new BypassQueueVip(def);

  it('onDesk with no current client returns unchanged queue', () => {
    const state = makeState();
    const result = syndicate.onDesk!(state);
    expect(result.queue).toEqual([]);
  });

  it('onDesk pushes current client to front of queue', () => {
    const client = makeClient();
    const state = makeState({ currentClient: client });
    const result = syndicate.onDesk!(state);
    expect(result.queue).toHaveLength(1);
    expect(result.queue![0].id).toBe('c1');
    expect(result.queue![0].physicalState).toBe(PhysicalState.IN_QUEUE);
  });

  it('onDesk prepends displaced client before existing queue', () => {
    const existing = makeClient('c2');
    const current = makeClient('c1');
    const state = makeState({ currentClient: current, queue: [existing] });
    const result = syndicate.onDesk!(state);
    expect(result.queue![0].id).toBe('c1');
    expect(result.queue![1].id).toBe('c2');
  });

  it('onSeated adds cashBonus', () => {
    const state = makeState({ cash: 100 });
    const result = syndicate.onSeated(state);
    expect(result.cash).toBe(600);
  });

  it('onRefused applies rating and morale penalties', () => {
    const state = makeState({ rating: 4.0, morale: 80 });
    const result = syndicate.onRefused(state);
    expect(result.rating).toBeCloseTo(3.0);
    expect(result.morale).toBe(60);
  });

  it('onRefused clamps rating to 0', () => {
    const state = makeState({ rating: 0.5, morale: 10 });
    const result = syndicate.onRefused(state);
    expect(result.rating).toBe(0);
    expect(result.morale).toBe(0);
  });
});

// AuraDrainVip
describe('AuraDrainVip', () => {
  const def = makeDef({ id: 'manu-macaroon', behaviorType: 'AURA_DRAIN', auraRecovery: 'ON_SEATING' });
  const macaroon = new AuraDrainVip(def);

  it('onRefused sets strikeActive', () => {
    const state = makeState({ strikeActive: false });
    const result = macaroon.onRefused(state);
    expect(result.strikeActive).toBe(true);
  });

  it('onSeated clears strikeActive when auraRecovery is ON_SEATING', () => {
    const state = makeState({ strikeActive: true });
    const result = macaroon.onSeated(state);
    expect(result.strikeActive).toBe(false);
  });

  it('onStormOut clears strikeActive', () => {
    const state = makeState({ strikeActive: true });
    const result = macaroon.onStormOut!(state);
    expect(result.strikeActive).toBe(false);
  });
});

// StandardVip
// Note: StandardVip branches on individual penalty fields (ratingPenalty, cashPenalty, gameOver),
// not on a consequenceTier enum. CharacterDefinition has no consequenceTier field.
describe('StandardVip', () => {
  it('onRefused subtracts ratingPenalty when set', () => {
    const def = makeDef({ ratingPenalty: 1.5 });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState({ rating: 4.0 }));
    expect(result.rating).toBeCloseTo(2.5);
  });

  it('onRefused subtracts cashPenalty when set', () => {
    const def = makeDef({ cashPenalty: 200 });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState({ cash: 300 }));
    expect(result.cash).toBe(100);
  });

  it('onRefused can apply both ratingPenalty and cashPenalty simultaneously', () => {
    const def = makeDef({ ratingPenalty: 0.5, cashPenalty: 100 });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState({ rating: 3.0, cash: 200 }));
    expect(result.rating).toBeCloseTo(2.5);
    expect(result.cash).toBe(100);
  });

  it('onRefused sets gameOver when gameOver is true', () => {
    const def = makeDef({ gameOver: true });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState());
    expect(result.gameOver).toBe(true);
    expect(result.gameOverCharacterId).toBe('test-vip');
    expect(result.gameOverReason).toBe('VIP');
  });

  it('onRefused clamps rating and cash to 0', () => {
    const def = makeDef({ ratingPenalty: 10, cashPenalty: 500 });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState({ rating: 1.0, cash: 50 }));
    expect(result.rating).toBe(0);
    expect(result.cash).toBe(0);
  });

  it('onSeated returns empty partial (no special reward)', () => {
    const vip = new StandardVip(makeDef());
    const result = vip.onSeated(makeState());
    expect(result).toEqual({});
  });
});

// StandardBanned
describe('StandardBanned', () => {
  it('onSeated CASH_FINE tier subtracts cashPenalty', () => {
    const def = makeDef({ role: 'BANNED', consequenceTier: 'CASH_FINE' as never, cashPenalty: 80 });
    const banned = new StandardBanned(def);
    const result = banned.onSeated(makeState({ cash: 200 }));
    expect(result.cash).toBe(120);
  });

  it('onSeated MORALE tier subtracts moralePenalty', () => {
    const def = makeDef({ role: 'BANNED', consequenceTier: 'MORALE' as never, moralePenalty: 30 });
    const banned = new StandardBanned(def);
    const result = banned.onSeated(makeState({ morale: 80 }));
    expect(result.morale).toBe(50);
  });

  it('onSeated GAME_OVER sets gameOver with BANNED reason', () => {
    const def = makeDef({ id: 'the-dictator', role: 'BANNED', gameOver: true });
    const banned = new StandardBanned(def);
    const result = banned.onSeated(makeState());
    expect(result.gameOver).toBe(true);
    expect(result.gameOverCharacterId).toBe('the-dictator');
    expect(result.gameOverReason).toBe('BANNED');
  });

  it('onRefused returns empty partial (justified refusal is handled by the caller)', () => {
    const banned = new StandardBanned(makeDef({ role: 'BANNED' }));
    expect(banned.onRefused(makeState())).toEqual({});
  });
});
```

- **Step 2: Run tests to confirm they fail**

```bash
npm run test -- characters.test.ts
```

Expected: multiple import errors (files don't exist yet).

- **Step 3: Create `SpecialCharacter.ts`**

```ts
// src/logic/characters/SpecialCharacter.ts
import type { CharacterDefinition, GameState } from '../../types';

export abstract class SpecialCharacter {
  constructor(readonly def: CharacterDefinition) {}
  onDesk?(state: GameState): Partial<GameState>;
  onAuraTick?(state: GameState): Partial<GameState>;
  onStormOut?(state: GameState): Partial<GameState>;
  abstract onSeated(state: GameState): Partial<GameState>;
  abstract onRefused(state: GameState): Partial<GameState>;
}
```

- **Step 4: Create `VipCharacter.ts` and `BannedCharacter.ts`**

```ts
// src/logic/characters/VipCharacter.ts
import { SpecialCharacter } from './SpecialCharacter';
export abstract class VipCharacter extends SpecialCharacter {}
```

```ts
// src/logic/characters/BannedCharacter.ts
import { SpecialCharacter } from './SpecialCharacter';
export abstract class BannedCharacter extends SpecialCharacter {}
```

- **Step 5: Create `BypassQueueVip.ts`**

```ts
// src/logic/characters/BypassQueueVip.ts
import { PhysicalState, type GameState } from '../../types';
import { VipCharacter } from './VipCharacter';

export class BypassQueueVip extends VipCharacter {
  onDesk(state: GameState): Partial<GameState> {
    if (!state.currentClient) return { queue: state.queue };
    const displaced = { ...state.currentClient, physicalState: PhysicalState.IN_QUEUE };
    return { queue: [displaced, ...state.queue] };
  }

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

- **Step 6: Create `AuraDrainVip.ts`**

```ts
// src/logic/characters/AuraDrainVip.ts
import { type GameState } from '../../types';
import { VipCharacter } from './VipCharacter';

export class AuraDrainVip extends VipCharacter {
  onRefused(_state: GameState): Partial<GameState> {
    return { strikeActive: true };
  }

  onSeated(_state: GameState): Partial<GameState> {
    return {
      strikeActive: this.def.auraRecovery === 'ON_SEATING' ? false : undefined,
    };
  }

  onStormOut(_state: GameState): Partial<GameState> {
    return { strikeActive: false };
  }
}
```

- **Step 7: Create `StandardVip.ts`**

```ts
// src/logic/characters/StandardVip.ts
import { type GameState } from '../../types';
import { VipCharacter } from './VipCharacter';

export class StandardVip extends VipCharacter {
  onSeated(_state: GameState): Partial<GameState> {
    return {};
  }

  onRefused(state: GameState): Partial<GameState> {
    if (this.def.gameOver) {
      return {
        gameOver: true,
        gameOverReason: 'VIP',
        gameOverCharacterId: this.def.id,
        timeMultiplier: 0,
      };
    }
    return {
      rating: Math.max(0, state.rating - (this.def.ratingPenalty ?? 0)),
      cash: Math.max(0, state.cash - (this.def.cashPenalty ?? 0)),
    };
  }
}
```

- **Step 8: Create `StandardBanned.ts`**

```ts
// src/logic/characters/StandardBanned.ts
import { type GameState } from '../../types';
import { BannedCharacter } from './BannedCharacter';

export class StandardBanned extends BannedCharacter {
  onRefused(_state: GameState): Partial<GameState> {
    // Justified refusal — no consequence from the character; caller handles reward
    return {};
  }

  onSeated(state: GameState): Partial<GameState> {
    if (this.def.gameOver) {
      return {
        gameOver: true,
        gameOverReason: 'BANNED',
        gameOverCharacterId: this.def.id,
        timeMultiplier: 0,
      };
    }
    return {
      cash:   Math.max(0, state.cash   - (this.def.cashPenalty   ?? 0)),
      morale: Math.max(0, state.morale - (this.def.moralePenalty ?? 0)),
      rating: Math.max(0, state.rating - (this.def.ratingPenalty ?? 0)),
    };
  }
}
```

- **Step 9: Run tests — expect them to pass**

```bash
npm run test -- characters.test.ts
```

Expected: all tests pass.

- **Step 10: Commit**

```bash
git add src/logic/characters/ src/logic/__tests__/characters.test.ts
git commit -m "feat: add SpecialCharacter class hierarchy with BypassQueueVip and AuraDrainVip"
```

---

## Task 3: Create the factory and character roster

**Files:**

- Create: `src/logic/characters/factory.ts`
- Create: `src/logic/characterRoster.ts`
- Create: `src/logic/__tests__/characterRoster.test.ts`
- **Step 1: Write failing tests**

`src/logic/__tests__/characterRoster.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCharacter } from '../characters/factory';
import {
  CHARACTER_ROSTER,
  generateDailyCharacters,
  injectCharacterReservations,
} from '../characterRoster';
import { BypassQueueVip } from '../characters/BypassQueueVip';
import { AuraDrainVip } from '../characters/AuraDrainVip';
import { START_TIME } from '../../constants';

describe('createCharacter factory', () => {
  it('creates BypassQueueVip for BYPASS_QUEUE behaviorType', () => {
    const def = CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')!;
    expect(createCharacter(def)).toBeInstanceOf(BypassQueueVip);
  });

  it('creates AuraDrainVip for AURA_DRAIN behaviorType', () => {
    const def = CHARACTER_ROSTER.find(c => c.id === 'manu-macaroon')!;
    expect(createCharacter(def)).toBeInstanceOf(AuraDrainVip);
  });

  it('throws for unknown behaviorType', () => {
    const def = { ...CHARACTER_ROSTER[0], behaviorType: 'UNKNOWN' };
    expect(() => createCharacter(def)).toThrow();
  });
});

describe('CHARACTER_ROSTER', () => {
  it('contains the-syndicate and manu-macaroon', () => {
    const ids = CHARACTER_ROSTER.map(c => c.id);
    expect(ids).toContain('the-syndicate');
    expect(ids).toContain('manu-macaroon');
  });

  it('all entries have required fields', () => {
    CHARACTER_ROSTER.forEach(c => {
      expect(c.id).toBeTruthy();
      expect(c.role).toMatch(/^(VIP|BANNED)$/);
      expect(c.behaviorType).toBeTruthy();
      expect(c.visualTraits).toBeDefined();
      expect(c.clueText).toBeTruthy();
    });
  });

  it('no duplicate IDs', () => {
    const ids = CHARACTER_ROSTER.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('generateDailyCharacters', () => {
  it('returns empty array when difficulty is 0', () => {
    expect(generateDailyCharacters(0, CHARACTER_ROSTER)).toEqual([]);
  });

  it('returns empty array when roster is empty', () => {
    expect(generateDailyCharacters(2, [])).toEqual([]);
  });

  it('never returns duplicates across 50 runs', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyCharacters(2, CHARACTER_ROSTER);
      const ids = result.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('never returns more characters than roster size', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateDailyCharacters(3, CHARACTER_ROSTER);
      expect(result.length).toBeLessThanOrEqual(CHARACTER_ROSTER.length);
    }
  });
});

describe('injectCharacterReservations', () => {
  it('injects a reservation for RESERVATION_ALIAS characters', () => {
    const macaroon = CHARACTER_ROSTER.find(c => c.id === 'manu-macaroon')!;
    const result = injectCharacterReservations([macaroon], []);
    const injected = result.find(r => r.id === 'char-res-manu-macaroon');
    expect(injected).toBeDefined();
    expect(injected!.firstName).toBe(macaroon.aliasFirstName);
    // reservedPartySize (2) used, not expectedPartySize (4) — this is the trap
    expect(injected!.partySize).toBe(macaroon.reservedPartySize);
    expect(injected!.partySize).toBe(2);
  });

  it('does not inject a reservation for WALK_IN characters', () => {
    const syndicate = CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')!;
    const result = injectCharacterReservations([syndicate], []);
    expect(result).toHaveLength(0);
  });

  it('does not inject a reservation for BYPASS characters', () => {
    const syndicate = CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')!;
    const result = injectCharacterReservations([syndicate], []);
    expect(result.find(r => r.id.includes('the-syndicate'))).toBeUndefined();
  });
});
```

- **Step 2: Run tests to confirm they fail**

```bash
npm run test -- characterRoster.test.ts
```

Expected: import errors.

- **Step 3: Create `factory.ts`**

```ts
// src/logic/characters/factory.ts
import type { CharacterDefinition } from '../../types';
import type { SpecialCharacter } from './SpecialCharacter';
import { BypassQueueVip } from './BypassQueueVip';
import { AuraDrainVip } from './AuraDrainVip';
import { StandardVip } from './StandardVip';
import { StandardBanned } from './StandardBanned';

export function createCharacter(def: CharacterDefinition): SpecialCharacter {
  switch (def.behaviorType) {
    case 'BYPASS_QUEUE': return new BypassQueueVip(def);
    case 'AURA_DRAIN':   return new AuraDrainVip(def);
    case 'STANDARD_VIP': return new StandardVip(def);
    case 'STANDARD_BANNED': return new StandardBanned(def);
    default: throw new Error(`Unknown behaviorType: ${def.behaviorType}`);
  }
}
```

- **Step 4: Create `characterRoster.ts`**

```ts
// src/logic/characterRoster.ts
import type { CharacterDefinition, Reservation } from '../types';
import { START_TIME, SPAWN_PROBABILITY } from '../constants';

export const CHARACTER_ROSTER: CharacterDefinition[] = [
  // ── Lore VIPs ──────────────────────────────────────────────────────────────
  {
    id: 'the-syndicate',
    name: 'The Syndicate',
    role: 'VIP',
    behaviorType: 'BYPASS_QUEUE',
    arrivalMO: 'BYPASS',
    expectedPartySize: 4,
    clueText: 'Watch out for the Pinstripes tonight.',
    visualTraits: { skinTone: 1, hairStyle: 1, hairColor: 1, clothingStyle: 3, clothingColor: 4, height: 1 },
    cashBonus: 500,
    ratingPenalty: 1.0,
    moralePenalty: 20,
    consequenceDescription: 'They smash the front window.',
  },
  {
    id: 'manu-macaroon',
    name: 'Manu Macaroon',
    role: 'VIP',
    behaviorType: 'AURA_DRAIN',
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Manu',
    aliasLastName: 'Macaroon',
    expectedPartySize: 4,   // true arrival size (with +2 security)
    reservedPartySize: 2,   // size injected into the reservation — the trap
    clueText: "The President is coming. Navy suit, tiny espresso cup. He brings security.",
    visualTraits: { skinTone: 2, hairStyle: 3, hairColor: 2, clothingStyle: 0, clothingColor: 4, height: 1, neckwear: 0 },
    auraRecovery: 'ON_SEATING',
    ratingPenalty: 0.5,
    moralePenalty: 10,
    consequenceDescription: 'Workers strike! Queue patience drains at double speed.',
  },
  // ── Translated placeholder VIPs ────────────────────────────────────────────
  {
    id: 'food-critic',
    name: 'The Food Critic',
    role: 'VIP',
    behaviorType: 'STANDARD_VIP',
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Marcel',
    aliasLastName: 'Dupont',
    expectedPartySize: 2,
    clueText: 'A critic is dining incognito tonight. Seat them flawlessly.',
    visualTraits: { skinTone: 1, hairStyle: 0, hairColor: 5, clothingStyle: 0, clothingColor: 0, height: 1, facialHair: 0, neckwear: 0 },
    ratingPenalty: 1.5,
    consequenceDescription: 'The review will be devastating.',
  },
  {
    id: 'the-owner',
    name: 'The Owner',
    role: 'VIP',
    behaviorType: 'STANDARD_VIP',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    clueText: "The owner may drop in unannounced. Do NOT refuse them.",
    visualTraits: { skinTone: 2, hairStyle: 3, hairColor: 1, clothingStyle: 0, clothingColor: 0, height: 2, hat: 0, neckwear: 1 },
    gameOver: true,
    consequenceDescription: "You're fired.",
  },
  {
    id: 'the-inspector',
    name: 'The Health Inspector',
    role: 'VIP',
    behaviorType: 'STANDARD_VIP',
    arrivalMO: 'LATE',
    expectedPartySize: 3,
    clueText: 'Health inspector coming tonight. They arrive late — do not accuse them of a Time Crime.',
    visualTraits: { skinTone: 0, hairStyle: 2, hairColor: 3, clothingStyle: 3, clothingColor: 2, height: 0, facialHair: 1, neckwear: 2 },
    cashPenalty: 200,
    consequenceDescription: 'The fine will sting.',
  },
  // ── Translated placeholder Banned ──────────────────────────────────────────
  {
    id: 'fake-hipster',
    name: 'The Fake Hipster',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    clueText: 'Skips the bill every time.',
    visualTraits: { skinTone: 3, hairStyle: 4, hairColor: 2, clothingStyle: 1, clothingColor: 3, height: 1, glasses: 0 },
    cashPenalty: 80,
    consequenceDescription: 'The Fake Hipster skips the bill. -€80.',
  },
  {
    id: 'drunk-group',
    name: 'The Drunk Group',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'LATE',
    expectedPartySize: 4,
    clueText: 'Rowdy crew. Do not seat.',
    visualTraits: { skinTone: 2, hairStyle: 1, hairColor: 0, clothingStyle: 2, clothingColor: 1, height: 2, eyebrows: 1 },
    moralePenalty: 30,
    consequenceDescription: "Rowdy crew all night. Staff morale tanks. -30 morale.",
  },
  {
    id: 'small-spender',
    name: 'The Small Spender',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 2,
    clueText: 'Orders tap water and shares a starter.',
    visualTraits: { skinTone: 0, hairStyle: 3, hairColor: 4, clothingStyle: 3, clothingColor: 4, height: 0, glasses: 0, eyebrows: 0 },
    cashPenalty: 30,
    consequenceDescription: 'They order tap water and share a starter. -€30.',
  },
  {
    id: 'fake-influencer',
    name: 'The Fake Influencer',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Chloé',
    aliasLastName: 'Lacroix',
    expectedPartySize: 1,
    clueText: 'Posted a hit piece last time.',
    visualTraits: { skinTone: 4, hairStyle: 0, hairColor: 3, clothingStyle: 1, clothingColor: 2, height: 1, glasses: 1 },
    ratingPenalty: 1.5,
    consequenceDescription: 'Charmed a free meal, then posted a hit piece. -1.5 stars.',
  },
  {
    id: 'the-dictator',
    name: 'The Dictator',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Viktor',
    aliasLastName: 'Blanc',
    expectedPartySize: 3,
    clueText: 'Extremely dangerous. Do not seat under any circumstances.',
    visualTraits: { skinTone: 1, hairStyle: 2, hairColor: 1, clothingStyle: 0, clothingColor: 4, height: 2, eyebrows: 0 },
    gameOver: true,
    consequenceDescription: "Didn't like the food. Attacked the restaurant.",
  },
];

export function generateDailyCharacters(
  difficulty: number,
  roster: CharacterDefinition[],
): CharacterDefinition[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  return [...roster].sort(() => Math.random() - 0.5).filter(() => Math.random() < p);
}

export function injectCharacterReservations(
  dailyChars: CharacterDefinition[],
  existingReservations: Reservation[],
): Reservation[] {
  const injected: Reservation[] = dailyChars
    .filter(c => c.arrivalMO === 'RESERVATION_ALIAS')
    .map((c, index) => {
      // reservedPartySize lets a character arrive with more people than their booking.
      // Falls back to expectedPartySize when not set.
      const reservationSize = c.reservedPartySize ?? c.expectedPartySize;
      return {
        id: 'char-res-' + c.id,
        time: START_TIME + 60 + index * 15,
        firstName: c.aliasFirstName ?? c.name,
        lastName: c.aliasLastName ?? '',
        partySize: reservationSize,
        arrived: false,
        partySeated: false,
      };
    });
  return [...existingReservations, ...injected];
}
```

- **Step 5: Run tests — expect them to pass**

```bash
npm run test -- characterRoster.test.ts
```

Expected: all tests pass.

- **Step 6: Commit**

```bash
git add src/logic/characters/factory.ts src/logic/characterRoster.ts src/logic/__tests__/characterRoster.test.ts
git commit -m "feat: add character factory and unified CHARACTER_ROSTER"
```

---

## Task 4: Update `processQueueTick` and `applyMoraleGameOver` in `gameLogic.ts`

**Files:**

- Modify: `src/logic/gameLogic.ts`
- Modify: `src/logic/__tests__/gameLogic.test.ts`

Queue patience drain already exists in `processQueueTick` via `updateQueuePatience`. This task adds the `strikeActive` multiplier and extends the return type to include `stormedOutClientIds`.

- **Step 1: Write failing tests**

Add to `src/logic/__tests__/gameLogic.test.ts` (or the existing bannedLogic/vipLogic test files if that's where QueueTick tests live — check first):

```ts
// In the processQueueTick describe block
describe('processQueueTick — strikeActive', () => {
  function makeQueueState(opts: { strikeActive: boolean; patience: number }): GameState {
    const client = { /* use makeClient or existing helper */ };
    return { /* minimal GameState */ strikeActive: opts.strikeActive, queue: [{ ...client, patience: opts.patience }], /* ... */ };
  }

  it('drains queue patience at ×1 when strikeActive is false', () => {
    const state = makeQueueState({ strikeActive: false, patience: 50 });
    const { state: next } = processQueueTick(state);
    expect(next.queue[0].patience).toBe(49);
  });

  it('drains queue patience at ×2 when strikeActive is true', () => {
    const state = makeQueueState({ strikeActive: true, patience: 50 });
    const { state: next } = processQueueTick(state);
    expect(next.queue[0].patience).toBe(48);
  });
});

describe('processQueueTick — stormedOutClientIds', () => {
  it('returns IDs of clients who stormed out', () => {
    const state = /* GameState with one client at patience 1 */;
    const { stormedOutClientIds } = processQueueTick(state);
    expect(stormedOutClientIds).toContain(/* client id */);
  });

  it('returns empty array when no storm-outs', () => {
    const state = /* GameState with queue clients at patience > 1 */;
    const { stormedOutClientIds } = processQueueTick(state);
    expect(stormedOutClientIds).toEqual([]);
  });
});
```

Check `src/logic/__tests__/gameLogic.test.ts` for existing test helpers (`makeState`, `makeClient`) before writing new ones — reuse them.

- **Step 2: Run existing gameLogic tests to confirm green baseline**

```bash
npm run test -- gameLogic.test.ts
```

Expected: all existing tests pass (baseline before changes).

- **Step 3: Update `updateQueuePatience` to accept and apply `strikeMultiplier`**

In `src/logic/gameLogic.ts`, change:

```ts
function updateQueuePatience(queue: Client[]): Client[] {
  return queue.map((c) => ({
    ...c,
    patience: Math.max(0, c.patience - 1),
  }));
}
```

To:

```ts
function updateQueuePatience(queue: Client[], strikeMultiplier = 1): Client[] {
  return queue.map((c) => ({
    ...c,
    patience: Math.max(0, c.patience - 1 * strikeMultiplier),
  }));
}
```

- **Step 4: Update `handleStormOuts` to return `stormedOutClientIds`**

```ts
function handleStormOuts(queue: Client[], rating: number, logs: string[]) {
  const stormedOut = queue.filter((c) => c.patience <= 0);
  const stormedOutCount = stormedOut.length;
  if (stormedOutCount === 0)
    return { nextQueue: queue, nextRating: rating, nextLogs: logs, occurred: false, stormedOutClientIds: [] as string[] };

  const nextQueue = queue.filter((c) => c.patience > 0);
  const nextRating = Math.max(0, rating - 0.5 * stormedOutCount);
  const nextLogs = [`${stormedOutCount} guest(s) stormed out of the queue!`, ...logs].slice(0, 50);

  return {
    nextQueue, nextRating, nextLogs, occurred: true,
    stormedOutClientIds: stormedOut.map(c => c.id),
  };
}
```

- **Step 5: Update `QueueTickResult` and `processQueueTick` to pass through both changes**

```ts
export interface QueueTickResult {
  state: GameState;
  stormedCount: number;
  stormedOutClientIds: string[];  // new
}

export function processQueueTick(prev: GameState): QueueTickResult {
  // ... (existing grid update) ...

  const strikeMultiplier = prev.strikeActive ? 2 : 1;       // new
  nextQueue = updateQueuePatience(nextQueue, strikeMultiplier); // updated call

  const stormResult = handleStormOuts(nextQueue, nextRating, nextLogs);
  // ...existing destructuring...
  const stormedOutClientIds = stormResult.stormedOutClientIds; // new

  // ...rest unchanged...

  return {
    state: { ...prev, queue: nextQueue, currentClient: nextCurrentClient, grid: nextGrid, rating: nextRating, logs: nextLogs },
    stormedCount,
    stormedOutClientIds,  // new
  };
}
```

- **Step 6: Update `applyMoraleGameOver` to use `gameOverCharacterId`**

```ts
export function applyMoraleGameOver(state: GameState): GameState {
  if (state.morale > 0 || state.gameOver) return state;
  // ...existing clearedGrid...
  return {
    ...state,
    grid: clearedGrid,
    gameOver: true,
    gameOverReason: 'MORALE',
    gameOverCharacterId: null,   // replaces gameOverVipId + gameOverBannedId
    timeMultiplier: 0,
    logs: ["Staff morale collapsed. Shift ended.", ...state.logs].slice(0, 50),
  };
}
```

- **Step 7: Run tests**

```bash
npm run test -- gameLogic.test.ts
```

Expected: all tests pass (existing + new).

- **Step 8: Commit**

```bash
git add src/logic/gameLogic.ts src/logic/__tests__/gameLogic.test.ts
git commit -m "feat: add strikeActive drain multiplier and stormedOutClientIds to processQueueTick"
```

---

## Task 5: Update `useGameEngine.ts`

**Files:**

- Modify: `src/hooks/useGameEngine.ts`
- **Step 1: Replace imports and build initial state**

Replace:

```ts
import { generateDailyVips, injectVipReservations } from '../logic/vipLogic';
import { generateDailyBanned, injectBannedReservations } from '../logic/bannedLogic';
import { VIP_ROSTER } from '../logic/vipRoster';
import { BANNED_ROSTER } from '../logic/bannedRoster';
```

With:

```ts
import { generateDailyCharacters, injectCharacterReservations } from '../logic/characterRoster';
import { CHARACTER_ROSTER } from '../logic/characterRoster';
import { createCharacter } from '../logic/characters/factory';
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';
```

- **Step 2: Update `buildInitialState`**

```ts
function buildInitialState(difficulty: number, persist?: PersistState): GameState {
  const nightNumber = persist?.nightNumber ?? 1;
  const rating = persist ? Math.max(1.0, persist.rating) : 5.0;

  const dailyChars = generateDailyCharacters(difficulty, CHARACTER_ROSTER);

  const baseReservations = nightNumber === 1 ? INITIAL_RESERVATIONS : generateReservations({ nightNumber, rating });
  const reservations = injectCharacterReservations(dailyChars, baseReservations);

  return {
    inGameMinutes: START_TIME,
    timeMultiplier: difficulty === 3 ? 3 : 1,
    difficulty,
    reservations,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: persist?.cash ?? 0,
    rating,
    morale: persist ? Math.max(0, persist.morale) : 100,
    logs: ["Welcome to The Maitre D'. The doors are open."],
    dailyCharacterIds: dailyChars.map(c => c.id),
    seatedCharacterIds: [],
    gameOverCharacterId: null,
    strikeActive: false,
    gameOver: false,
    gameOverReason: null,
    nightNumber,
    coversSeated: 0,
    shiftRevenue: 0,
  };
}
```

- **Step 3: Create the `characters` ref and populate it; pass ref to hooks**

```ts
export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>(() => buildInitialState(0));

  // Runtime character instances — never serialized, rebuilt on each session start
  const characters = useRef<Map<string, SpecialCharacter>>(new Map());

  // Populate characters ref whenever dailyCharacterIds changes (i.e., on session start)
  useEffect(() => {
    const map = new Map<string, SpecialCharacter>();
    gameState.dailyCharacterIds.forEach(id => {
      const def = CHARACTER_ROSTER.find(c => c.id === id);
      if (def) map.set(id, createCharacter(def));
    });
    characters.current = map;
  }, [gameState.dailyCharacterIds]);

  const resetGame = useCallback((difficulty: number, persist?: PersistState) => {
    setGameState(buildInitialState(difficulty, persist));
  }, []);

  const { showToast } = useToast();
  const { setTimeMultiplier } = useGameClock(gameState, setGameState);
  useClientSpawner(gameState, setGameState, characters);          // pass ref
  useQueueManager(gameState, setGameState, showToast, characters); // pass ref

  const { askQuestion } = useQuestionActions(setGameState, showToast);
  const { callOutLie } = useAccusationActions(setGameState, showToast, characters); // pass ref
  const { handleDecision, waitInLine, seatParty, toggleCellSelection, confirmSeating, refuseSeatedParty, lastCallTable } =
    useDecisionActions(setGameState, showToast, characters); // pass ref
  const { toggleReservationArrived } = useReservationActions(setGameState);

  return { gameState, askQuestion, callOutLie, handleDecision, waitInLine, seatParty, toggleCellSelection, confirmSeating, refuseSeatedParty, toggleReservationArrived, setTimeMultiplier, resetGame, lastCallTable };
}
```

- **Step 4: Run lint**

```bash
npm run lint
```

Expected: errors in the hooks that haven't been updated yet (useClientSpawner, useQueueManager, useDecisionActions, useAccusationActions). That's expected — proceed.

- **Step 5: Commit (partial — compile errors expected)**

```bash
git add src/hooks/useGameEngine.ts
git commit -m "feat: wire CHARACTER_ROSTER and characters ref into useGameEngine"
```

---

## Task 6: Update `useClientSpawner.ts`

**Files:**

- Modify: `src/hooks/useClientSpawner.ts`
- **Step 1: Update signature to accept `characters` ref and replace `vipId`/`bannedId` with `characterId`**

Full rewrite of the hook. Key changes:

1. Add `characters: React.RefObject<Map<string, SpecialCharacter>>` parameter.
2. Replace `vipId: vip.id` → `characterId: vip.id` everywhere.
3. Replace `bannedId: banned.id` → `characterId: banned.id`.
4. Replace `prev.dailyVips`/`prev.dailyBanned` lookups with `CHARACTER_ROSTER` lookups using `dailyCharacterIds`.
5. Replace `'vip-res-'` / `'banned-res-'` prefix with `'char-res-'`.
6. Replace `'vip-walkin-'` / `'banned-walkin-'` prefix with `'char-walkin-'`.
7. Remove separate `spawnVipWalkIn` / `spawnBannedWalkIn` callbacks — unify into one `spawnCharacterWalkIn`.
8. Add BYPASS spawn path: check each tick if any `dailyCharacterIds` character has `arrivalMO: 'BYPASS'`, hasn't spawned, and the spawn condition is met (`queue.length >= 3` AND `grid.flat().filter(c => c.state === CellState.EMPTY).length <= 4`).

For the BYPASS spawn, call `character.onDesk(prev)` inside `setGameState` to get the displaced queue, then set the Syndicate as `currentClient`:

```ts
const spawnBypassCharacter = useCallback((def: CharacterDefinition) => {
  setGameState(prev => {
    const walkinKey = 'char-walkin-' + def.id;
    if (prev.spawnedReservationIds.includes(walkinKey)) return prev;

    const syndicateClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      type: ClientType.WALK_IN,
      patience: 100,
      physicalState: PhysicalState.AT_DESK,
      dialogueState: DialogueState.OPENING_GAMBIT,
      spawnTime: prev.inGameMinutes,
      trueFirstName: def.name,
      trueLastName: '',
      truePartySize: def.expectedPartySize,
      isLate: false,
      lieType: LieType.NONE,
      hasLied: false,
      visualTraits: def.visualTraits,
      isCaught: false,
      characterId: def.id,
      lastMessage: "We require a table. Immediately.",
      chatHistory: [
        { sender: 'maitre-d', text: "Good evening! How may I help you?" },
        { sender: 'guest', text: "We require a table. Immediately." },
      ],
    };

    const character = characters.current.get(def.id);
    const queueUpdate = character?.onDesk ? character.onDesk(prev) : {};

    return {
      ...prev,
      ...queueUpdate,
      currentClient: syndicateClient,
      spawnedReservationIds: [...prev.spawnedReservationIds, walkinKey],
    };
  });
}, [setGameState, characters]);
```

In the `useEffect`, add the BYPASS check:

```ts
// BYPASS characters — direct desk interrupt
const bypassChars = dailyCharsFromRoster.filter(c =>
  c.arrivalMO === 'BYPASS' &&
  !gameState.spawnedReservationIds.includes('char-walkin-' + c.id) &&
  gameState.queue.length >= 3 &&
  gameState.grid.flat().filter(cell => cell.state === CellState.EMPTY).length <= 4
);
bypassChars.forEach(c => spawnBypassCharacter(c));
```

Also update the `excludeTraits` lookup:

```ts
const excludeTraits = dailyCharsFromRoster.map(c => c.visualTraits);
```

Where `dailyCharsFromRoster` is resolved once at the top of the effect:

```ts
const dailyCharsFromRoster = gameState.dailyCharacterIds
  .map(id => CHARACTER_ROSTER.find(c => c.id === id))
  .filter((c): c is CharacterDefinition => c !== undefined);
```

- **Step 2: Run lint**

```bash
npm run lint
```

Expected: errors only in hooks not yet updated.

- **Step 3: Commit**

```bash
git add src/hooks/useClientSpawner.ts
git commit -m "feat: update useClientSpawner to use characterId and handle BYPASS arrivalMO"
```

---

## Task 7: Update `useQueueManager.ts` to call `onStormOut`

**Files:**

- Modify: `src/hooks/useQueueManager.ts`
- **Step 1: Update signature and add `onStormOut` handling**

```ts
export function useQueueManager(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  showToast: ShowToast,
  characters: React.RefObject<Map<string, SpecialCharacter>>,  // new
) {
  // ...
  useEffect(() => {
    if (gameState.timeMultiplier === 0) return;

    setGameState(prev => {
      const { state: next, stormedCount, stormedOutClientIds } = processQueueTick(prev);

      // Apply onStormOut for any special character who stormed out
      let result = next;
      stormedOutClientIds.forEach(clientId => {
        const client = prev.queue.find(c => c.id === clientId);
        if (client?.characterId) {
          const ch = characters.current.get(client.characterId);
          if (ch?.onStormOut) {
            result = { ...result, ...ch.onStormOut(result) };
          }
        }
      });

      if (stormedCount > 0) {
        const ratingLoss = (0.5 * stormedCount).toFixed(1);
        const label = stormedCount === 1 ? 'A guest stormed out!' : `${stormedCount} guests stormed out!`;
        queueMicrotask(() => showToast(label, `★ −${ratingLoss}`, 'warning'));
      }
      return result;
    });
  }, [gameState.inGameMinutes, gameState.timeMultiplier, setGameState, showToast, characters]);
  // ...rest unchanged...
}
```

- **Step 2: Run lint**

```bash
npm run lint
```

- **Step 3: Commit**

```bash
git add src/hooks/useQueueManager.ts
git commit -m "feat: call character.onStormOut in useQueueManager after processQueueTick"
```

---

## Task 8: Update `useDecisionActions.ts`

**Files:**

- Modify: `src/hooks/useDecisionActions.ts`
- **Step 1: Update signature and replace all `vipId`/`bannedId` logic with `characterId` + character hooks**

Update signature:

```ts
export function useDecisionActions(
  setGameState: Dispatch<SetStateAction<GameState>>,
  showToast: ShowToast,
  characters: React.RefObject<Map<string, SpecialCharacter>>,
)
```

In `handleDecision` (the Refuse button):

- Replace the `if (deskClient.vipId)` block with:

```ts
if (deskClient.characterId) {
  const ch = characters.current.get(deskClient.characterId);
  if (ch) {
    const outcome = ch.onRefused(prev);
    const def = ch.def;
    toastArgs = [def.consequenceDescription, undefined, 'error'];
    const next = {
      ...prev,
      ...outcome,
      currentClient: null,
      logs: [`${def.role === 'VIP' ? 'VIP' : 'Banned'} refused: ${def.name}.`, ...prev.logs].slice(0, 50),
    };
    return applyMoraleGameOver(next);
  }
}
```

In `confirmSeating` (the Seat confirm):

- Replace the `if (deskClient.bannedId)` block with:

```ts
if (deskClient.characterId) {
  const ch = characters.current.get(deskClient.characterId);
  const def = ch?.def;
  if (ch && def?.role === 'BANNED') {
    const outcome = ch.onSeated(prev);
    // ... apply outcome, clear grid selection, show toast ...
    const next = {
      ...prev,
      ...outcome,
      currentClient: null,
      grid: gridClearedSelection,
      seatedCharacterIds: [...prev.seatedCharacterIds, def.id],
      logs: [`Banned customer seated: ${def.name}.`, ...prev.logs].slice(0, 50),
    };
    return applyMoraleGameOver(next);
  }
}
```

- Replace the `nextSeatedVipIds` block and `if (client.vipId)` toast block with:

```ts
const nextSeatedCharacterIds = client.characterId
  ? [...prev.seatedCharacterIds, client.characterId]
  : prev.seatedCharacterIds;

if (client.characterId) {
  const ch = characters.current.get(client.characterId);
  if (ch) {
    const outcome = ch.onSeated(prev);
    Object.assign(finalState, outcome);
    toastArgs = [`Well handled — ${ch.def.name} has been seated.`, undefined, 'success'];
  }
}
```

- Also update `seatedVipIds: nextSeatedVipIds` → `seatedCharacterIds: nextSeatedCharacterIds`.
- Remove the import of `computeVipRefusalOutcome` and `computeBannedSeatingOutcome` (no longer needed).
- **Step 2: Run lint**

```bash
npm run lint
```

- **Step 3: Commit**

```bash
git add src/hooks/useDecisionActions.ts
git commit -m "feat: update useDecisionActions to use character hooks via characterId"
```

---

## Task 9: Update `useAccusationActions.ts`

**Files:**

- Modify: `src/hooks/useAccusationActions.ts`
- **Step 1: Update signature and call `character.onRefused()` for VIP characters**

```ts
export function useAccusationActions(
  setGameState: Dispatch<SetStateAction<GameState>>,
  showToast: ShowToast,
  characters: React.RefObject<Map<string, SpecialCharacter>>,  // new
) {
  const callOutLie = useCallback((field: AccusationField) => {
    let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

    flushSync(() => {
      setGameState(prev => {
        if (!prev.currentClient) return prev;

        // If accusing a special character, trigger their onRefused hook first
        let characterOutcome: Partial<GameState> = {};
        if (prev.currentClient.characterId) {
          const ch = characters.current.get(prev.currentClient.characterId);
          if (ch) {
            characterOutcome = ch.onRefused(prev);
          }
        }

        const { caught, accusationText, guestResponse, logMsg, patiencePenalty } =
          checkAccusation({ field, client: prev.currentClient, reservations: prev.reservations });

        // ... rest of existing accusation logic unchanged ...

        return {
          ...prev,
          ...characterOutcome,   // merge character consequence
          currentClient: { ...prev.currentClient, patience: nextPatience, /* ... */ },
          logs: nextLogs,
        };
      });
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast, characters]);

  return { callOutLie };
}
```

- **Step 2: Run lint**

```bash
npm run lint
```

Expected: clean (all hooks updated).

- **Step 3: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- **Step 4: Commit**

```bash
git add src/hooks/useAccusationActions.ts
git commit -m "feat: call character.onRefused in useAccusationActions for VIP characters"
```

---

## Task 10: Update `Clipboard.tsx` and `App.tsx`

**Files:**

- Modify: `src/components/desk/Clipboard.tsx`
- Modify: `src/App.tsx`
- **Step 1: Update `Clipboard.tsx`**

Replace `Vip`/`Banned` imports with `CharacterDefinition`. Update `VipDossierEntry` and `BannedDossierEntry` props to accept `CharacterDefinition`. Update render logic:

```tsx
// At the top, import CHARACTER_ROSTER
import { CHARACTER_ROSTER } from '../../logic/characterRoster';
import type { CharacterDefinition } from '../../types';

// VipDossierEntry now takes CharacterDefinition
const VipDossierEntry: React.FC<{ char: CharacterDefinition; isSeated: boolean }> = ({ char, isSeated }) => {
  const arrivalText =
    char.arrivalMO === 'RESERVATION_ALIAS'
      ? `Books as "${char.aliasFirstName} ${char.aliasLastName}" · Party of ${char.expectedPartySize}`
      : char.arrivalMO === 'WALK_IN' || char.arrivalMO === 'BYPASS'
        ? `Walk-in, no reservation · Party of ${char.expectedPartySize}`
        : `Late arrival · Party of ${char.expectedPartySize}`;

  // Replace consequenceTier badge logic with consequenceDescription or a
  // simplified badge based on whether gameOver/cashPenalty/ratingPenalty/moralePenalty is set
  // ...
};

// In the render, replace gameState.dailyVips with derived lookup:
const dailyVipDefs = gameState.dailyCharacterIds
  .map(id => CHARACTER_ROSTER.find(c => c.id === id))
  .filter((c): c is CharacterDefinition => c !== undefined && c.role === 'VIP');

const dailyBannedDefs = gameState.dailyCharacterIds
  .map(id => CHARACTER_ROSTER.find(c => c.id === id))
  .filter((c): c is CharacterDefinition => c !== undefined && c.role === 'BANNED');
```

Then update all references to `gameState.seatedVipIds` / `gameState.seatedBannedIds` → `gameState.seatedCharacterIds`.

- **Step 2: Update `App.tsx`**

Find the two lines that read `gameState.gameOverVipId` / `gameState.gameOverBannedId` (around line 135-143):

```ts
// Replace:
if (loseReason === 'vip' && gameState.gameOverVipId) {
  const vip = gameState.dailyVips.find((v) => v.id === gameState.gameOverVipId);
  // ...
} else if (loseReason === 'banned' && gameState.gameOverBannedId) {
  const banned = gameState.dailyBanned.find((b) => b.id === gameState.gameOverBannedId);
  // ...
}

// With:
if (gameState.gameOverCharacterId) {
  const char = CHARACTER_ROSTER.find(c => c.id === gameState.gameOverCharacterId);
  if (char) {
    // use char.name, char.consequenceDescription, char.role for the game-over story
  }
}
```

Also add `import { CHARACTER_ROSTER } from './logic/characterRoster';` to `App.tsx`.

- **Step 3: Run lint**

```bash
npm run lint
```

Expected: clean build.

- **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- **Step 5: Start dev server and smoke-test manually**

```bash
npm run dev
```

Manual checks:

- Game starts without errors
- Clipboard VIPs tab shows correct characters
- Clipboard Banned tab shows correct characters
- A normal game night plays through without console errors
- **Step 6: Commit**

```bash
git add src/components/desk/Clipboard.tsx src/App.tsx
git commit -m "feat: update Clipboard and App to use unified CharacterDefinition and gameOverCharacterId"
```

---

## Task 11: End-to-end verification and cleanup

**Files:**

- Modify: `src/logic/vipRoster.ts`, `src/logic/bannedRoster.ts`, `src/logic/vipLogic.ts`, `src/logic/bannedLogic.ts` (mark as deprecated or delete if no references remain)
- **Step 1: Check for remaining references to old files**

```bash
grep -rn "vipRoster\|bannedRoster\|vipLogic\|bannedLogic\|dailyVips\|dailyBanned\|seatedVipIds\|seatedBannedIds\|gameOverVipId\|gameOverBannedId\|\.vipId\|\.bannedId" src/ --include="*.ts" --include="*.tsx"
```

Expected: no results (all references migrated).

- **Step 2: Delete old files if no references remain**

```bash
git rm src/logic/vipRoster.ts src/logic/bannedRoster.ts src/logic/vipLogic.ts src/logic/bannedLogic.ts
git rm src/logic/__tests__/vipLogic.test.ts src/logic/__tests__/bannedLogic.test.ts
```

- **Step 3: Run full test suite**

```bash
npm run test
```

Expected: all tests pass, no TypeScript errors.

- **Step 4: Run lint**

```bash
npm run lint
```

Expected: clean.

- **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete SpecialCharacter migration — remove old vipRoster, bannedRoster, vipLogic, bannedLogic"
```

