---
title: Paparazzi Flash — Game Design Setup
version: 1.0.1
last_updated: 2026-04-22
status: active
---

# Paparazzi Flash — Game Design Setup

**Mini-game:** `PaparazziGame`  
**Boss:** Influencer Megastar (`influencer-megastar`, VIP, intercepts **SEAT**)  
**Parent:** [Boss Encounters & Mini-Games — Design Spec](./2026-04-13-boss-encounters-design.md) (Section 3)

This document is the **game design setup**: fantasy, objectives, tuning numbers, UX expectations, and how they map to implementation. The [implementation plan](../plans/2026-04-14-boss-encounter-paparazzi.md) follows this file for code tasks.

---

## 1. Fantasy and player read

**Premise:** The VIP is live; the room is full of lenses. You are not seating them until you **control the shot** — only **good angles** (green) get the story they want; **bad angles** (red) are reputation damage if you “take” them.

**Player skill:** Scan the playfield, discriminate green vs red under time pressure, and execute taps before targets vanish. Mistakes are immediate (red) or costly (missed green).

**Tone:** Flashy, tense, slightly absurd — paparazzi pops, not a quiet puzzle.

---

## 2. Objective and outcome

| Outcome | Condition |
| -------- | ----------- |
| **Win** | Player completes **TARGET_GOOD_TAPS** successful taps on **green** viewfinders **without** clicking a red **and** without letting a **green** expire untapped. Win can happen any time before the round timer ends. |
| **Lose (instant)** | Player clicks a **red** viewfinder. |
| **Lose (miss)** | A **green** viewfinder **despawns** before being tapped. |
| **Lose (time)** | The **round timer** reaches zero before a win (handled by `BossEncounterOverlay` + `TimerBar` → `onLose` if the mini-game has not resolved). |

There is **one life** per attempt — no hearts. One mistake ends the run (except timer, which is its own fail state).

---

## 3. Round and time budget

| Field | Value | Notes |
| ----- | ----- | ----- |
| **Round length** | **20 000 ms** (20 s) | `DURATIONS.PAPARAZZI` in `BossEncounterOverlay.tsx`. Must stay in sync with shell; do not hard-code a second timer in the mini-game unless needed for UI copy (“time left” is optional; the bar is authoritative). |
| **Handshake alignment** | Win target **8** good taps | Same “8” milestone feel as `HandshakeGame`’s 8-step target — familiar muscle for players who cleared the Don. |

---

## 4. Spawning and economy

Viewfinders appear in a **press zone** (the arena). Each spawn is independent RNG subject to the table below.

| Constant | Value | Design intent |
| -------- | ----- | ------------- |
| **SPAWN_INTERVAL_MS** | **600** | New pop roughly every 0.6 s — busy but readable; ~33 spawn events per 20 s before cap (not all become new entities if cap is hit). |
| **MAX_GREEN_CONCURRENT** | **6** | Cap on **green** viewfinders at once (`PaparazziGame.tsx`); skips spawn if greens already at cap. |
| **GREEN_RATIO** | **0.6** | `Math.random() <= GREEN_RATIO` → green; else red. |
| **GREEN_ACTIVE_MS** | **2000** | Solid green phase before blink. |
| **GREEN_BLINK_MS** | **500** | Blinking “about to expire” phase; if still untapped, green expiry → `onLose()`. **Total green lifetime = 2500 ms.** |
| **Position** | Random **x, y** inside **22%–78%** of arena (`SPAWN_PADDING_PERCENT = 22`) | Keeps frames off the rim. |

**Spawn pick (per tick):** roll `Math.random()` for `isGreen`: `true` if `≤ GREEN_RATIO`. Position uses two more randoms for `x` and `y`. Use a stable **id** per viewfinder for React keys and despawn timers.

**Red clicks:** Do **not** advance the good-tap counter; they only trigger lose.

**Green clicks:** Increment **goodTaps**; remove entity; if `goodTaps >= TARGET_GOOD_TAPS`, call **`onWin()`** once.

---

## 5. Difficulty read (back-of-envelope)

Approximate expectations (actual playtest will tune):

- **TARGET_GOOD_TAPS = 8** in **20 s** → need **~2.4 good taps per 6 s** on average if greens were guaranteed; With **60%** green spawns and **6** max on field, the player must **convert** greens under despawn pressure, not passively wait.
- **2500 ms** green lifetime vs **SPAWN_INTERVAL = 600** means overlapping lifetimes — **MAX_GREEN_CONCURRENT** is the main pressure valve.
- If the run feels **too easy**, raise **TARGET_GOOD_TAPS**, lower **GREEN_RATIO**, shorten **GREEN_ACTIVE_MS** / **GREEN_BLINK_MS**, or lower **MAX_GREEN_CONCURRENT**. If **too harsh**, do the inverse.

Document any balance change in this file and in `DURATIONS` / component constants together.

---

## 6. Presentation and UX

| Element | Spec |
| ------- | ----- |
| **Green** | Distinct “good angle” — border/icon reads **safe / on-brand** (e.g. green ring, camera emoji in product art pass). `data-testid="viewfinder-green"`. |
| **Red** | **Trap** — clear “don’t” read (e.g. red ring, no-entry cue). `data-testid="viewfinder"` (or a dedicated `viewfinder-bad` if tests need it). |
| **Progress** | Show **current / target** (e.g. `5 / 8`) via i18n `boss.paparazzi` keys with `{{current}}` / `{{target}}`. |
| **Hint line** | Short arena hint (optional key `arenaHint`) so the playfield is not empty copy. |
| **Motion** | Brief pop-in on spawn; optional light hover scale (desktop) — must not obfuscate color read. |
| **Accessibility** | Buttons need **accessible names** (e.g. “Good shot” / “Bad shot” or locale equivalent); color is not the only signal if possible (shape or label). |

**Intro / stakes:** Roster copy uses `boss.influencer.*` and `boss.paparazzi.instruction` (intro instruction line). See implementation plan for i18n keys.

**Audio (optional in implementation):** Tap green / red / win streak — follow existing `gameSfx` patterns if the project adds SFX for this game.

---

## 7. Technical mapping (single source of truth)

| Design constant | Code location (intended) |
| --------------- | ------------------------ |
| Round length 20 s | `BossEncounterOverlay` → `DURATIONS.PAPARAZZI` |
| `onWin` / `onLose` / `durationMs` | `miniGameTypes.MiniGameProps` |
| SPAWN, MAX greens, RATIO, green active/blink ms, TARGET | `PaparazziGame.tsx` top-level `const` (or a tiny `paparazziConfig.ts` if shared tests need imports) |

---

## 8. Out of scope (v1)

- Per-night difficulty scaling from `ActiveRule` / campaign
- Power-ups, streak multipliers, or “rewind one miss”
- Seeded RNG for speedrun comparisons

---

## Changelog

- **v1.0.0 (2026-04-22):** Initial game design setup: 20 s round, 8 good taps, spawn/despawn table, UX and implementation map.
- **v1.0.1 (2026-04-22):** Aligned tuning table with shipped `PaparazziGame.tsx` (green active + blink = 2.5 s total, 22% spawn padding, max concurrent greens).
