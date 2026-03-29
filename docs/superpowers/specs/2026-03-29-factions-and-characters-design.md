---
title: Factions & Characters — Lore Roster Expansion + Faction Spawn Bias
version: 1.0.0
date: 2026-03-29
status: approved
scope: |
  IMPLEMENT: 6 lore characters (VIPs + Banned) + faction spawn bias system.
  SPEC ONLY: Faction macro rules (no implementation plan this cycle).
---

# Factions & Characters — Design Spec

## 1. Context

The unified `CharacterDefinition` / `SpecialCharacter` architecture is live (`characterRoster.ts`, `src/logic/characters/`). The roster currently holds The Syndicate, Manu Macaroon, and 5 placeholder characters. The campaign system tracks path scores across three paths: `underworld`, `michelin`, `viral` — which map directly to the three factions.

This spec covers two things:

1. **Character roster expansion** — add 6 named lore characters (3 VIPs, 3 Banned) with simplified mechanics that fit the existing architecture.
2. **Faction spawn bias** — make path scores dynamically increase the spawn probability of faction-aligned characters.

Faction macro rules (Flash Mobs, table proximity patience drain, Clout score, triple prestige penalties) are **documented here as future design intent** but are out of scope for implementation this cycle.

---

## 2. Character Roster Additions

### 2.1 New Behavior Type — `OVERSIZE_VIP`

One new concrete class is needed. `OversizeVip extends VipCharacter`:
- `onSeated`: applies `cashBonus` from the definition (triple standard rate).
- `onRefused`: applies `ratingPenalty` + `moralePenalty`.
- Clipboard flow: same as `StandardVip` — player must click the clue before Refuse is safe.

All other new characters reuse existing behavior types (`STANDARD_VIP`, `BYPASS_QUEUE`, `STANDARD_BANNED`).

---

### 2.2 VIP Definitions

#### Donny Tromp
```ts
{
  id: 'donny-tromp',
  name: 'Donny Tromp',
  role: 'VIP',
  behaviorType: 'OVERSIZE_VIP',
  factionPath: undefined,           // Independent — no faction boost
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Donald',
  aliasLastName: 'Tromp',
  reservedPartySize: 2,
  expectedPartySize: 4,             // arrives with 4 despite booking for 2
  clueText: 'Booking for 2, but the red tie goes past his knees. He never comes alone.',
  visualTraits: { skinTone: 4, hairStyle: 2, hairColor: 1, clothingStyle: 0, clothingColor: 4, height: 2, neckwear: 3 },
  cashBonus: 300,                   // triple rate on seating
  ratingPenalty: 1.0,
  moralePenalty: 15,
  consequenceDescription: 'Tromp storms out. Loud complaints all evening. −1 star.',
  refusalDescription: 'He would have paid triple. Next time.',
}
```

#### Gordon Angry
```ts
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
  ratingPenalty: 2.0,               // massive — "review bombed mid-meal"
  consequenceDescription: 'Gordon Angry reviews the restaurant mid-meal. −2 stars.',
  refusalDescription: 'The bread man was turned away. Fortunate.',
}
```

> **Simplified:** The full design has Gordon testing the Daily Menu and requiring refusal if it doesn't match. That mechanic doesn't exist yet. For now he is a high-stakes `STANDARD_VIP` — the player must identify him and seat him to avoid the 2-star penalty.

#### Mr. Feast
```ts
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
}
```

> **Simplified:** The full design has Mr. Feast arriving when the grid is entirely full, and rewards the player for kicking out an honest guest to make room. That "kick out seated guest" action doesn't exist yet. For now he uses `BYPASS_QUEUE` (same class as The Syndicate) — he jumps to the desk, and seating him pays a large tip regardless of grid occupancy.

---

### 2.3 Banned Definitions

#### The Phantom Eater
```ts
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
  cashPenalty: 120,                 // eats for free — modeled as lost table revenue
  consequenceDescription: 'The Phantom Eater finishes every course and leaves €0. −€120.',
  refusalDescription: 'Not tonight, Phantom.',
}
```

> **Simplified:** Full design has him occupying the table for the maximum meal duration. For now, modeled as a `cashPenalty` equal to average table revenue — achievable with the existing `STANDARD_BANNED` class.

#### Chef Balzac
```ts
{
  id: 'chef-balzac',
  name: 'Chef Balzac',
  role: 'BANNED',
  behaviorType: 'STANDARD_BANNED',
  factionPath: undefined,
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Balzac',         // fake nose — books under his own name brazenly
  aliasLastName: 'Dupuis',
  reservedPartySize: 3,
  expectedPartySize: 4,             // hides as the +1 in the back
  clueText: 'He hides in legitimate parties. Look for the fake nose and glasses at the back.',
  visualTraits: { skinTone: 1, hairStyle: 3, hairColor: 0, clothingStyle: 0, clothingColor: 0, height: 0, glasses: 0, facialHair: 1 },
  ratingPenalty: 2.5,
  consequenceDescription: 'Chef Balzac sabotages the kitchen mid-service. −2.5 stars.',
  refusalDescription: 'Whole party turned away — collateral damage, but the saboteur is gone.',
}
```

> **Simplified:** Full design extracts Balzac from the group (seats the innocent 3, kicks only him). That party-splitting mechanic doesn't exist yet. For now, identifying him on the Banned tab refuses the entire party. This is a harsher outcome for the player but keeps the mechanic simple.

#### Sodium Bae
```ts
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
}
```

> **Simplified:** Full design has him actively disrupting seated neighbours (they leave without paying). For now, his disaster is modeled as a combined morale + cash penalty applied immediately on seating — no live disruption to seated guests.

---

### 2.4 Visual Traits Notes

Several characters need visual traits not yet rendered by `ClientAvatar`:

| Character | Trait | Status |
|-----------|-------|--------|
| Donny Tromp | `neckwear: 3` (long red tie) | New neckwear variant needed |
| Phantom Eater | Gold tooth | Not in current avatar system — described in `clueText` only for now |
| Chef Balzac | `facialHair: 1` + `glasses: 0` combo | `glasses` already in system (from banned spec); `facialHair` exists |
| Sodium Bae | Raised arm pose | Not in avatar system — described in `clueText` only for now |

Traits that can't be rendered yet are referenced in `clueText` for clipboard identification. They can be added to the avatar system in a follow-on spec.

---

## 3. Faction Spawn Bias

### 3.1 Data Model

Add one optional field to `CharacterDefinition` in `src/types.ts`:

```ts
factionPath?: CampaignPath;
// 'underworld' | 'michelin' | 'viral'
// undefined = independent character, no faction-based spawn boost
```

### 3.2 New Constants

Add to `src/constants.ts`:

```ts
// Faction spawn bias tuning
export const FACTION_BOOST    = 0.4;   // max additive probability increase at MAX_PATH_SCORE
export const MAX_PATH_SCORE   = 10;    // path score value considered "fully committed"
```

### 3.3 Updated `generateDailyCharacters`

`src/logic/characterRoster.ts` — add `pathScores` as an optional third parameter:

```ts
export function generateDailyCharacters(
  difficulty: number,
  roster: CharacterDefinition[],
  pathScores?: PathScores,
): CharacterDefinition[] {
  if (difficulty === 0 || roster.length === 0) return [];

  return [...roster]
    .sort(() => Math.random() - 0.5)
    .filter(char => {
      const base = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
      const boost =
        char.factionPath && pathScores
          ? (pathScores[char.factionPath] / MAX_PATH_SCORE) * FACTION_BOOST
          : 0;
      return Math.random() < Math.min(0.95, base + boost);
    });
}
```

**Backward compatibility:** `pathScores` is optional. When omitted (or when all scores are 0), behaviour is identical to the current implementation. No existing tests require changes.

### 3.4 Integration Point

`useGameEngine.ts` — `buildInitialState` calls `generateDailyCharacters`. Pass `campaignState.pathScores` as the third argument:

```ts
const dailyChars = generateDailyCharacters(
  difficulty,
  CHARACTER_ROSTER,
  campaignState?.pathScores,
);
```

`campaignState` is already available in `useGameEngine` via the `GameProvider` prop chain.

---

## 4. Faction Macro Rules — Future Spec (No Implementation This Cycle)

These rules define the long-term feel of each faction path. Each requires new game mechanics documented below as future intent.

### 4.1 The Syndicate (underworld)

**Queue modifier:** Frequent walk-in parties of 4 in pinstripe suits. Syndicate clients have a zero-drain patience flag — their patience does not decrease while in the queue. They expect immediate service.

**Macro rule:** If a Syndicate client waits too long (patience threshold, not zero-drain related) or is refused: permanent morale penalty for the shift ("window smash"). If seated: large cash briefcase injection.

**New mechanics required:**
- Per-client `noDrainInQueue: boolean` flag
- Patience threshold for "waited too long" distinct from patience reaching 0

### 4.2 The Culinary Inquisition (michelin)

**Queue modifier:** Parties of 1–2 in formal wear. Their patience drains faster when:
- The restaurant is "too loud" (≥ N guests seated simultaneously — a new `seatedCount` derived value)
- Tables are placed too close together on the floorplan (adjacent occupied cells)

**Macro rule:** While a Critic is present (in queue or at desk), false accusations and rule infractions carry **triple** the normal star-rating penalty.

**New mechanics required:**
- `seatedCount` threshold ("loudness")
- Grid proximity detection (occupied adjacent cells reduce Critic patience)
- Accusation penalty multiplier (`activeModifiers` on `GameState`)

### 4.3 The Hype Train (viral)

**Queue modifier:** Flash Mobs — parties of 6–8 that appear without warning, pushing the queue to its limit. All Hype Train clients drain patience at double speed.

**Macro rule:** Seating Hype Train clients increments a new **Clout** score. When Clout crosses a threshold, currently-seated Syndicate and Inquisition guests have their meals end early (they leave without the full cash value).

**New mechanics required:**
- Party size > 4 (current grid and queue assume max 4 per party)
- `clout` field on `GameState`
- Cross-guest disruption: seated guests can be made to leave early by a game event

---

## 5. Migration Checklist

1. Add `factionPath?: CampaignPath` to `CharacterDefinition` in `src/types.ts`
2. Add `FACTION_BOOST` and `MAX_PATH_SCORE` to `src/constants.ts`
3. Add `OversizeVip` class to `src/logic/characters/`; register in `factory.ts`
4. Add 6 character definitions to `CHARACTER_ROSTER` in `src/logic/characterRoster.ts`; assign `factionPath` to existing characters as follows:
   - `the-syndicate` → `underworld`, `manu-macaroon` → `underworld`
   - `food-critic` → `michelin`, `the-inspector` → `michelin`
   - `fake-influencer` → `viral`
   - `the-owner`, `fake-hipster`, `drunk-group`, `small-spender`, `the-dictator` → leave `undefined` (independent)
5. Update `generateDailyCharacters` signature and logic in `src/logic/characterRoster.ts`
6. Pass `pathScores` to `generateDailyCharacters` in `useGameEngine.ts`
7. Add `neckwear: 3` variant to `ClientAvatar` SVG (Donny Tromp's red tie) — or defer to avatar follow-on spec

---

## 6. Out of Scope (This Spec)

- Gordon Angry's Daily Menu mechanic
- Mr. Feast's "kick out seated guest" action
- Chef Balzac's party-splitting / extraction mechanic
- Sodium Bae's live neighbour disruption
- Phantom Eater's max-duration table occupancy
- All faction macro rule mechanics (Section 4)
- Backend persistence of faction state
