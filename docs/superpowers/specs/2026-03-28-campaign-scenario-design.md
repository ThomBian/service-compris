---
title: Campaign Scenario — Architecture Design
version: 1.3.0
date: 2026-03-28
status: approved
---

# Campaign Scenario — Architecture Design

## Overview

The campaign wraps the existing multi-night loop in a structured 7-night story with branching narrative paths. Three systems are added: a **path scoring engine** that tracks player behavior across nights, a **campaign configuration layer** that drives night-specific content and gameplay modifiers, and a **corkboard screen** shown between each shift.

Lore content (character definitions, newspaper headlines, memos) is treated as pure data — the architecture is content-agnostic. All 7 nights and their path variants are populated in a subsequent pass.

---

## Monsieur V. — Voice Guidelines

All text written for Monsieur V. (memos, dismissal letters, quotes) must follow these rules. The voice applies equally in victory and defeat — the register never changes, only the subject matter.

**The voice:**
- Dry, precise, never emotional. He states things the way one states facts about the weather.
- Cynical but never cruel. He does not enjoy your failure — he is merely unsurprised by it.
- Economical. He says one thing too many only when the extra sentence is devastating.
- Occasionally absurdist. The detail that makes no sense ("my mother, who does not own a television") is always the sharpest.
- Formal address: always "Maître D'" (never your name) on bad nights; occasionally warmer on good ones.

**What he never does:**
- Shouts, exclaims, or uses emphatic punctuation.
- Uses clichés or motivational language.
- Apologises.
- Repeats himself.

**Sign-offs by mood:**

| Situation | Sign-off |
|---|---|
| Decent night | *"Yours, in cautious optimism"* |
| Strong night | *"With something approaching satisfaction"* |
| Catastrophic loss | *"Without further ceremony"* |
| Diplomatic incident | *"With all the warmth I have left"* |
| Staff walkout | *"Regretfully"* (the only time he uses this word) |

The P.S. is mandatory. It is always the line that lands.

---

## 1. Data Structures

### `NightRules` — Gameplay Modifier Bag

Rules are expressed as a flat list of typed key-value pairs. The engine looks up rules by key; each subsystem only responds to keys it knows about. Adding a new rule requires only a new key in `RuleKey` — no existing hook changes.

```ts
type RuleKey =
  | 'CLOCK_SPEED'             // number  — real-time interval multiplier (default 1)
  | 'PAUSE_DISABLED'          // boolean — hides/disables the pause button
  | 'RESERVATIONS_DISABLED'   // boolean — walk-ins only, no reservation injection
  | 'BLOCKED_GRID_CELLS'      // [number, number][] — [row, col] pairs locked out
  | 'QUEUE_SPAWN_RATE'        // number  — multiplies spawn interval
  | 'COVERS_TARGET'           // number  — win condition: seat this many covers to end shift early
  | 'STRICT_FALSE_ACCUSATION' // boolean — false accusation causes instant star wipe

interface ActiveRule {
  key: RuleKey;
  value: number | boolean | [number, number][];
}
```

`GameState` gains one new field:

```ts
activeRules: ActiveRule[];  // set at shift start, read-only during play
```

A single helper used by every hook:

```ts
// Casts internally — call sites do not need type guards
function getRule<T>(rules: ActiveRule[], key: RuleKey, defaultValue: T): T {
  return (rules.find(r => r.key === key)?.value as T) ?? defaultValue;
}
```

### `NightConfig` — Per-Night Content + Rules

```ts
interface NightConfig {
  newspaper: string;        // headline text
  quote: string;            // Monsieur V.'s opening quote
  memo: string;             // gameplay instructions for the night
  characterIds: string[];   // explicit daily character list for this night
  rules: ActiveRule[];      // gameplay modifiers for this night
}

type CampaignPath = 'default' | 'underworld' | 'michelin' | 'viral';

// Static data — src/data/campaignConfig.ts
const CAMPAIGN_CONFIG: Record<number, Record<CampaignPath, NightConfig>>
```

Nights 1–2 use `'default'` only (no branching). Nights 3–6 have entries for all three paths. Night 7 has entries for all three paths (the finales).

`CAMPAIGN_CONFIG[1]` must be populated — its `characterIds` and `rules` are used by `buildInitialState` even though Night 1 has no corkboard. There is no fallback to defaults when a config entry is missing; all nights must have a `'default'` entry.

When `NightConfig.characterIds` is non-empty, it is passed directly to `buildInitialState` as the daily character list, bypassing `generateDailyCharacters`. This gives campaign nights full control over which characters appear.

### `FiredConfig` — Loss Corkboard Content

Each `GameOverReason` gets its own dismissal content. Stored in `src/data/firedConfig.ts`.

```ts
interface FiredConfig {
  ledgerStamp: string;          // e.g. "Insolvent", "Abandoned", "Dismissed"
  newspaperHeadline: string;
  newspaperDeck: string;
  newspaperBodyLeft: string;    // left column body copy
  newspaperBodyRight: string;   // right column body copy
  letterSalutation: string;
  letterBody: string;           // paragraph(s) before the rule
  letterQuote: string;          // Monsieur V.'s closing quote (italic, left-bordered)
  letterSignOff: string;        // e.g. "Without further ceremony,"
  letterPS: string;             // mandatory; always the line that lands
}

// One entry per loss reason
const FIRED_CONFIG: Record<Exclude<GameOverReason, 'COVERS_TARGET' | null>, FiredConfig>
```

`COVERS_TARGET` and `null` are excluded — they are not loss states.

### `PathScores` + `CampaignState`

```ts
interface PathScores {
  underworld: number;
  michelin: number;
  viral: number;
}

interface CampaignState {
  nightNumber: number;
  pathScores: PathScores;
  lastNightLedger: LedgerData | null;      // null on Night 1 (no prior shift)
  lossReason: Exclude<GameOverReason, 'COVERS_TARGET' | null> | null;  // set on loss, drives fired corkboard
}

interface LedgerData {
  cash: number;
  netProfit: number;
  rating: number;
  coversSeated: number;
}
```

`activePath` is derived (never stored): the key with the highest score. Ties — including the initial state where all scores are zero — fall back to `'default'`. This is safe because all nights must have a `'default'` entry in `CAMPAIGN_CONFIG`. On Night 7, whichever path leads determines the finale config.

---

## 2. Phase Machine

`App.tsx` gains a `GamePhase` type driving which screen is rendered:

```ts
type GamePhase = 'LANDING' | 'CORKBOARD' | 'PLAYING';
```

There is no separate `SUMMARY` phase. The corkboard screen IS the summary — the ledger shows the shift's P&L, the newspaper and owner's letter react to what happened. Documents appear sequentially (see §6 — Reveal Animation).

### Flow

```
LANDING
  → (difficulty selected) → PLAYING (Night 1, no corkboard on first night)

PLAYING
  → (shift ends — win)  → CORKBOARD  (next_night variant)
  → (shift ends — loss) → CORKBOARD  (fired variant, then reset to LANDING)

CORKBOARD (next_night)
  → (Open Restaurant button) → PLAYING

CORKBOARD (fired)
  → (Leave. button) → App.tsx calls resetCampaign() → LANDING
```

Both variants are the same `'CORKBOARD'` phase. `App.tsx` sets `lossReason` (via `fireCorkboard`) or clears it (via `advanceNight`) before transitioning — `CorkboardScreen` reads `lossReason` to pick its variant.

The `EndOfNightSummary` component and the existing animated P&L receipt screen are **removed**. Bill calculation (§2 of the end-of-service spec) still runs at shift end to populate `LedgerData` — the corkboard ledger displays those figures directly.

Night 1 wins skip the corkboard (no prior shift to display) and go directly from `PLAYING` to `PLAYING` via `resetGame`. Night 1 losses still show the fired corkboard.

### `GameProvider` lifetime

A **single `GameProvider` instance** lives for the entire campaign run. It is only unmounted when `App.tsx` transitions to `LANDING` (on loss or explicit quit). Phase transitions between `PLAYING`, `SUMMARY`, and `CORKBOARD` do not remount the provider — `App.tsx` conditionally renders the active screen while keeping `GameProvider` mounted. This preserves the `characters` ref and timer state in `useGameClock` / `useClientSpawner` across transitions, and avoids unnecessary teardown of the hook tree.

```tsx
// App.tsx sketch
// GameProvider gains two new props:
interface GameProviderProps {
  children: ReactNode;
  incrementPathScore: (path: CampaignPath, delta: number) => void;
  // (existing resetGame call stays internal to GameProvider / useGameEngine)
}

<GameProvider incrementPathScore={incrementPathScore}>
  {phase === 'CORKBOARD' && <CorkboardScreen ... />}
  {phase === 'PLAYING'   && <GameContent ... />}
  {phase === 'SUMMARY'   && <SummaryOverlay ... />}
</GameProvider>
```

The existing `handleNextShift` inside `GameContent` currently calls `resetGame(difficulty, persist)` directly. Under the new architecture, the Summary's "Next Night" button is wired to call `advanceNight(ledger)` via a callback from `App.tsx`. `App.tsx`'s `useEffect` watcher then sets phase to `'CORKBOARD'` and calls `resetGame` at the point the player clicks "Open Restaurant" — not at the summary. `handleNextShift` is removed from `GameContent` and replaced by this flow.

---

## 3. `useCampaign` Hook

Lives in `src/hooks/useCampaign.ts`. Owned by `App.tsx` — not a context.

```ts
interface UseCampaignReturn {
  campaignState: CampaignState;
  activePath: CampaignPath;
  activeNightConfig: NightConfig;
  incrementPathScore: (path: CampaignPath, delta: number) => void;
  advanceNight: (ledger: LedgerData) => void;  // called by Summary "Next Night" button
  resetCampaign: () => void;                    // called by App.tsx on loss before LANDING
}
```

`activeNightConfig` is derived: `CAMPAIGN_CONFIG[nightNumber][activePath] ?? CAMPAIGN_CONFIG[nightNumber]['default']`. The `??` fallback handles the **path axis** only — if the active path has no entry for this night (e.g. Nights 1–2 are `'default'`-only), it falls back to `'default'`. The "no fallback for missing night" rule in Section 1 applies to the **night axis** — every night must have at least a `'default'` entry so `CAMPAIGN_CONFIG[nightNumber]` is never `undefined`.

`advanceNight(ledger)` increments `nightNumber` and stores `ledger` as `lastNightLedger`. `App.tsx` watches `campaignState.nightNumber` in a `useEffect` and sets `phase` to `'CORKBOARD'` when it increments.

On loss, `App.tsx`'s loss handler sets `lossReason` in `CampaignState` and transitions to `'CORKBOARD'`. The fired variant renders. When the player clicks "Leave.", `App.tsx` calls `resetCampaign()` then sets `phase` to `'LANDING'`, ensuring path scores and night number are cleared before the player sees the landing screen.

`useCampaign` gains one additional method:

```ts
fireCorkboard: (reason: Exclude<GameOverReason, 'COVERS_TARGET' | null>, ledger: LedgerData) => void;
// Sets lossReason + lastNightLedger, App.tsx useEffect transitions to 'CORKBOARD'
```

### Wiring `incrementPathScore` into hooks

`useCampaign` lives in `App.tsx` — outside `GameProvider`. `incrementPathScore` is passed down through the provider boundary as a prop:

```ts
// App.tsx
const { incrementPathScore, ... } = useCampaign();

// Passed into GameProvider
<GameProvider incrementPathScore={incrementPathScore} ...>
```

`GameProvider` forwards it into `useGameEngine`:

```ts
useGameEngine({ ..., incrementPathScore })
```

`useGameEngine` passes it into the hooks that fire on player decisions:

```ts
useDecisionActions(setGameState, ..., incrementPathScore)
useAccusationActions(setGameState, ..., incrementPathScore)
```

Those hooks call `incrementPathScore(path, delta)` alongside their existing state updates when a character-linked decision is made.

---

## 4. Path Score Increments

Example triggers (delta values are tunable — defined in `src/data/pathScoreWeights.ts`, not hardcoded in hooks):

| Event | Path | Example Delta |
|---|---|---|
| Seat The Syndicate | underworld | +15 |
| Refuse The Syndicate | michelin | +10 |
| Seat Mr. Feast | viral | +15 |
| Seat Donny Tromp | viral | +10 |
| Refuse a time-crime (correct call) | michelin | +5 |
| Seat with zero grid waste | underworld | +5 |
| Process queue faster than threshold | viral | +5 |

---

## 5. `NightRules` Integration

`buildInitialState` accepts `rules` alongside existing params:

```ts
function buildInitialState(
  difficulty: number,
  persist?: PersistData,
  rules?: ActiveRule[]
): GameState
```

Each hook reads `gameState.activeRules` via `getRule`.

| Rule key | Enforced in | Notes |
|---|---|---|
| `CLOCK_SPEED` | `useGameClock` | Multiplies the real-time tick interval directly (`TICK_RATE / timeMultiplier / clockSpeed`), orthogonal to `timeMultiplier` state and the difficulty lock |
| `PAUSE_DISABLED` | `TopBar` | |
| `RESERVATIONS_DISABLED` | `useClientSpawner` | |
| `BLOCKED_GRID_CELLS` | `FloorplanGrid` + seating logic | |
| `QUEUE_SPAWN_RATE` | `useClientSpawner` | |
| `COVERS_TARGET` | `useGameClock` | When `coversSeated >= target`, sets `gameOver = true` and routes to SUMMARY as a win variant |
| `STRICT_FALSE_ACCUSATION` | `useAccusationActions` | |

**`CLOCK_SPEED` and the difficulty lock:** The existing `setTimeMultiplier` in `useGameClock` enforces a minimum of `3x` on Hell difficulty — this clamp applies to the *player-controlled* multiplier only. `CLOCK_SPEED` operates as a separate factor applied to the raw tick interval, so it bypasses the player-facing multiplier state entirely and is not subject to the clamp.

**`COVERS_TARGET` win condition:** When `coversSeated` reaches the target value during a tick, `useGameClock` sets `gameOver = true` with `gameOverReason: 'COVERS_TARGET'`. The existing `GameOverReason` union gains this new value:

```ts
export type GameOverReason = 'MORALE' | 'VIP' | 'BANNED' | 'COVERS_TARGET' | null;
```

The summary component maps `GameOverReason` to `SummaryLoseReason` via the existing `summaryLoseReason` function. `'COVERS_TARGET'` maps to a new `'covers_target'` variant in `SummaryLoseReason` and is treated as a **win** variant — no lose-reason message is shown, the CTA reads "Night [N+1] →". The shift does not run to its normal 22:30 end.

---

## 6. Corkboard Screen

A new full-screen component `<CorkboardScreen>` rendered when `phase === 'CORKBOARD'`.

### Props

```ts
type CorkboardVariant = 'next_night' | 'fired';

interface CorkboardScreenProps {
  variant: CorkboardVariant;
  nightNumber: number;
  activePath: CampaignPath;
  // next_night only:
  nightConfig?: NightConfig;
  // both variants:
  ledger: LedgerData;
  // fired only:
  firedConfig?: FiredConfig;
  // callbacks:
  onOpenRestaurant: () => void;  // next_night: starts shift
  onLeave: () => void;           // fired: resetCampaign → LANDING
}
```

`ledger` is always non-null when `CorkboardScreen` renders (Night 1 win skips the corkboard; Night 1 losses still show the fired variant).

### Visual Design

**Background and chrome:** Pure black-and-white. Dark textured wall (`#1c1c1c`), bottom bar (`#0a0a0a`), all chrome text and buttons in greyscale. No colour in the UI shell.

**Documents:** Rendered as physical objects — the colour, texture, and typography of the real items they represent. Shadows and slight rotations give them depth.

- **Ledger:** Cream paper with green accounting-book ruled lines, left-border accent, monospaced figures. Gold pin on win; black pin on loss.
- **L'Observateur:** Aged newsprint (`#f0ead8`) with torn top edge. *IM Fell English* masthead, proper broadsheet columns. White pin.
- **Letter / Memo:** Lined company letterhead (`#fdfaf0`), typewriter body text, italic quote with left rule, formal sign-off. Gold pin on win; black pin on loss.

On the **fired variant**, the Ledger shows a loss-specific stamp (e.g. "Insolvent", "Abandoned", "Dismissed") and the third document changes from a Memo to a **Notice of Termination** — same letterhead, different content drawn from `FiredConfig`.

### Three Papers

**Next-night variant:**

| Paper | Pin | Content |
|---|---|---|
| The Ledger | Gold, tilted −1.5° | Revenue, costs, net profit, rating, covers, path badge |
| L'Observateur | White, straight | `nightConfig.newspaper` headline + body copy |
| Monsieur V.'s Memo | Gold, rotated +2° | `nightConfig.quote` → rule → `nightConfig.memo` → "Confidential" stamp |

**Fired variant:**

| Paper | Pin | Content |
|---|---|---|
| The Ledger | Black, tilted −1.5° | Same figures + `firedConfig.ledgerStamp` overlaid |
| L'Observateur | Black, straight | `firedConfig.newspaperHeadline/Deck/Body*` |
| Notice of Termination | Black, rotated +2° | `firedConfig.letterSalutation` → `letterBody` → rule → `letterQuote` → `letterSignOff` → signature → `letterPS` |

### Bottom Bar

Fixed. Same layout in both variants.

- **Next-night:** Left: "Night N — Ready". Center: "⬡ Open Restaurant" (white/grey button). Right: "← scroll to read →".
- **Fired:** Left: "Night N — Game Over". Center: "Leave." (dark grey, muted — no red, the gravity is in the documents). Right: "← scroll to read →".

### Night 1 win exception
Night 1 wins skip the corkboard entirely — `App.tsx` goes directly from `SUMMARY` to `PLAYING`. Night 1 losses show the fired corkboard as normal.

---

## 7. File Map

```
src/
  hooks/
    useCampaign.ts              — new: campaign state, path scores, advanceNight, resetCampaign
  data/
    campaignConfig.ts           — new: CAMPAIGN_CONFIG static data (lore content TBD)
    firedConfig.ts              — new: FIRED_CONFIG per GameOverReason (lore content TBD)
    pathScoreWeights.ts         — new: delta constants per event type
  logic/
    nightRules.ts               — new: getRule() helper, RuleKey type, ActiveRule interface
  components/
    CorkboardScreen.tsx         — new: inter-night UI
  types.ts                      — add: ActiveRule, RuleKey, CampaignPath, NightConfig,
                                         CampaignState, LedgerData, GameOverReason extension
                                         (GameOverReason gains 'COVERS_TARGET')
  App.tsx                       — update: GamePhase, useCampaign, phase routing,
                                           GameProvider lifetime, incrementPathScore prop;
                                           SummaryLoseReason gains 'covers_target' variant;
                                           summaryLoseReason() gains branch for 'COVERS_TARGET'
                                           mapping to 'covers_target' (win, no lose message)
  context/GameContext.tsx       — update: thread incrementPathScore into GameProvider + useGameEngine
  hooks/useGameClock.ts         — update: CLOCK_SPEED factor, COVERS_TARGET win condition
  hooks/useDecisionActions.ts   — update: call incrementPathScore on character decisions
  hooks/useAccusationActions.ts — update: call incrementPathScore + STRICT_FALSE_ACCUSATION
  hooks/useClientSpawner.ts     — update: RESERVATIONS_DISABLED, QUEUE_SPAWN_RATE
  components/TopBar.tsx         — update: PAUSE_DISABLED
  components/FloorplanGrid.tsx  — update: BLOCKED_GRID_CELLS
  logic/gameLogic.ts            — update: buildInitialState gains rules param,
                                           characterIds from NightConfig bypasses generateDailyCharacters
```

---

## 8. Out of Scope (this spec)

- Lore content: newspaper copy, memo/letter text, `FiredConfig` entries per loss reason, character assignments per night — populated in a follow-up content pass
- Path score tuning — placeholder deltas ship with implementation; balanced in playtesting
- Night 7 finale mechanics beyond what `NightRules` already supports (cop/mob adjacency constraint, etc.) — modeled as future `RuleKey` additions
- Save/load persistence of `CampaignState` across browser sessions
