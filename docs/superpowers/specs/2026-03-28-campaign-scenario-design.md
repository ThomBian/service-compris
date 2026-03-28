---
title: Campaign Scenario — Architecture Design
version: 1.1.0
date: 2026-03-28
status: approved
---

# Campaign Scenario — Architecture Design

## Overview

The campaign wraps the existing multi-night loop in a structured 7-night story with branching narrative paths. Three systems are added: a **path scoring engine** that tracks player behavior across nights, a **campaign configuration layer** that drives night-specific content and gameplay modifiers, and a **corkboard screen** shown between each shift.

Lore content (character definitions, newspaper headlines, memos) is treated as pure data — the architecture is content-agnostic. All 7 nights and their path variants are populated in a subsequent pass.

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
  lastNightLedger: LedgerData | null;  // null on Night 1 (no prior shift)
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
type GamePhase = 'LANDING' | 'CORKBOARD' | 'PLAYING' | 'SUMMARY';
```

### Flow

```
LANDING
  → (difficulty selected) → PLAYING (Night 1, no corkboard on first night)

PLAYING
  → (shift ends — win) → SUMMARY
  → (shift ends — loss) → LANDING  (App.tsx calls resetCampaign() then sets phase to LANDING)

SUMMARY
  → (Next Night button) → CORKBOARD

CORKBOARD
  → (Open Restaurant button) → PLAYING
```

Night 1 skips the corkboard (no prior shift to show in the Ledger) and goes directly from `LANDING` to `PLAYING`.

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

On loss, `App.tsx`'s loss handler calls `resetCampaign()` then sets `phase` to `'LANDING'`, ensuring path scores and night number are cleared before the player sees the landing screen.

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
interface CorkboardScreenProps {
  nightNumber: number;
  activePath: CampaignPath;
  nightConfig: NightConfig;
  ledger: LedgerData;          // last night's figures — from campaignState.lastNightLedger
  onOpenRestaurant: () => void; // sets phase to PLAYING
}
```

`ledger` is always non-null when `CorkboardScreen` renders (Night 1 never shows the corkboard).

### Layout

Three papers pinned to a dark cork board, arranged horizontally. The board scrolls horizontally — the player can drag or trackpad-scroll to read all three documents. The "Open Restaurant" button lives in a fixed bottom bar, always visible regardless of scroll position.

### Papers

**The Ledger** (gold pin, slight tilt)
Shows last night's cash earned, net profit, star rating, covers seated, and a path indicator badge (e.g. "Leaning Underworld"). All values from `ledger` prop.

**L'Observateur** (silver pin, straight)
A newspaper clipping. Masthead, date, headline (`nightConfig.newspaper`), and two columns of flavour body copy. Purely decorative — no interaction required.

**Monsieur V.'s Memo** (red pin, rotated 2°)
Monsieur V.'s quote in italics (`nightConfig.quote`), a dashed rule, then the actual night instructions (`nightConfig.memo`). A "Confidential" rubber stamp overlaid at the bottom.

### Bottom Bar
Fixed. Left: night label (e.g. "Night 4 — Ready"). Center: "⬡ Open Restaurant" button (calls `onOpenRestaurant()`). Right: "← scroll to read →" hint that fades once the user has scrolled.

### Night 1 exception
No corkboard on Night 1. `App.tsx` goes directly from `LANDING` to `PLAYING`. The corkboard sequence begins from Night 2 onward.

---

## 7. File Map

```
src/
  hooks/
    useCampaign.ts              — new: campaign state, path scores, advanceNight, resetCampaign
  data/
    campaignConfig.ts           — new: CAMPAIGN_CONFIG static data (lore content TBD)
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

- Lore content: newspaper copy, memo text, character assignments per night — populated in a follow-up content pass
- Path score tuning — placeholder deltas ship with implementation; balanced in playtesting
- Night 7 finale mechanics beyond what `NightRules` already supports (cop/mob adjacency constraint, etc.) — modeled as future `RuleKey` additions
- Save/load persistence of `CampaignState` across browser sessions
