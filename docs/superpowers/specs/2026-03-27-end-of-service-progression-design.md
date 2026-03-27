---
title: End of Service & Multi-Night Progression
version: 1.2.0
date: 2026-03-27
status: approved
---

# End of Service & Multi-Night Progression

## Overview

The game currently ends the shift by freezing the clock at 23:30 with no summary, no scoring, and no progression. This spec defines:

1. **Overtime phase** — the period between doors closing and the last table clearing
2. **End-of-night summary** — an animated P&L receipt screen
3. **Loss conditions** — two ways to lose: bankruptcy and staff walkout
4. **Multi-night persistence** — cash, rating, and morale carry over between shifts
5. **Procedural reservations** — fresh generated reservation list each night

### Terminology
- **`truePartySize`**: the `Client.truePartySize: number` field from `src/types.ts` — the actual number of guests in the party (hidden truth, not the claimed size)
- **`confirmSeating`**: the action exposed as `confirmSeating` from `useDecisionActions`, called when the player confirms a seating arrangement on the grid
- **`coversSeated`**: new `GameState` field (see §3) — running count of guests seated this night

---

## 1. Overtime Phase

### Trigger
At `inGameMinutes >= 1560` (23:30): doors close. No new clients spawn. The queue drains naturally (remaining queued clients leave). The clock continues ticking.

The existing `timeMultiplier = 0` freeze in `useGameClock` at minute 1560 is **removed entirely** and replaced by the overtime trigger described here. After removal, the tick function must allow `inGameMinutes` to increment to 1560 and beyond — the overtime trigger condition `inGameMinutes >= 1560` only fires correctly if the clock actually reaches that value.

### Summary trigger
The end-of-night summary screen is shown when **either** of these two conditions is true:

1. **Natural end**: `inGameMinutes >= 1560 && grid has no OCCUPIED cells` (all tables cleared after closing)
2. **Staff walkout**: `gameOver === true` (morale hit 0 during the shift or overtime)

The app watches both signals. Condition 1 is checked on every tick. Condition 2 uses the existing `gameOver` reactive flag. Both conditions route to the same summary screen component with the appropriate variant.

If condition 1 is already true at exactly 23:30 (all tables cleared at the closing minute), overtime duration is zero — no morale drain occurs, no overtime badge is shown. This is valid.

If morale is already 0 at the exact moment overtime begins (first overtime tick), the walkout fires immediately — no morale drain is applied; the grid is force-cleared and the summary shows the staff-walkout variant.

### During overtime
- **TopBar** shows an `OVERTIME` badge replacing the normal clock styling. Clock value turns amber.
- **Morale drain**: `−1 morale per in-game minute` during overtime (constant: `OVERTIME_MORALE_DRAIN_PER_MINUTE = 1`). This drain can itself trigger the staff-walkout game over.
- **Auto fast-forward**: time multiplier is automatically set to `4x` when overtime begins (player can adjust manually)
- **Last Call button**: each occupied table on the floorplan grid shows a "Last Call" action — available only during overtime. Pressing it force-expires the table: iterate `grid.flat().filter(c => c.partyId === targetPartyId)` and set each cell's `mealDuration = 0`, clearing them on the next tick via existing meal-timer logic. Rating penalty: `LAST_CALL_RATING_PENALTY = 0.1` per rushed table. `coversSeated` is **not affected** (guests were already counted at seating). Activity log entry added: `"Rushed table — party asked to leave early."`

### Morale game over (pre-23:30 and overtime)
If `morale` hits `0` at any point during the shift — whether during normal service or overtime morale drain — this fires **synchronously within the same state update**:

1. `gameOver = true`
2. All occupied cells are force-cleared: `mealDuration = 0`, `state = EMPTY`, `partyId = undefined`
3. `timeMultiplier = 0`

This happens in a single atomic `setGameState` call to prevent the grid-empty derived condition from being observed in a partial state. The summary screen overlay renders on top of whatever UI was active — no client/dialogue state is explicitly reset, because `timeMultiplier = 0` stops all ticks, making the underlying state invisible and non-interactable. The summary screen then shows the "staff walkout" variant.

---

## 2. Bill Calculation

Computed once when the end-of-service summary is triggered. Reads `GameState.coversSeated` directly.

```
revenue         = coversSeated × REVENUE_PER_COVER
fixed_cost      = SALARY_COST + ELECTRICITY_COST
food_cost       = coversSeated × FOOD_COST_PER_COVER
bill            = fixed_cost + food_cost
net             = revenue − bill
cash_after      = cash_before + net
```

### Constants (initial values, tunable)
| Constant | Value | Notes |
|---|---|---|
| `REVENUE_PER_COVER` | €60 | Per guest seated |
| `SALARY_COST` | €200 | Fixed nightly |
| `ELECTRICITY_COST` | €40 | Fixed nightly |
| `FOOD_COST_PER_COVER` | €23 | Per guest seated |
| `OVERTIME_MORALE_DRAIN_PER_MINUTE` | 1 | Morale lost per in-game minute in overtime |
| `LAST_CALL_RATING_PENALTY` | 0.1 | Rating penalty per rushed table |

`coversSeated` = total guests seated this night — incremented by `truePartySize` each time `confirmSeating` succeeds. `refuseSeatedParty` fires while the client is still in `PhysicalState.SEATING` (before `confirmSeating`), so a refused party is never counted. There is no decrement path.

VIP and special-event bill modifiers are out of scope for this spec (deferred to lore/VIP design).

### Loss condition: bankruptcy
If `cash_after < 0` → loss screen variant "can't pay the bill." Because a loss always resolves before the next night begins, `cash_before` is always ≥ 0 at the start of any night; the check `cash_after < 0` is therefore equivalent to "tonight's result caused bankruptcy."

### Balance note
`buildInitialState` currently sets `cash: 0` (confirmed in existing code). With fixed costs of €240, a player needs to seat at least 7 covers to break even (`⌈240 / (60 − 23)⌉ = 7`). The curated night-1 reservation list is designed to make this achievable if played reasonably. This tension is intentional.

---

## 3. State Changes Added to `GameState`

```typescript
nightNumber: number;    // starts at 1, increments on "Next Shift"
coversSeated: number;   // running total of guests seated this night; starts at 0, reset each night
```

`coversSeated` starts at `0` in `buildInitialState` (both night 1 and subsequent nights). It is incremented by `truePartySize` each time `confirmSeating` succeeds.

The bill calculation in §2 reads `gameState.coversSeated` directly — it is not re-derived at summary time.

---

## 4. End-of-Night Summary Screen

### Trigger
Either `gameOver === true` or `inGameMinutes >= 1560 && no OCCUPIED cells`. A full-screen overlay replaces the game UI. The TopBar is hidden while the summary is displayed.

### Animation
Lines appear one by one with a fade-in + slide-up transition (~220ms stagger). Each monetary value counts up (or down for costs) from 0 to its final value using an ease-out cubic curve (~400ms per counter). Sequence:

1. Night label + headline + overtime badge (omitted if zero overtime)
2. **Revenue** section label
3. Covers seated line (counts up)
4. **Fixed costs** section label
5. Salaries line (counts up to negative)
6. Electricity line (counts up to negative)
7. **Variable costs** section label
8. Food & supplies line (counts up to negative)
9. `Tonight's profit/loss` net row (counts up, color red if negative) — separated by a bold border
10. Updated stats pills (cash, rating, morale with deltas) — appear as a group
11. Lose-reason message (win variant: omitted)
12. CTA button

### Win variant
- Headline: **"Service Complete"** (dark)
- Net row: green positive value
- No lose-reason message
- CTA: **"Night [N+1] →"**

### Lose variant — bankruptcy
- Headline: **"Service Complete"** (the drama is in the receipt)
- Net row: red negative value
- Lose-reason: *"You can't cover tonight's costs. The restaurant closes its doors."*
- CTA: **"Try Again"** (red button)

### Lose variant — staff walkout (morale = 0)
- Headline: **"Shift Cut Short"** (reflects the interrupted service)
- Net row: result at time of walkout (may be positive)
- Lose-reason: *"Your staff has had enough. The doors close."*
- CTA: **"Try Again"** (red button)

### "Try Again" flow
Resets to the landing page with difficulty selector. No persistent state is preserved on a loss — each run is independent.

---

## 5. Multi-Night Persistence

### Night 1 starting values
On night 1, `persist` is omitted and starting values match existing `buildInitialState` defaults: `cash: 0`, `rating: 5.0`, `morale: 100`, `nightNumber: 1`, `coversSeated: 0`.

### Carry-over bounds
- `morale` carry-over uses `Math.max(0, morale)` to guard against any sub-zero values from multi-drain ticks; in practice morale cannot carry over at 0 (that is a loss condition), but the clamp is a safety measure
- `rating` carries over with a floor of `1.0` (can never drop below 1 star); add a clamp: `Math.max(1.0, rating)` in the state update that applies rating changes

### On "Night [N+1] →"
- `cash`, `rating` (clamped ≥ 1.0), `morale`, `nightNumber` (incremented) carry over
- All other state resets: `queue`, `grid`, `currentClient`, `logs`, `reservations`, `spawnedReservationIds`, `seatedVipIds`, `coversSeated` (reset to 0)
- New `dailyVips` generated based on current `difficulty` value (see below)
- New reservations procedurally generated (see §6)

### Difficulty across nights
`difficulty` is not part of `GameState` — it is React component state in `App.tsx` / `GameContent`, same as today. It takes values `0` (Chill), `1` (Normal), `2` (Busy), `3` (Hell), matching the existing `DIFFICULTIES` array in `LandingPage.tsx`. `generateDailyVips(difficulty, VIP_ROSTER)` uses this value directly as the VIP count, giving 0–3 VIPs.

`difficulty` is passed as a parameter to `buildInitialState` and preserved in React state across nights. The summary screen's "Night [N+1] →" button triggers a callback that calls `resetGame(difficulty, persist)` with the current `difficulty` value.

The `buildInitialState()` function gains an optional `persist` parameter:
```typescript
function buildInitialState(
  difficulty: number,
  persist?: { cash: number; rating: number; morale: number; nightNumber: number }
): GameState
```
When `persist` is omitted, the function behaves exactly as today (night 1 / new game).

The `resetGame` function and its signature must be updated in **both** `useGameEngine.ts` and the `GameContextType` interface in `GameContext.tsx` (line 17) to accept the optional `persist` parameter:
```typescript
resetGame: (difficulty: number, persist?: { cash: number; rating: number; morale: number; nightNumber: number }) => void
```
The summary screen component receives `resetGame` via the `useGame()` context hook, same as other actions.

Additionally: the hardcoded `buildInitialState(1)` in `useGameEngine.ts` (line 38) must be replaced with the actual difficulty value from `App.tsx` state. The `resetGame(difficulty)` call at game start already does this via `App.tsx`'s `GameContent.useEffect`, but the initial `useState` call ignores difficulty. Fix: change the initial state to `() => buildInitialState(0)` (or use a sentinel) and rely solely on the `resetGame(initialDifficulty)` effect call to set the correct starting state.

---

## 6. Procedural Reservation Generation

Replaces `INITIAL_RESERVATIONS` for nights 2+. Night 1 continues to use the curated hardcoded list for tutorial familiarity.

### Pool size
Generate `N` base reservations where `N = 8 + Math.floor(nightNumber * 0.5)`, capped at 16. VIP reservations are injected **on top** of this base pool via the existing `injectVipReservations` logic — they do not count toward the cap of 16. The difficulty selector caps VIP count at 0–3, so the combined maximum is 19 reservations. This is within acceptable UI bounds.

### Base reservation algorithm
For each of the N reservations:
- **Time**: uniform random slot from `{1170, 1185, ..., 1320}` (19:30–22:00 inclusive, 15-minute increments, 11 slots). A 22:00 reservation with a large party may still be dining at 23:30 and into overtime — this is intentional; overtime handles it.
- **Party size**: weighted random — 1–2 (40%), 3–4 (35%), 5–6 (20%), 7–8 (5%)
- **Names**: sampled without replacement from the existing `FIRST_NAMES` / `LAST_NAMES` constant arrays in `src/constants.ts`

### Deliberate collision injection (post-generation)
After generating the base list:
1. Select `Math.floor(N * 0.15)` reservations **without replacement**; copy their `firstName` to a different, randomly chosen reservation (creating first-name ambiguity traps)
2. From the **remaining** reservations (not selected in step 1), select `Math.floor(N * 0.15)` **without replacement**; set their `time` to match a different reservation's `time` (creating time-collision traps)

This gives ~30% of reservations a collision property, injected intentionally rather than relying on random chance.

---

## 7. TopBar Updates

- Add **night number** display: `NIGHT 3` alongside existing clock/rating/cash/morale
- During overtime: clock value turns amber, `OVERTIME` label appears next to it
- The TopBar is hidden while the end-of-night summary overlay is displayed

---

## Out of Scope (Deferred)

- RPG skill tree / between-shift upgrades
- Calendar / week view
- VIP-triggered bill modifiers
- Persistent high scores or cross-session leaderboard
