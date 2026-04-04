---
title: Floorplan Grid (Restaurant Tetris)
version: 3.0.0
last_updated: 2026-03-22
status: active
---

# Feature Spec: Floorplan Grid (Restaurant Tetris)

## 1. The Grid Matrix
- **The Board:** An NxN visual matrix representing the restaurant.
- **Cell States:** `EMPTY` (available), `SELECTED` (currently painting), or `OCCUPIED` (locked in and eating).

## 2. Painting Rules (The Tetris Phase)
When the player clicks "Seat Party", they must draw the table on the grid.
- **First Click:** Can be any `EMPTY` cell.
- **Adjacency:** Every subsequent click must be orthogonally adjacent (Up, Down, Left, Right) to an already `SELECTED` cell. No diagonals.
- **Undo:** Clicking any currently `SELECTED` cell deselects only that one cell. The remaining selection stays intact.
- **Limit:** The player cannot select more cells than the customer's party size.

## 3. Resolution & Consequences
- **Auto-Validation (Perfect Fit):** - *Trigger:* Number of `SELECTED` cells EXACTLY equals the party size.
  - *Action:* Instantly locks in (`OCCUPIED`). UI snaps back to Desk.
  - *Bonus:* If the customer had a 'LIE' flag and was seated anyway, the player gets a massive Grateful Liar bonus.
- **Manual Cropping (The Sacrifice):** - *Trigger:* Player paints fewer cells than the party size and clicks the [Crop Party] warning button.
  - *Action:* Locks the painted cells. UI snaps back to Desk.
  - *Penalty:* Exponential Rating penalty applied for unseated people ($P = -0.5 \times 2^{(c-1)}$).
- **Forced Refuse:** When the player judges there is no valid placement, a "Refuse Party" button in View B allows refusing the party. Calls `refuseSeatedParty()` in GameContext. Penalty: -1.5 rating, -30 morale (severe, regardless of circumstances — the player accepted the party by clicking the Door).

## 4. Time Decay
- When cells lock into `OCCUPIED`, that specific cluster is assigned a shared `mealDuration` timer.
- The global `tickTime()` decrements this timer.
- When the timer hits 0, those specific cells instantly revert to `EMPTY`.

---
## Changelog
- **v3.0.0:** Removed Cancel resolution (no escape from View B). Updated Undo rule to match implementation (toggle single cell, not clear all). Added Forced Refuse resolution.
- **v2.0.0:** Introduced interactive NxN matrix mechanics. Added orthogonal adjacency rules and auto-validation. Added exponential cropping penalty.
- **v1.0.0:** N/A (New Feature).
