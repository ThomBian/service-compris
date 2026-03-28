---
title: Special Characters — Unified VIP & Banned Architecture
version: 1.0.0
date: 2026-03-28
status: approved
scope: The Syndicate + Manu Macaroon (representative characters); architecture scales to full lore roster
---

# Special Characters — Unified VIP & Banned Architecture

## 1. Problem Statement

The existing `Vip` and `Banned` types are parallel flat interfaces with uniform, tier-based consequence logic. The lore roster (`lore-vips.md`, `lore-banned.md`) requires characters with unique, heterogeneous behaviors (queue bypass, patience auras, menu checks, etc.) that cannot be expressed in a flat consequence tier.

Additionally, future features require game state to be serializable (backend save/load, progression storage). Functions cannot live inside persisted state.

---

## 2. Core Principle

VIPs and Banned characters are not two separate types — they are two **roles** of the same concept: a **Special Character** the player must recognize and handle correctly.

| Role     | Correct player action                  | Failure trigger                            |
|----------|----------------------------------------|--------------------------------------------|
| `VIP`    | Seat them (accommodate rule-breaking)  | Refusing, accusing, or patience timeout    |
| `BANNED` | Identify via Banned tab → refuse       | Seating them                               |

---

## 3. Architecture

### 3.1 Data Layer — `CharacterDefinition` (serializable)

Pure data. Safe to store in JSON, persist to DB, and send over the wire.

```ts
interface CharacterDefinition {
  id:                string;
  name:              string;
  role:              'VIP' | 'BANNED';
  behaviorType:      string;        // selects the runtime class via factory
  visualTraits:      VisualTraits;
  clueText:          string;        // text shown on the clipboard tab
  arrivalMO:         'RESERVATION_ALIAS' | 'WALK_IN' | 'LATE' | 'BYPASS';
  aliasFirstName?:   string;
  aliasLastName?:    string;
  expectedPartySize: number;
  // behavior-specific params (only present when behaviorType requires them)
  auraRecovery?:     'ON_SEATING';
  cashBonus?:        number;
  cashPenalty?:      number;
  ratingPenalty?:    number;
  moralePenalty?:    number;
  gameOver?:         boolean;
}
```

### 3.2 Runtime Layer — Class Hierarchy (never serialized)

Instantiated once per session from `CharacterDefinition`. Never stored in `GameState`.

```ts
// Base — shared lifecycle hooks
abstract class SpecialCharacter {
  constructor(readonly def: CharacterDefinition) {}
  onDesk?(state: GameState): Partial<GameState>;     // called when they reach the desk
  onAuraTick?(state: GameState): Partial<GameState>; // called every game tick while waiting
  abstract onSeated(state: GameState): Partial<GameState>;
  abstract onRefused(state: GameState): Partial<GameState>;
}

// Role mid-layer — groups clipboard tab, consequence defaults
abstract class VipCharacter    extends SpecialCharacter {}
abstract class BannedCharacter extends SpecialCharacter {}

// Concrete behavior classes (initial set)
class StandardVip       extends VipCharacter    { ... }
class BypassQueueVip    extends VipCharacter    { ... }  // The Syndicate
class AuraDrainVip      extends VipCharacter    { ... }  // Manu Macaroon
class StandardBanned    extends BannedCharacter { ... }
```

### 3.3 Factory

Maps `behaviorType` string → concrete class.

```ts
function createCharacter(def: CharacterDefinition): SpecialCharacter
```

### 3.4 GameState Changes

```ts
// Replace:
dailyVips:        Vip[];
seatedVipIds:     string[];
dailyBanned:      Banned[];
seatedBannedIds:  string[];
gameOverVipId:    string | null;
gameOverBannedId: string | null;

// With:
dailyCharacterIds:    string[];   // serializable — IDs only
seatedCharacterIds:   string[];
gameOverCharacterId:  string | null;  // role-agnostic; GameOverReason 'VIP'/'BANNED' is preserved

// New fields:
strikeActive: boolean;           // set by AuraDrainVip.onRefused, cleared by onSeated
```

`GameOverReason` (`'VIP' | 'BANNED'`) is preserved as-is — the `role` field on the `CharacterDefinition` provides the same information at render time via `CHARACTER_ROSTER.find(c => c.id === gameOverCharacterId)?.role`.

Runtime instances live in a hook ref, never in state:

```ts
// In useGameEngine (or a new useSpecialCharacters hook)
const characters = useRef<Map<string, SpecialCharacter>>(new Map())
// Populated once on session start from dailyCharacterIds + CHARACTER_ROSTER
```

### 3.5 Roster File

`src/logic/characterRoster.ts` replaces `vipRoster.ts` and `bannedRoster.ts`. Exports:

```ts
export const CHARACTER_ROSTER: CharacterDefinition[]
```

---

## 4. Character Designs

### 4.1 The Syndicate (`BypassQueueVip`)

```ts
{
  id: 'the-syndicate',
  name: 'The Syndicate',
  role: 'VIP',
  behaviorType: 'BYPASS_QUEUE',
  arrivalMO: 'BYPASS',
  expectedPartySize: 4,
  clueText: "Watch out for the Pinstripes tonight.",
  visualTraits: { clothingStyle: 3 /* pinstripe */, ... },
  cashBonus: 500,
  ratingPenalty: 1.0,
  moralePenalty: 20,
}
```

**Spawn condition:** `queue.length >= 3` AND grid has `<= 4` empty cells. Checked each tick by `useClientSpawner`.

**Prerequisite — queue patience drain:** The current `useGameClock` does not drain patience for clients in the queue (it only handles overtime morale and meal timers). This spec introduces queue patience drain as a new tick-level mechanic — required both for the Syndicate interruption pressure and the Strike aura. Queue patience drain must be implemented as part of this spec (see Section 5 — Tick Logic).

**State flow:**

1. `useClientSpawner` creates the Syndicate client and calls `character.onDesk(state)` first — this returns the updated queue (with any displaced desk client pushed to front). The spawner then sets `currentClient` to the Syndicate and `physicalState: AT_DESK`. This ordering ensures the displaced client is in the queue before `currentClient` is replaced.
2. If a client was already at the desk, `onDesk()` pushes them to the **front of the queue** as a normal `IN_QUEUE` client. `currentClient` is then nulled and replaced with the Syndicate. Their patience continues draining at the normal rate.
3. Player sees 4 pinstripe avatars. Clipboard VIP tab shows clue passively — no required click.
4. Only **Seat** and **Refuse** are available (no accusation actions).

**Outcomes:**

- **Seated** → `cash += cashBonus`. Log: *"The Syndicate leaves a briefcase. +€500."*
- **Refused** → `rating -= ratingPenalty`, `morale -= moralePenalty`. Log: *"They smash the front window."*

**Class:**

```ts
class BypassQueueVip extends VipCharacter {
  onDesk(state: GameState): Partial<GameState> {
    const queue = state.currentClient
      ? [{ ...state.currentClient, physicalState: PhysicalState.IN_QUEUE }, ...state.queue]
      : state.queue;
    return { queue };
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

---

### 4.2 Manu Macaroon (`AuraDrainVip`)

```ts
{
  id: 'manu-macaroon',
  name: 'Manu Macaroon',
  role: 'VIP',
  behaviorType: 'AURA_DRAIN',
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Manu',
  aliasLastName: 'Macaroon',
  expectedPartySize: 4,   // reservation injected for 2; arrives with +2 security
  clueText: "The President is coming. Navy suit, tiny espresso cup. He brings security.",
  visualTraits: { clothingStyle: 0, neckwear: 0, ... },
  auraRecovery: 'ON_SEATING',
  ratingPenalty: 0.5,
  moralePenalty: 10,
}
```

**Mechanic:** Reservation is injected for party size 2. He arrives with `truePartySize: 4`. The player sees a size discrepancy and may instinctively accuse him or refuse — which triggers the Strike.

**Strike:** Any refusal or accusation sets `strikeActive: true`. All queue clients drain patience at ×2 per tick. Recovers to ×1 when Macaroon is seated. If Macaroon storms out (patience reaches 0 from the doubled drain before the player seats him), `strikeActive` also clears via `onStormOut()` — losing Macaroon is its own penalty without perpetual punishment.

**Integration with `useAccusationActions`:** `callOutLie` must check whether `currentClient.characterId` is set. If so, it must look up the runtime `SpecialCharacter` instance and call `character.onRefused(state)` before applying the standard accusation result. This is the mechanism by which an accusation against Macaroon (or any future VIP) triggers their consequence.

**State flow:**

1. Arrives via reservation normally — joins queue, advances to desk.
2. Player sees size discrepancy (2 booked, 4 present).
3. Any accusation or Refuse → `onRefused()` → `strikeActive = true`.
4. Seat him → `onSeated()` → `strikeActive = false`.

**Tick logic in `useGameClock`:**

```ts
const drainMultiplier = state.strikeActive ? 2 : 1;
queue.forEach(client => {
  client.patience -= BASE_DRAIN * drainMultiplier;
});
```

**Class:**

```ts
class AuraDrainVip extends VipCharacter {
  onRefused(state: GameState): Partial<GameState> {
    return { strikeActive: true };
  }
  onSeated(state: GameState): Partial<GameState> {
    return {
      strikeActive: this.def.auraRecovery === 'ON_SEATING' ? false : state.strikeActive,
    };
  }
}
```

---

## 5. Tick Logic — Queue Patience Drain

This spec introduces queue patience drain. `useGameClock` must add the following on each tick:

```ts
// Base drain per tick — applied to every client in the queue
const BASE_QUEUE_DRAIN = 1; // tune during implementation
const drainMultiplier = state.strikeActive ? 2 : 1;

const nextQueue = state.queue.map(client => ({
  ...client,
  patience: Math.max(0, client.patience - BASE_QUEUE_DRAIN * drainMultiplier),
}));
```

Clients whose patience reaches 0 in the queue storm out (same outcome as storming out from the desk). `useQueueManager` or `useGameClock` must handle the removal and apply the standard rating penalty.

`generateDailyCharacters` replaces `generateDailyVips` and `generateDailyBanned`. It uses the same difficulty-weighted probability logic currently in `vipLogic.generateDailyVips` (shuffled roster, filtered by `SPAWN_PROBABILITY[difficulty]`), applied to the unified `CHARACTER_ROSTER`. The selection function is role-agnostic.

---

## 6. Clipboard Integration

The Clipboard VIP tab renders all `dailyCharacterIds` where `role === 'VIP'`. The Banned tab renders those where `role === 'BANNED'`. No separate data sources needed.

The Syndicate's clue is **informational only** — no click required. Other VIPs (standard flow) require the player to click the clue to acknowledge before the Refuse button is locked.

---

## 7. Migration Path

1. Add `CharacterDefinition` to `types.ts`; deprecate `Vip` and `Banned` interfaces.
2. Update `Client` in `types.ts`: replace `vipId?: string` and `bannedId?: string` with `characterId?: string`.
3. Create `src/logic/characterRoster.ts` with The Syndicate and Manu Macaroon definitions; seed with translated versions of existing placeholder VIPs and Banned characters.
4. Create `src/logic/characters/` directory with base classes and concrete implementations. Add `onStormOut` optional hook to the `SpecialCharacter` base class — `AuraDrainVip` overrides it to clear `strikeActive`.
5. Create `src/logic/characters/factory.ts`.
6. Update `GameState`: replace four VIP/Banned fields with `dailyCharacterIds`, `seatedCharacterIds`, `gameOverCharacterId`, `strikeActive`.
7. Update `useGameEngine` to instantiate characters into a ref on session start.
8. Update `useClientSpawner` to handle `arrivalMO: 'BYPASS'` and set `characterId` on spawned clients (replacing `vipId`/`bannedId`).
9. Update `useGameClock` for queue patience drain and `strikeActive` drain multiplier; call `character.onStormOut()` for any queue client whose patience reaches 0.
10. Update `useDecisionActions` to call `onSeated` / `onRefused` via the characters ref.
11. Update `useAccusationActions` to call `character.onRefused()` when `currentClient.characterId` is set.
12. Update Clipboard component to render from unified `dailyCharacterIds`.

---

## 8. Out of Scope (this spec)

- The remaining 5 lore characters (Culinary Inquisition, Old Money Aristocrats, Donny Tromp, Mr. Feast, Gordon Angry)
- Daily Menu mechanic (required for Gordon Angry)
- Avatar visual rendering of pinstripe suits and espresso cup accessories
- Backend persistence layer
