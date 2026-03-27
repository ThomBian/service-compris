---
title: End of Service & Multi-Night Progression
version: 1.0.0
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

---

## 1. Overtime Phase

### Trigger
At `inGameMinutes >= 1560` (23:30): doors close. No new clients spawn. The queue drains naturally (remaining queued clients leave). The clock continues ticking.

### Overtime ends
When all cells in the grid have `state !== CellState.OCCUPIED` (grid is fully empty). This triggers the end-of-night summary.

### During overtime
- **TopBar** shows an `OVERTIME` badge replacing the normal clock styling
- **Morale drain**: `−1 morale per in-game minute` during overtime (constant: `OVERTIME_MORALE_DRAIN_PER_MINUTE = 1`)
- **Auto fast-forward**: time multiplier is automatically set to `4x` when overtime begins (player can adjust manually)
- **Last Call button**: each occupied table on the floorplan grid shows a "Last Call" action. Pressing it immediately clears the table at the cost of a small rating penalty (constant: `LAST_CALL_RATING_PENALTY = 0.1` per table rushed)

### Mid-shift morale game over
If `morale` hits `0` at any point during the shift (not just overtime), `gameOver = true` fires immediately — same mechanism as the existing VIP `GAME_OVER` consequence. The summary screen then displays the "staff walked out" loss variant.

---

## 2. Bill Calculation

Computed once when the grid empties at true end of service.

```
revenue         = covers_seated × REVENUE_PER_COVER
fixed_cost      = SALARY_COST + ELECTRICITY_COST
food_cost       = covers_seated × FOOD_COST_PER_COVER
bill            = fixed_cost + food_cost
net             = revenue − bill
cash            += net   // can go negative
```

### Constants (initial values, tunable)
| Constant | Value | Notes |
|---|---|---|
| `REVENUE_PER_COVER` | €60 | Per guest seated |
| `SALARY_COST` | €200 | Fixed nightly |
| `ELECTRICITY_COST` | €40 | Fixed nightly |
| `FOOD_COST_PER_COVER` | €23 | Per guest seated |

`covers_seated` = total number of guests actually seated across all confirmed seatings during the night (sum of `truePartySize` for all accepted parties).

VIP and special-event bill modifiers are out of scope for this spec (deferred to lore/VIP design).

### Loss condition: bankruptcy
If `cash < 0` after applying `net` → loss screen variant "can't pay the bill."

---

## 3. State Changes Added to `GameState`

```typescript
nightNumber: number;       // starts at 1, increments on "Next Shift"
coversSeated: number;      // running total of guests seated this night, reset each night
```

`coversSeated` is incremented by `truePartySize` each time `confirmSeating` succeeds.

---

## 4. End-of-Night Summary Screen

### Trigger
When `overtimeEnded` (grid empty after 23:30), a full-screen overlay replaces the game UI.

### Animation
Lines appear one by one with a fade-in + slide-up transition (~220ms stagger). Each monetary value counts up (or down for costs) from 0 to its final value using an ease-out cubic curve (~400ms per counter). Sequence:

1. Night label + headline + overtime badge
2. **Revenue** section label
3. Covers seated line (counts up)
4. **Fixed costs** section label
5. Salaries line (counts up to negative)
6. Electricity line (counts up to negative)
7. **Variable costs** section label
8. Food & supplies line (counts up to negative)
9. `Tonight's profit/loss` net row (counts up, color red if negative) — separated by a bold border
10. Updated stats pills (cash, rating, morale with deltas) — appear as a group
11. CTA button

### Win variant
- Headline: **"Service Complete"** (dark)
- Net row: green positive value
- No lose-reason message
- CTA: **"Night [N+1] →"**

### Lose variant — bankruptcy
- Headline: **"Service Complete"** (same, the drama is in the receipt)
- Net row: red negative value
- Lose-reason: *"You can't cover tonight's costs. The restaurant closes its doors."*
- CTA: **"Try Again"** (red button)

### Lose variant — staff walkout (morale = 0)
- Headline: **"Service Complete"** (same flow, shift played out)
- Net row: whatever the result was
- Lose-reason: *"Your staff has had enough. The doors close."*
- CTA: **"Try Again"** (red button)

### "Try Again" flow
Resets to the landing page with difficulty selector. No persistent state is preserved on a loss — each run is independent.

---

## 5. Multi-Night Persistence

On **"Night [N+1] →"**:
- `cash`, `rating`, `morale`, `nightNumber` (incremented) carry over
- All other state resets: queue, grid, currentClient, logs, reservations, spawnedReservationIds, seatedVipIds, coversSeated
- New `dailyVips` generated based on current difficulty setting
- New reservations procedurally generated (see §6)

The `buildInitialState()` function gains a `persist` parameter:
```typescript
function buildInitialState(difficulty: number, persist?: { cash: number; rating: number; morale: number; nightNumber: number }): GameState
```

---

## 6. Procedural Reservation Generation

Replaces `INITIAL_RESERVATIONS` constant for nights 2+. Night 1 continues to use the curated list (tutorial familiarity).

### Algorithm
Generate `N` reservations where `N = 8 + Math.floor(nightNumber * 0.5)` (capped at 16).

For each reservation:
- **Time**: random slot between 19:30 (1170) and 22:00 (1320) in 15-minute increments
- **Party size**: weighted random: 1–2 (40%), 3–4 (35%), 5–6 (20%), 7–8 (5%)
- **Names**: drawn from `FIRST_NAMES` / `LAST_NAMES` constants
- **Deliberate collisions**: ~30% of reservations share a first name or arrival time with another, creating cross-reference traps (the core investigative challenge)

VIP reservations are injected on top of this pool by the existing `injectVipReservations` logic.

---

## 7. TopBar Updates

- Add **night number** display: `NIGHT 3` alongside existing clock/rating/cash/morale
- During overtime: clock value turns amber, `OVERTIME` label appears next to it
- On the summary screen the TopBar is hidden (full-screen overlay)

---

## Out of Scope (Deferred)

- RPG skill tree / between-shift upgrades
- Calendar / week view
- VIP-triggered bill modifiers
- Persistent high scores or cross-session leaderboard
