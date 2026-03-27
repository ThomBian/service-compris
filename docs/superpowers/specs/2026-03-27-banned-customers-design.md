---
title: Banned Customers
date: 2026-03-27
status: approved
---

# Banned Customers

## Context

VIPs are fixed named characters the player is rewarded for seating correctly. Banned customers are their mirror: named characters the player must refuse. Seating a banned customer without spotting them triggers a consequence. The player identifies them by comparing the client at the desk against the Banned tab in the Clipboard.

## Goal

- Add a fixed roster of 5 banned characters with unique visual traits and lore
- Seating a banned customer automatically triggers a consequence (no explicit spot action needed)
- Fill the Banned tab in the Clipboard with dossier entries, mirroring the VIPs tab
- Integrate banned spawning into the existing difficulty system (probabilistic, same slider as VIPs)

## Out of Scope

- A "flag as banned" action — detection is passive (player compares traits to clipboard)
- Persisting caught/missed banned customers across sessions
- Banning players from refusing banned customers they didn't identify

---

## Data Model

### New types — `src/types.ts`

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
  cashFinePenalty?: number;     // required for CASH_FINE
  moralePenalty?: number;       // required for MORALE
  ratingPenalty?: number;       // required for RATING
  consequenceDescription: string;
}
```

### `Client` — `src/types.ts`

Add `bannedId?: string` after existing `vipId?: string`.

### `GameState` — `src/types.ts`

Add after `seatedVipIds`:
```ts
dailyBanned: Banned[];
seatedBannedIds: string[];   // IDs of banned customers the player accidentally seated
```

---

## Roster — `src/logic/bannedRoster.ts`

Five banned characters, one per consequence tier:

| id | Name | Arrival | Party | Tier | Penalty | Lore |
|----|------|---------|-------|------|---------|------|
| `fake-hipster` | The Fake Hipster | WALK_IN | 1 | CASH_FINE | 80 | Dressed like a hipster, skips the bill |
| `drunk-group` | The Drunk Group | LATE | 4 | MORALE | 30 | Rowdy crew — staff morale tanks |
| `small-spender` | The Small Spender | WALK_IN | 2 | CASH_FINE | 30 | Books a table, orders tap water and shares a starter |
| `fake-influencer` | The Fake Influencer | RESERVATION_ALIAS | 1 | RATING | 1.5 | Charm-comps their meal, posts a hit piece |
| `the-dictator` | The Dictator | RESERVATION_ALIAS | 3 | GAME_OVER | — | Didn't like the food. Attacked the restaurant. |

Each character gets a `visualTraits` object using existing `VisualTraits` fields (base traits only — no accessories required, accessories remain VIP-exclusive). Traits must not collide with any VIP roster entry (enforced by the existing `traitsMatch` exclusion in `generateClientData`).

---

## Logic — `src/logic/bannedLogic.ts`

### `generateDailyBanned`

Probabilistic spawn — higher difficulty increases the chance per slot but does not guarantee a fixed count:

```ts
const SPAWN_PROBABILITY = [0, 0.5, 0.7, 0.9]; // indexed by difficulty 0–3

export function generateDailyBanned(difficulty: number, roster: Banned[]): Banned[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.filter(() => Math.random() < p);
}
```

At difficulty 1 (~50% per character): expect 0–2 banned on average. At difficulty 3 (~90%): expect 4–5.

### `generateDailyVips` — update `src/logic/vipLogic.ts`

Update to use the same probability table instead of fixed count, for consistency:

```ts
export function generateDailyVips(difficulty: number, roster: Vip[]): Vip[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.filter(() => Math.random() < p);
}
```

`SPAWN_PROBABILITY` is exported from `bannedLogic.ts` and imported in `vipLogic.ts` (single definition).

### `injectBannedReservations`

Same pattern as `injectVipReservations`. For each `RESERVATION_ALIAS` banned character in `dailyBanned`, inject a fake `Reservation` with `id = 'banned-res-' + banned.id`, `time = START_TIME + 60`.

```ts
export function injectBannedReservations(
  dailyBanned: Banned[],
  existingReservations: Reservation[]
): Reservation[]
```

### `computeBannedSeatingOutcome`

Pure function — applies the consequence when a banned customer is seated:

```ts
export function computeBannedSeatingOutcome(
  banned: Banned,
  current: { cash: number; morale: number; rating: number; gameOver: boolean }
): { cash: number; morale: number; rating: number; gameOver: boolean }
```

- `CASH_FINE` → `cash -= banned.cashFinePenalty`
- `MORALE` → `morale = Math.max(0, morale - banned.moralePenalty)`
- `RATING` → `rating = Math.max(0, rating - banned.ratingPenalty)`
- `GAME_OVER` → `gameOver = true`

`traitsMatch` is imported from `vipLogic.ts` — no duplication.

---

## Spawning — `src/hooks/useClientSpawner.ts`

Extend the existing spawner with banned support:

- **RESERVATION_ALIAS**: detect `id.startsWith('banned-res-')` in reservation spawning — override `visualTraits` with the banned character's traits and set `bannedId`
- **WALK_IN / LATE**: `spawnBannedWalkIn(banned: Banned)` callback, same pattern as `spawnVipWalkIn`. WALK_IN banned spawn at `START_TIME + 90`, LATE at `START_TIME + 91`. Tracked via `'banned-walkin-' + banned.id` in `spawnedReservationIds`.

`excludeTraits` passed to `generateClientData` expands to include both VIP and banned visual traits:
```ts
const excludeTraits = [
  ...prev.dailyVips.map(v => v.visualTraits),
  ...prev.dailyBanned.map(b => b.visualTraits),
];
```

---

## Seating Consequence — `src/hooks/useDecisionActions.ts`

In `confirmSeating`, after the existing VIP success check, add a banned check:

```ts
if (deskClient.bannedId) {
  const banned = prev.dailyBanned.find(b => b.id === deskClient.bannedId);
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

---

## Game Initialisation — `src/hooks/useGameEngine.ts`

`buildInitialState` gains `dailyBanned` and `seatedBannedIds`:

```ts
function buildInitialState(difficulty: number): GameState {
  const dailyVips = generateDailyVips(difficulty, VIP_ROSTER);
  const dailyBanned = generateDailyBanned(difficulty, BANNED_ROSTER);
  const reservations = injectBannedReservations(
    dailyBanned,
    injectVipReservations(dailyVips, INITIAL_RESERVATIONS)
  );
  return {
    ...
    dailyBanned,
    seatedBannedIds: [],
  };
}
```

---

## Clipboard UI — `src/components/desk/Clipboard.tsx`

### `BannedDossierEntry` component

Same structure as `VipDossierEntry`: mini avatar (40×52px, same fix as VIPs) + name + arrival description + consequence badge.

**Unseated state**: neutral card (`bg-white/60 border-[#141414]/10`)
**Seated (missed) state**: alarming red card (`border-red-500 bg-red-50`), avatar at 60% opacity, name in `text-red-700`, badge reads **"Slipped through"** with a ⚠️ icon.

Consequence badge colors:
- `GAME_OVER`: dark red background, skull icon
- `CASH_FINE`: orange background, 💸 icon
- `MORALE`: purple background, 😵 icon
- `RATING`: amber background, ⭐ icon (crossed out)

The Banned tab renders `gameState.dailyBanned.map(...)`. If `dailyBanned` is empty (difficulty 0), show a single line: _"No trouble expected tonight."_

---

## GameContext — `src/context/GameContext.tsx`

No new actions needed — banned consequences fire automatically in `confirmSeating`. No context changes required.

---

## Testing — `src/logic/__tests__/bannedLogic.test.ts`

New test file. Fixtures: one `Banned` entry per consequence tier.

- `generateDailyBanned` returns `[]` at difficulty 0
- `generateDailyBanned` returns `[]` for empty roster
- `generateDailyBanned` never returns duplicates (run 50 iterations, check Set size)
- `injectBannedReservations` injects reservation for RESERVATION_ALIAS banned
- `injectBannedReservations` does not inject reservation for WALK_IN or LATE banned
- `computeBannedSeatingOutcome` — one test per tier: CASH_FINE subtracts penalty, MORALE subtracts penalty (floors at 0), RATING subtracts penalty (floors at 0), GAME_OVER sets gameOver = true

Existing `vipLogic.test.ts` — add one test verifying `generateDailyVips` also uses probabilistic spawn (runs 100 iterations at difficulty=1, asserts count is not always 1).
