# Boss Encounter — White Glove (Grand Inquisitor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisites:**

- `2026-04-14-boss-encounters-foundation.md` must be complete and merged.
- **Design source of truth:** [Boss Encounters & Mini-Games — Design Spec](../specs/2026-04-13-boss-encounters-design.md) — **Section 2, White Glove** (`WhiteGloveGame`, Grand Inquisitor, BANNED).

**Timer:** **20s** — `DURATIONS.WHITE_GLOVE` in `BossEncounterOverlay` should be `20_000`.

---

## Mini-game concept (summary)

White Glove is a **precision keyboard placement** challenge across **five tables** (shipped):

| Element                 | Spec                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Duration**            | **20s** (shell `DURATIONS.WHITE_GLOVE` = `20_000`; timer expiry handled by overlay `TimerBar` + `onExpire` → `onLose`)                                                                   |
| **Presentation**        | Five plate slots (normalized coordinates) scale with arena bounds (`ResizeObserver`); per table: fork + knife at imperfect positions/angles; dashed outlines show exact targets          |
| **Lose**                | Timer expires before **5/5** tables are complete (fork **and** knife snapped on each)                                                                                                   |
| **Win**                 | All **5** tables fully aligned within the timer                                                                                                                                          |
| **Controls**            | **WASD** or **arrow** keys move selection; **Q/E** rotate; **Tab** cycles fork → knife → next unsnapped item; **1–5** jumps table / toggles utensil on same table                         |
| **Implementation note** | No pointer-drag in shipped build. `resolvedRef` prevents double `onWin`/`onLose`. Exported helpers: `isSnapped`, `nextSelectableItem`, `slotCentersForBounds`, `createTableState`, `TABLE_SLOT_FRACS`. |


**Shell integration:** `MiniGameProps` lives in `src/components/boss/miniGameTypes.ts`. Import from there (not from `BossEncounterOverlay`).

---

**Goal:** Replace `WHITE_GLOVE` placeholder in `BossEncounterOverlay` with a real `WhiteGloveGame` that matches a **20s, multi-combo precision spec** (minimum 5 alignments) and existing intro copy (`boss.whiteGlove.instruction` + `boss.grandInquisitor.`*).

**Tech stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, ResizeObserver for responsive arena

---

### Task 1: i18n — `boss.whiteGlove` gameplay copy polish

**Files:**

- Modify: `src/i18n/locales/en/game.json`
- Modify: `src/i18n/locales/fr/game.json`

Notes:

- `boss.grandInquisitor.quote` already exists in current locales; do **not** duplicate quote work.
- `boss.whiteGlove.instruction` already exists; tighten it if needed for clarity.
- **Step 1: Update / add white-glove-specific UI strings** under `boss.whiteGlove`:
  - keep `instruction` aligned with actual rules (complete at least 5 fork+knife alignments in 20s)
  - add optional keys for in-game labels, e.g. `alignHint`, `forkLabel`, `knifeLabel`, `snapped`, `comboProgress`
- **Step 2: Commit**

```bash
git add src/i18n/locales/en/game.json src/i18n/locales/fr/game.json
git commit -m "feat(i18n): refine White Glove mini-game copy"
```

---

### Task 2: Write tests for snap logic

**Files:**

- Create: `src/components/boss/__tests__/WhiteGloveGame.test.ts`
- **Step 1: Write tests for exported snap helper** (`isSnapped`), including boundaries:

```ts
import { describe, it, expect } from 'vitest';
import { isSnapped } from '../WhiteGloveGame';

describe('isSnapped', () => {
  const target = { x: 200, y: 300, rotation: 0 };

  it('returns true within tolerance', () => {
    expect(isSnapped({ x: 204, y: 296, rotation: 3 }, target)).toBe(true);
  });

  it('returns false when too far in position', () => {
    expect(isSnapped({ x: 220, y: 300, rotation: 0 }, target)).toBe(false);
  });

  it('returns false when too far in rotation', () => {
    expect(isSnapped({ x: 200, y: 300, rotation: 10 }, target)).toBe(false);
  });

  it('is exact on boundary', () => {
    expect(isSnapped({ x: 208, y: 308, rotation: 5 }, target)).toBe(true);
  });
});
```

- **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/components/boss/__tests__/WhiteGloveGame.test.ts
```

- **Step 3: Add combo progression tests** (pure helpers or component-level):
  - successful fork+knife snap increments completed combinations
  - game resolves `onWin()` once completed combinations reaches **5**
  - unresolved state at timer expiry leads to `onLose()` (shell-level behavior can be smoke-tested)

---

### Task 3: Implement `WhiteGloveGame`

**Files:**

- Create: `src/components/boss/WhiteGloveGame.tsx`
- **Step 1: Build component** (keyboard-first shipped build; original drag sketch below is **not** what shipped)
  - import props from `./miniGameTypes`
  - define tolerances (`POS_TOLERANCE = 8`, `ROT_TOLERANCE = 5`)
  - **five** `TableState` entries (fork + knife each): positions clamped to measured arena `w/h`
  - keyboard handler updates selected fork/knife; snap on move/rotate when within tolerance; **Tab** / **1–5** navigation per `nextSelectableItem`
  - when `completedCombos >= 5` (tables where both fork and knife snapped), call `onWin()` once
  - keep `resolvedRef` guard so `onWin`/`onLose` cannot double-fire
  - rely on shell timer for timeout loss (no duplicate internal 20s timer)
  - visible combo progress via `boss.whiteGlove.comboProgress`
  - include `data-testid="white-glove-arena"`, `white-glove-fork-{i}`, `white-glove-knife-{i}`
- **Step 2: Run tests — expect PASS**

```bash
npm run test -- src/components/boss/__tests__/WhiteGloveGame.test.ts
```

- **Step 3: Commit**

```bash
git add src/components/boss/WhiteGloveGame.tsx src/components/boss/__tests__/WhiteGloveGame.test.ts
git commit -m "feat(boss): implement WhiteGloveGame precision drag challenge"
```

---

### Task 4: Register `WhiteGloveGame` in overlay

**Files:**

- Modify: `src/components/boss/BossEncounterOverlay.tsx`
- **Step 1: Import and register** `WhiteGloveGame` for `WHITE_GLOVE` in `MINI_GAMES` (remove placeholder).
- **Step 2: Set and confirm** `DURATIONS.WHITE_GLOVE === 20_000`.
- **Step 3: Run type-check**

```bash
npm run lint
```

- **Step 4: Manual smoke**

```bash
npm run dev
```

Use dev mini-game launch (command palette) or spawn-condition override to trigger quickly. Verify:

- Grand Inquisitor intro appears with white-glove instruction
- Fork and knife move with **keyboard**; dashed targets visible on all five tables
- **Tab** / **1–5** change selection; completing all **5** tables (both utensils per table) within **20s** resolves to win
- Timer expiry before 5/5 resolves to lose
- **Step 5: Commit**

```bash
git add src/components/boss/BossEncounterOverlay.tsx
git commit -m "feat(boss): register WhiteGloveGame in BossEncounterOverlay"
```

---

## Review notes (this revision)

- Standardized with newer boss plans:
  - explicit design-source section
  - concept summary table (duration/presentation/win/lose)
  - `miniGameTypes` import guidance
  - practical smoke path using dev launch tools
- Removed stale work:
  - quote-add task that is already completed in locales
  - mandatory global `useDrag` extraction (now optional, only if justified)
- Aligned test naming to current repo conventions (`.test.ts` for non-TSX helper tests).

