---
title: Clipboard — VIP Dossier
date: 2026-03-25
status: approved
---

# Clipboard — VIP Dossier

## Context

This is sub-project 3 of the investigation interaction system. Sub-project 2 (2D Party Avatars) has shipped and provides the `VisualTraits` data model this spec builds on. Sub-project 4 (Dietary Mismatch) and the Banned List are separate future sub-projects.

The existing `Clipboard` component (`src/components/desk/Clipboard.tsx`) has three tabs — Menu, VIPs, Banned — all currently showing "coming soon". This sub-project fills in the VIP tab only.

---

## Goal

- Introduce a fixed cast of named VIP characters, each with unique visual traits, a distinct arrival MO, and a tier-based consequence for being refused
- Fill the Clipboard VIP tab with a dossier: a mini avatar portrait + arrival info + consequence severity per VIP expected tonight
- Guarantee VIP visual uniqueness by excluding their `VisualTraits` from random client generation
- Track successful VIP seatings and reflect them in the clipboard with a green highlight

---

## Out of Scope

- Banned tab content (separate future sub-project)
- Menu tab content (separate future sub-project)
- Badge / LORE system — `seatedVipIds` is the foundation, no further work now
- Allergy / dietary overlays on avatars (sub-project 4)
- VIP dialogue beyond consequence / success toasts
- Any "click to identify" mechanic — the game knows who is a VIP at spawn; the clipboard is a reference tool only

---

## Data Model

### `VisualTraits` — `src/types.ts`

Add three optional accessory fields to the existing `VisualTraits` interface. These are `undefined` on all regular clients (never rendered) and set to specific values only on VIP roster entries:

```ts
export interface VisualTraits {
  skinTone:      0 | 1 | 2 | 3 | 4;
  hairStyle:     0 | 1 | 2 | 3 | 4;
  hairColor:     0 | 1 | 2 | 3 | 4 | 5;
  clothingStyle: 0 | 1 | 2 | 3;
  clothingColor: 0 | 1 | 2 | 3 | 4;
  height:        0 | 1 | 2;
  // VIP-only accessories — undefined on regular clients
  hat?:        0 | 1 | 2;  // 0=top hat, 1=beret, 2=chef's toque
  facialHair?: 0 | 1;       // 0=curled moustache, 1=full beard
  neckwear?:   0 | 1 | 2;  // 0=red tie, 1=gold cravat, 2=red scarf
}
```

### `VipConsequenceTier` and `Vip` — `src/types.ts`

```ts
export type VipConsequenceTier = 'RATING' | 'CASH_FINE' | 'GAME_OVER';

export interface Vip {
  id: string;
  name: string;                          // display name e.g. "The Food Critic"
  visualTraits: VisualTraits;            // fixed, unique — reserved from random generation
  arrivalMO: 'RESERVATION_ALIAS' | 'WALK_IN' | 'LATE';
  aliasFirstName?: string;               // fake first name if arrivalMO = RESERVATION_ALIAS
  aliasLastName?: string;                // fake last name if arrivalMO = RESERVATION_ALIAS
  expectedPartySize: number;
  consequenceTier: VipConsequenceTier;
  cashFinePenalty?: number;              // required when consequenceTier = 'CASH_FINE'; cash to subtract
  consequenceDescription: string;        // e.g. "Devastating star loss" or "You're fired"
}
```

### `Client` — `src/types.ts`

Add `vipId?: string` after `isCaught`. Set at spawn if this client is a VIP instance.

### `GameState` — `src/types.ts`

Add three fields:

```ts
dailyVips: Vip[];        // populated once at game start, scaled by difficulty
seatedVipIds: string[];  // pushed to when a VIP client reaches SEATING state
gameOver: boolean;       // set to true when a GAME_OVER consequence fires
```

### `VIP_ROSTER` — `src/logic/vipRoster.ts` (new file)

A constant array of all defined VIP characters. Start with 2–3 entries; the data model supports N. Example entries:

```ts
export const VIP_ROSTER: Vip[] = [
  {
    id: 'food-critic',
    name: 'The Food Critic',
    visualTraits: {
      skinTone: 1, hairStyle: 0, hairColor: 5, clothingStyle: 0, clothingColor: 0,
      height: 1, facialHair: 0, neckwear: 0,  // curled moustache + red tie
    },
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Marcel', aliasLastName: 'Dupont',
    expectedPartySize: 2,
    consequenceTier: 'RATING',
    consequenceDescription: 'The review will be devastating.',
  },
  {
    id: 'the-owner',
    name: 'The Owner',
    visualTraits: {
      skinTone: 2, hairStyle: 3, hairColor: 1, clothingStyle: 0, clothingColor: 0,
      height: 2, hat: 0, neckwear: 1,  // top hat + gold cravat
    },
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    consequenceTier: 'GAME_OVER',
    consequenceDescription: "You're fired.",
  },
];
```

---

## Logic

### `src/logic/vipLogic.ts` (new file)

```ts
export function generateDailyVips(difficulty: number, roster: Vip[]): Vip[]
```

For the initial implementation, always returns exactly 1 randomly selected VIP from `roster` (`Math.random()` pick). The `difficulty` parameter is accepted but ignored — full difficulty scaling (0 VIPs early, 2+ VIPs later) is out of scope until a progression system exists. Called once during game initialisation with `VIP_ROSTER`.

### Trait exclusion — `src/logic/gameLogic.ts`

`generateClientData` gains an optional second parameter:

```ts
export function generateClientData(excludeTraits?: VisualTraits[]): ClientData
```

After generating `visualTraits`, checks for an exact match against every entry in `excludeTraits` (comparing all 9 fields including optionals). If a match is found, regenerates all trait fields and retries. The call site passes `dailyVips.map(v => v.visualTraits)`.

Exact-match comparison means checking all 6 base fields plus `hat`, `facialHair`, `neckwear` (all `undefined` for regular clients, so a non-VIP client with no accessories never collides with a VIP that has accessories).

### VIP client spawning

When `generateDailyVips` produces VIPs at game start, each VIP affects spawning differently based on `arrivalMO`:

- **`RESERVATION_ALIAS`**: At game initialisation, a fake `Reservation` is injected into `GameState.reservations[]` with `firstName = vip.aliasFirstName`, `lastName = vip.aliasLastName`, `partySize = vip.expectedPartySize`, `time = START_TIME + 60` (20:30 — mid first hour, giving the player time to consult the clipboard), `arrived = false`, `partySeated = false`. A unique `id` is generated (`'vip-res-' + vip.id`). When the client spawner creates a client for this reservation, it detects the `vip-res-` prefix and assigns `visualTraits = vip.visualTraits` and `vipId = vip.id`.
- **`WALK_IN`**: A walk-in client is generated with `visualTraits = vip.visualTraits` and `vipId = vip.id`. Their `spawnTime` is `START_TIME + 90` (fixed — 21:00, well into the shift). `isLate` is `false`.
- **`LATE`**: Same as `WALK_IN` but `isLate = true` and `spawnTime = START_TIME + 91` (just past the 30-minute late threshold relative to a notional 20:30 booking time, triggering the `isLate` flag in `createNewClient`).

### Consequence on REFUSE — `src/logic/useDecisionActions.ts`

When `currentClient.vipId` is set and REFUSE fires:

1. Look up the `Vip` entry in `gameState.dailyVips` by `vipId`
2. Apply consequence by tier:
   - `RATING`: subtract 1.5 stars (clamped to 0)
   - `CASH_FINE`: subtract `vip.cashFinePenalty` from `gameState.cash` (clamped to 0)
   - `GAME_OVER`: set `gameState.gameOver = true`. The existing win/loss screen (`src/components/BottomPanel.tsx`) already reads game-end state — the implementer should check whether it already handles a `gameOver` flag or needs a new condition added.
3. Fire a toast with the VIP's `consequenceDescription`

### Success on SEATING — `src/logic/useDecisionActions.ts`

When `currentClient.vipId` is set and SEATING fires:

1. Push `currentClient.vipId` into `gameState.seatedVipIds`
2. Fire a success toast: `"Well handled — [Vip.name] has been seated."`

---

## Components

### `src/components/desk/Clipboard.tsx` (modify)

The VIP tab currently shows "coming soon". Replace it with a list of `VipDossierEntry` elements sourced from `gameState.dailyVips`. Each entry:

- Mini avatar rendered by `<ClientAvatar traits={vip.visualTraits} />` (no `animState`), wrapped in a fixed `40px × 40px` container with `overflow: hidden` so portrait height variation does not affect layout
- VIP name (bold)
- Arrival info: alias name (if `RESERVATION_ALIAS`), walk-in note, or late-arrival note
- Consequence badge: colour-coded by tier (amber for `RATING`, orange for `CASH_FINE`, dark red + skull for `GAME_OVER`)
- Seated state: when `vip.id` appears in `seatedVipIds`, the entry gains a green border, dimmed avatar, and a ✓ badge in the top-right corner

The Banned tab keeps its "coming soon" placeholder. The `Clipboard` component reads `dailyVips` and `seatedVipIds` from `useGame()`.

### `src/components/scene/ClientAvatar.tsx` (modify)

Add rendering for the three optional accessory fields in `VisualTraits`. Each renders as an SVG layer above the existing clothing/hair layers:

- `hat === 0`: tall top hat (dark `#1a1a1a` cylinder + brim)
- `hat === 1`: beret (dark red `#8B0000` ellipse with side pip)
- `hat === 2`: chef's toque (white cylinder + brim stripe)
- `facialHair === 0`: curled moustache (two arcs with turned-up tips, matching `hairColor`)
- `facialHair === 1`: full beard (path covering lower face, matching `hairColor`)
- `neckwear === 0`: red tie (`#c0392b` polygon over jacket front)
- `neckwear === 1`: gold cravat (`#d4af37` puffed arc + knot circle)
- `neckwear === 2`: red scarf (`#c0392b` draped path with trailing end)

All three fields default to no rendering when `undefined`.

---

## Animation Trigger Map

No new animation triggers. VIP clients use the same `entrance`, `accused`, `refused` states as regular clients. The only VIP-specific visual feedback is in the Clipboard (green highlight on seating) and the toast system (consequence/success messages).

---

## Testing

Five new test cases in `src/logic/__tests__/vipLogic.test.ts` (new file):

1. **`generateDailyVips` returns empty array at difficulty 0** — assert `[]` returned below threshold
2. **`generateDailyVips` returns at least 1 VIP at difficulty 1** — assert length ≥ 1
3. **`generateClientData` never matches a VIP's full `visualTraits`** — generate 200 clients with one VIP excluded; assert none produce an exact match on all 9 trait fields
4. **VIP consequence fires on REFUSE** — create a `GameState` with a VIP client as `currentClient`, dispatch REFUSE, assert the correct consequence is applied (rating reduced / game-over flag set)
5. **`seatedVipIds` is populated on SEATING** — dispatch SEATING for a VIP client, assert `gameState.seatedVipIds` contains the VIP's ID
