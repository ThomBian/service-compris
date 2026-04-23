# Boss Encounter — Paparazzi Flash (Influencer Megastar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisites:**

- `2026-04-14-boss-encounters-foundation.md` must be complete and merged.
- **Design source of truth:** [Boss Encounters & Mini-Games — Design Spec](../specs/2026-04-13-boss-encounters-design.md) — **Section 3, Paparazzi Flash** (`PaparazziGame`, Influencer Megastar, VIP).
- **Game design setup (tuning, fantasy, table of constants, UX, difficulty notes):** [Paparazzi Flash — Game Design Setup](../specs/2026-04-22-paparazzi-flash-game-design.md) — follow this for **what to build**; this file is the **how (tasks + code)**.

**Timer:** **20s** — `DURATIONS.PAPARAZZI` in `BossEncounterOverlay` matches the game design doc.

---

## Mini-game concept (summary — full detail in game design setup)

Paparazzi Flash is a **whack-a-mole / target identification** challenge:


| Element                 | Spec                                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Duration**            | **20s** (shell `DURATIONS.PAPARAZZI` = `20_000` in `BossEncounterOverlay`; `TimerBar` + `onExpire` → `onLose`)                                                                                                                                                |
| **Presentation**        | Green = good angle, red = bad angle; viewfinders spawn at random positions on a cadence                                                                                                                                                                       |
| **Lose**                | Click a red → **instant** `onLose()`. **Miss a green** (e.g. it despawns before you tap it) → `onLose()`. **Timer expires** before the win condition → `onLose()` (handled by overlay when the game has not already resolved)                                 |
| **Win**                 | **All required good taps** completed with **no** red clicks — spec: *"All greens clicked, no reds → onWin()"*; implementation uses a **fixed target count** of successful green taps (e.g. **8**), same order of magnitude as `HandshakeGame`’s 8-step target |
| **Implementation note** | Spawn **interval**, **despawn lifetime**, **max concurrent**, and **green ratio** are defined in the [game design setup](../specs/2026-04-22-paparazzi-flash-game-design.md) (sections 4–5); `**setInterval` (or rAF) is fine** for spawns.                   |


**Shell integration:** `MiniGameProps` is defined in `src/components/boss/miniGameTypes.ts` (`onWin`, `onLose`, `durationMs`, optional `bossVisualTraits`). The overlay passes `durationMs` and shows `TimerBar` for PAPARAZZI; the mini-game should accept `durationMs` even if the countdown is visually owned by the shell.

---

**Goal:** Replace the PAPARAZZI placeholder in `BossEncounterOverlay` with a real `PaparazziGame` that implements the table above, Intro copy via `boss.paparazzi.instruction`, and boss lines via existing `boss.influencer.*` keys on the intro flow.

**Tech stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, i18next, CSS keyframe animations

---

### Task 1: i18n — `boss.paparazzi` copy (instruction + in-game)

**Files:**

- Modify: `src/i18n/locales/en/game.json`
- Modify: `src/i18n/locales/fr/game.json`

Roster already wires the Influencer to `quoteKey: "boss.influencer.quote"` and intro lines under `boss.influencer.*` — **do not add a second quote** under `boss.influencer` for this task.

- **Step 1: Align `boss.paparazzi.instruction`** with the whack-a-mole rules (shown during intro; keys are mapped in `BossEncounterIntro`’s `instructionKeyByMiniGame`). Replace the current vague “control the scene…” copy with concrete rules: tap only green (good) frames, avoid red, win after enough good taps, lose on red or missed green.
- **Step 2: Add small UI strings** under `boss.paparazzi` for the playfield if needed, e.g. `arenaHint` (short line above the arena) and/or `progress` with `{{current}}` / `{{target}}` for a score like `3 / 8`. Keep EN/FR in sync.
- **Step 3: Commit**

```bash
git add src/i18n/locales/en/game.json src/i18n/locales/fr/game.json
git commit -m "feat(i18n): Paparazzi mini-game copy for Influencer encounter"
```

---

### Task 2: Write tests for `PaparazziGame` spawn / click rules

**Files:**

- Create: `src/components/boss/__tests__/PaparazziGame.test.tsx`
- **Step 1: Write tests** — import from `../PaparazziGame` and use `MiniGameProps` pattern with `durationMs: 20_000` (and fake timers as in the skeleton below). Cover: game area renders; red click → `onLose`; green click with mocked RNG → no spurious `onLose` on green-only taps if applicable.

```tsx
// src/components/boss/__tests__/PaparazziGame.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PaparazziGame } from '../PaparazziGame';

describe('PaparazziGame', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the game area', () => {
    render(
      <PaparazziGame
        onWin={vi.fn()}
        onLose={vi.fn()}
        durationMs={20_000}
      />,
    );
    expect(document.querySelector('[data-testid="paparazzi-arena"]')).toBeTruthy();
  });

  it('calls onLose when a red viewfinder is clicked', () => {
    const onLose = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // isGreen = false when random > 0.6
    render(
      <PaparazziGame
        onWin={vi.fn()}
        onLose={onLose}
        durationMs={20_000}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(700);
    }); // spawn first viewfinder
    const viewfinders = screen.queryAllByTestId('viewfinder');
    if (viewfinders.length > 0) {
      fireEvent.click(viewfinders[0]);
      expect(onLose).toHaveBeenCalledOnce();
    }
  });

  it('does not call onLose when a green viewfinder is clicked', () => {
    const onLose = vi.fn();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5) // x
      .mockReturnValueOnce(0.5) // y
      .mockReturnValueOnce(0.3); // isGreen = true when random <= 0.6
    render(
      <PaparazziGame
        onWin={vi.fn()}
        onLose={onLose}
        durationMs={20_000}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const greens = screen.queryAllByTestId('viewfinder-green');
    greens.forEach((v) => fireEvent.click(v));
    expect(onLose).not.toHaveBeenCalled();
  });
});
```

- **Step 2: Run tests — expect FAIL** (component missing)

```bash
npm run test -- src/components/boss/__tests__/PaparazziGame.test.tsx
```

---

### Task 3: Implement `PaparazziGame`

**Files:**

- Create: `src/components/boss/PaparazziGame.tsx`
- **Step 1: Create the component** — `import type { MiniGameProps } from './miniGameTypes'`. Use `useTranslation('game')` for any `boss.paparazzi.`* strings added in Task 1 (avoid hard-coded English in the arena). Destructure `onWin`, `onLose`, and `durationMs` from props (`durationMs` may be used for local labels or left unused if the shell is the only countdown).

Core logic (tunable constants at top of file):

- Spawn a viewfinder on an interval (e.g. **600ms**), cap concurrent targets (e.g. **6**), **60%** green / **40% red (example `GREEN_RATIO`)**.
- Each **green** viewfinder has **2000 ms** active + **500 ms** blink, then expires untapped → `onLose()`. **Red** viewfinders do not use that expiry path; tapping a red is an instant `onLose()`.
- Click **red** → `onLose()`. Click **green** → increment success count; at **8** successes (or chosen `TARGET_GOOD_TAPS`) → `**onWin()`**.
- `resolvedRef` (or equivalent) so `onWin` / `onLose` only fire once.

```tsx
// src/components/boss/PaparazziGame.tsx — structure reference (align with project formatting)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniGameProps } from './miniGameTypes';

interface Viewfinder {
  id: string;
  x: number; // % of container
  y: number;
  isGreen: boolean;
}

// SPAWN_INTERVAL, MAX_ALIVE, GREEN_RATIO, DESPAWN_MS, TARGET_GOOD_TAPS — see design + tuning above

export function PaparazziGame({ onWin, onLose, durationMs: _durationMs }: MiniGameProps) {
  // state, spawn interval, per-target despawn timers, handleClick, i18n for hints/progress
  return (
    <div data-testid="paparazzi-arena" className="...">
      {/* viewfinder buttons: data-testid viewfinder | viewfinder-green */}
    </div>
  );
}
```

- **Step 2: Run tests — expect PASS**

```bash
npm run test -- src/components/boss/__tests__/PaparazziGame.test.tsx
```

- **Step 3: Commit**

```bash
git add src/components/boss/PaparazziGame.tsx src/components/boss/__tests__/PaparazziGame.test.tsx
git commit -m "feat: implement PaparazziGame (Paparazzi Flash) for Influencer Megastar"
```

---

### Task 4: Register `PaparazziGame` in the overlay

**Files:**

- Modify: `src/components/boss/BossEncounterOverlay.tsx`
- **Step 1: Set `DURATIONS.PAPARAZZI` to `20_000`** (20s) so the shell `TimerBar` and `durationMs` passed to the game match this plan.
- **Step 2: Import** `PaparazziGame` and set `PAPARAZZI: PaparazziGame` in `MINI_GAMES` (remove the `PlaceholderMiniGame` wrapper for this id).
- **Step 3: Run** `npm run lint`
- **Step 4: Manual smoke** — `npm run dev`, trigger boss `influencer-megastar` (e.g. satisfy `spawnCondition` in `src/data/bossRoster.ts` or temporarily adjust for local QA). Verify:
  - Intro shows Influencer copy and `**boss.paparazzi.instruction`**
  - Green/red viewfinders appear; **red** → lose; **unclicked green** despawn → lose; **8** (or your `TARGET_GOOD_TAPS`) greens without errors → win before the **20s** bar empties; **bar empty** without win → lose
- **Step 5: Commit**

```bash
git add src/components/boss/BossEncounterOverlay.tsx
git commit -m "feat: register PaparazziGame in BossEncounterOverlay"
```

---

## Review notes (this revision)

- **Spec vs. earlier plan text:** The design spec’s lose bullet *“Miss all greens OR timer ends”* is treated as **miss a required green** (despawn / untapped) or **timer expiry**, consistent with a skill-based whack-a-mole. **“All greens”** in the win bullet is implemented as a **target count of successful green taps** within the round.
- **Imports:** Use `./miniGameTypes` for `MiniGameProps` (not `BossEncounterOverlay`).
- **i18n:** Prior work added full `boss.influencer` strings; this plan focuses on `**boss.paparazzi.instruction`** and optional playfield keys.
- **Duration:** **PAPARAZZI uses 20s** (`20_000` ms) so the run is not unrealistically short; this overrides older 4s notes in the design spec (the spec file is updated). **White Glove** also uses **20s** in `DURATIONS`; coat check uses **20s**; handshake has **no** shell countdown (`0`).

