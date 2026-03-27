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

### `VisualTraits` extensions — `src/types.ts`

Two new optional fields, exclusive to banned characters, added alongside the existing VIP accessory block:

```ts
// Banned-only accessories — undefined on regular clients and VIPs
glasses?:  0 | 1;  // 0=round wire-frame, 1=oversized sunglasses
eyebrows?: 0 | 1;  // 0=heavy furrowed brow, 1=droopy half-closed lids (drunk)
```

Regular clients and VIPs always have these as `undefined`. Because `traitsMatch` uses strict equality (`undefined !== 0`), a regular client can never match a banned character's trait object even if their 6 base traits coincide — the accessory field alone breaks the match.

`traitsMatch` in `src/logic/vipLogic.ts` is extended to compare both new fields.

The `Accessories` component in `src/components/scene/ClientAvatar.tsx` renders all 4 values. `eyebrows=1` (skin-coloured lid flaps) requires the `skin` colour to be threaded into `Accessories` as a new prop (alongside existing `hairColor`).

---

## Roster — `src/logic/bannedRoster.ts`

Five banned characters across four consequence tiers (CASH_FINE is used twice, at different severity):

| id | Name | Arrival | Party | Tier | Penalty | glasses | eyebrows | Lore |
|----|------|---------|-------|------|---------|---------|----------|------|
| `fake-hipster` | The Fake Hipster | WALK_IN | 1 | CASH_FINE | 80 | 0 | — | Dressed like a hipster, skips the bill |
| `drunk-group` | The Drunk Group | LATE | 4 | MORALE | 30 | — | 1 | Rowdy crew — staff morale tanks |
| `small-spender` | The Small Spender | WALK_IN | 2 | CASH_FINE | 30 | 0 | 0 | Books a table, orders tap water and shares a starter |
| `fake-influencer` | The Fake Influencer | RESERVATION_ALIAS | 1 | RATING | 1.5 | 1 | — | Charm-comps their meal, posts a hit piece |
| `the-dictator` | The Dictator | RESERVATION_ALIAS | 3 | GAME_OVER | — | — | 0 | Didn't like the food. Attacked the restaurant. |

Each character gets a `visualTraits` object that includes at least one banned-exclusive accessory (`glasses` or `eyebrows`). Base traits must be distinct from all VIP roster entries. The Fake Hipster and Small Spender both use `glasses=0` but have different base traits — the player checks which wire-frame-glasses person matches the client at the desk.

---

## Shared Constant — `src/constants.ts`

Add `SPAWN_PROBABILITY` to `src/constants.ts` (alongside `START_TIME`, `TICK_RATE`, etc.) to avoid any circular dependency between `vipLogic.ts` and `bannedLogic.ts`:

```ts
// Probability per character slot at each difficulty level (0–3)
export const SPAWN_PROBABILITY: readonly number[] = [0, 0.5, 0.7, 0.9];
```

Both `vipLogic.ts` and `bannedLogic.ts` import it from `src/constants.ts`.

---

## Logic

### `generateDailyBanned` — `src/logic/bannedLogic.ts`

Probabilistic spawn — higher difficulty increases the chance per character slot but does not guarantee a fixed count:

```ts
export function generateDailyBanned(difficulty: number, roster: Banned[]): Banned[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.filter(() => Math.random() < p);
}
```

At difficulty 1 (~50% per character): expect 0–3 banned on average. At difficulty 3 (~90%): expect 4–5.

### `generateDailyVips` — update `src/logic/vipLogic.ts`

Update to use the same probabilistic pattern from `SPAWN_PROBABILITY` (imported from `src/constants.ts`):

```ts
export function generateDailyVips(difficulty: number, roster: Vip[]): Vip[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.filter(() => Math.random() < p);
}
```

**Impact on existing tests:** The four `vipLogic.test.ts` tests that assert exact counts (`toHaveLength(1)`, `toHaveLength(2)`, cap test) must be replaced with probabilistic assertions (e.g. run N iterations, assert count is within expected range). The difficulty-0 and empty-roster tests remain deterministic and are unaffected.

`traitsMatch` stays in `vipLogic.ts` and is imported by `bannedLogic.ts` — this direction is safe (banned → vip, not circular).

### `injectBannedReservations` — `src/logic/bannedLogic.ts`

Same pattern as `injectVipReservations`. For each `RESERVATION_ALIAS` banned character in `dailyBanned`, inject a fake `Reservation` with `id = 'banned-res-' + banned.id`, `time = START_TIME + 60`.

```ts
export function injectBannedReservations(
  dailyBanned: Banned[],
  existingReservations: Reservation[]
): Reservation[]
```

### `computeBannedSeatingOutcome` — `src/logic/bannedLogic.ts`

Pure function — applies the consequence when a banned customer is seated:

```ts
export function computeBannedSeatingOutcome(
  banned: Banned,
  current: { cash: number; morale: number; rating: number; gameOver: boolean }
): { cash: number; morale: number; rating: number; gameOver: boolean }
```

- `CASH_FINE` → `cash = Math.max(0, cash - banned.cashFinePenalty!)`
- `MORALE` → `morale = Math.max(0, morale - banned.moralePenalty!)`
- `RATING` → `rating = Math.max(0, rating - banned.ratingPenalty!)`
- `GAME_OVER` → `gameOver = true`

All numeric fields are floored at 0.

---

## Spawning — `src/hooks/useClientSpawner.ts`

Extend the existing spawner with banned support:

- **RESERVATION_ALIAS**: detect `id.startsWith('banned-res-')` in reservation spawning — override `visualTraits` with the banned character's traits and set `bannedId`
- **WALK_IN / LATE**: `spawnBannedWalkIn(banned: Banned)` callback, same pattern as `spawnVipWalkIn`. WALK_IN banned spawn at `START_TIME + 90`, LATE at `START_TIME + 91`. Tracked via `'banned-walkin-' + banned.id` in `spawnedReservationIds`.

Note: VIP and banned walk-ins share the same spawn offsets (`+90`, `+91`). If a night has both, two clients may queue at the same tick — this is acceptable given the queue manager handles it.

`excludeTraits` passed to `generateClientData` expands to include both VIP and banned visual traits:
```ts
const excludeTraits = [
  ...prev.dailyVips.map(v => v.visualTraits),
  ...prev.dailyBanned.map(b => b.visualTraits),
];
```

Add `gameState.dailyBanned` to the `useEffect` dependency array alongside `gameState.dailyVips`.

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

Same structure as `VipDossierEntry`: mini avatar (no fixed height, let SVG size naturally — same fix applied to VIPs) + name + arrival description + consequence badge.

**Unseated state**: neutral card (`bg-white/60 border-[#141414]/10`)
**Seated (missed) state**: alarming red card (`border-red-500 bg-red-50`), avatar at 60% opacity, name in `text-red-700`, badge reads **"Slipped through"** with a ⚠️ icon.

Consequence badge colors:
- `GAME_OVER`: dark red background, skull icon
- `CASH_FINE`: orange background, 💸 icon
- `MORALE`: purple background, 😵 icon
- `RATING`: amber background, ⭐ icon (crossed out)

The Banned tab renders `gameState.dailyBanned.map(...)`. If `dailyBanned` is empty (difficulty 0), show a single line: _"No trouble expected tonight."_

---

## ClientAvatar Rendering — `src/components/scene/ClientAvatar.tsx`

The `Accessories` function gains `glasses`, `eyebrows`, and `skin` props. All 4 values render as SVG elements inside the 48×80 viewBox, after the existing hat/facialHair/neckwear blocks.

**`glasses=0`** — round wire-frame glasses:
- Two `<circle>` stroke-only frames centred on the eye positions (cx=20.5/27.5, cy=14, r=3.2, stroke=`#2a2a2a`, strokeWidth=0.8, fill=none)
- Bridge `<line>` between lenses; arm `<line>` elements to face edge
- Sits over the existing eye ellipses (Accessories renders last)

**`glasses=1`** — oversized sunglasses:
- Single wide `<rect>` spanning both eyes (x=16, y=11.5, width=16, height=5.5, rx=2, fill=`#141414`, opacity=0.85)
- Arm lines to face edge — fully obscures the eye ellipses beneath

**`eyebrows=0`** — heavy furrowed brow (stern/authoritarian):
- Two thick curved `<path>` strokes angled inward toward the nose bridge (strokeWidth=2.2, strokeLinecap=round)
- Left: `M16 11 Q19 10 21 11.5` — Right: `M32 11 Q29 10 27 11.5`

**`eyebrows=1`** — droopy half-closed lids (drunk/glazed):
- Two `<ellipse>` flaps in skin colour sitting over the top half of each eye (cx=20.5/27.5, cy=12.8, rx=2.8, ry=2.2, fill={skin})
- Covers ~60% of each eye, creating a slit appearance; requires `skin` prop

---

## GameContext — `src/context/GameContext.tsx`

No new actions needed — banned consequences fire automatically in `confirmSeating`. No context changes required.

---

## Testing — `src/logic/__tests__/bannedLogic.test.ts`

New test file. Fixtures: one `Banned` entry per consequence tier (4 fixtures: CASH_FINE, MORALE, RATING, GAME_OVER).

- `generateDailyBanned` returns `[]` at difficulty 0
- `generateDailyBanned` returns `[]` for empty roster
- `generateDailyBanned` never returns duplicates (run 50 iterations, assert no duplicate ids)
- `injectBannedReservations` injects one reservation for a RESERVATION_ALIAS banned character
- `injectBannedReservations` does not inject reservation for WALK_IN or LATE banned
- `computeBannedSeatingOutcome` CASH_FINE — subtracts penalty, floors at 0 (test with penalty > cash)
- `computeBannedSeatingOutcome` MORALE — subtracts penalty, floors at 0 (test with penalty > morale)
- `computeBannedSeatingOutcome` RATING — subtracts penalty, floors at 0
- `computeBannedSeatingOutcome` GAME_OVER — sets `gameOver = true`

### Updates to `src/logic/__tests__/vipLogic.test.ts`

The existing exact-count tests (`toHaveLength(1)`, `toHaveLength(2)`, cap test) must be replaced once `generateDailyVips` becomes probabilistic. Replace with:
- `generateDailyVips` at difficulty 0 returns `[]` (deterministic — unchanged)
- `generateDailyVips` never returns duplicates (run 50 iterations)
- `generateDailyVips` probabilistic at difficulty 1 — run 200 iterations, assert count varies (not always the same value)
- `generateDailyVips` never returns more than roster size
