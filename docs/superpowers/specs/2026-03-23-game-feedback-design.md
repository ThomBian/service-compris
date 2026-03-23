# Design: Game State Feedback & Cues

**Date:** 2026-03-23
**Scope:** Toast notification system + amber cell warning for table turnover

---

## Problem

Two feedback gaps identified:

1. **Missing decision results** — When the player accepts, refuses, or seats a party, the outcome (cash, rating, morale changes) is not immediately visible. Numbers update silently in the TopBar; logs are hidden behind a panel.

2. **No table turnover warning** — The floorplan grid shows `mealDuration` as a small number on occupied cells, but there is no visual escalation when a table is about to free up.

---

## 1. Toast Notification System

### New file: `src/context/ToastContext.tsx`

A standalone React context, independent of `GameContext`. Any component or hook can call `showToast()` without touching game state.

```ts
interface Toast {
  id: string;         // unique — used as React key and for removal
  title: string;      // mandatory — first line (the outcome label)
  detail?: string;    // optional — second line (stat deltas)
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number;  // ms, default 2500
}

interface ToastContextValue {
  showToast: (title: string, detail?: string, variant?: Toast['variant'], duration?: number) => void;
}
```

**State:** `toasts: Toast[]` managed inside `ToastProvider`. `showToast` pushes a new toast with a generated `id`. Each toast schedules its own `setTimeout` to call a `removeToast(id)` on expiry.

**Cleanup:** Each `setTimeout` is stored in a `ref` and cleared in a `useEffect` cleanup to avoid memory leaks.

**Provider placement:** `ToastProvider` wraps `App` in `main.tsx` (outside `GameProvider`), making it available everywhere.

### New component: `ToastContainer`

Rendered once in `App.tsx`. Positioned `fixed top-4 right-4 z-50 flex flex-col gap-2`.

Each toast renders as a small card matching the game's existing visual style (hard shadow, bold border):

- **Line 1:** `title` — bold, coloured by variant (`text-emerald-700` for success, `text-red-700` for error, `text-amber-700` for warning, `text-stone-700` for info)
- **Line 2:** `detail` — if present, smaller muted text below the title
- **Exit animation:** `motion.div` with `exit={{ opacity: 0, y: -8 }}` via `AnimatePresence`

Variants map to border/background:
| Variant | Background | Border | Title colour |
|---|---|---|---|
| `success` | `bg-emerald-50` | `border-emerald-600` | `text-emerald-700` |
| `error` | `bg-red-50` | `border-red-600` | `text-red-700` |
| `warning` | `bg-amber-50` | `border-amber-500` | `text-amber-700` |
| `info` | `bg-white` | `border-[#141414]` | `text-stone-900` |

---

## 2. Decision Feedback Wiring

### File: `src/hooks/useDecisionActions.ts` (or wherever `acceptParty`, `refuseParty` are implemented)

After each decision's state update, call `showToast()` with the outcome title and stat delta string.

**Outcome → toast mapping:**

| Outcome | `title` | `detail` |
|---|---|---|
| Honest accept | `✓ Accepted {firstName}` | `+${cash} · ★ +0.1` |
| Fooled by scammer | `Fooled! Seated a scammer` | `−$50 · ★ −1.0 · ♥ −20` |
| Fooled by rule-breaker | `Rule-breaker slipped through` | `★ −0.5 · ♥ −10` |
| Grateful liar (caught + seated) | `Grateful Liar — well played!` | `+${cash} · ★ +0.8 · ♥ +10` |
| Justified refusal | `Justified Refusal` | `★ +0.2 · ♥ +5` |
| Unjustified refusal | `Unjustified Refusal` | `★ −0.5 · ♥ −15` |
| Refuse after seating | `Refused after seating` | `★ −1.5 · ♥ −30` |

Cash delta in the detail string uses the actual computed value from `handleAcceptedClient`.

Stat symbols: `★` = rating, `♥` = morale, `$` = cash. Only stats that actually change appear in the detail string.

---

## 3. Table Turnover Warning (Amber Cell)

### Threshold

`isAboutToFree`: true when `cell.state === CellState.OCCUPIED && cell.mealDuration !== undefined && cell.mealDuration <= 10`.

### Visual treatment

Amber background replaces the dark stone background — positive framing (table freeing up is good news):

- `bg-amber-400` instead of `bg-stone-800`
- Timer text: `text-stone-900` (dark on amber) instead of `text-amber-400/90`

**No toast fired** — purely a persistent visual state on the cell.

### Files changed

Both grid components apply the same `isAboutToFree` logic:

| File | Change |
|---|---|
| `src/components/floorplan/FloorplanGrid.tsx` | `isAboutToFree` → amber bg + dark timer text |
| `src/components/desk/MiniGrid.tsx` | `isAboutToFree` → amber bg (14×14 cells, color only) |

The identical threshold and color in both components ensures visual consistency.

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `src/context/ToastContext.tsx` | **New** | Toast state, provider, `showToast` hook |
| `src/components/ToastContainer.tsx` | **New** | Renders active toasts, AnimatePresence exit |
| `src/main.tsx` | Modify | Wrap app in `ToastProvider` |
| `src/App.tsx` | Modify | Render `<ToastContainer />` |
| `src/hooks/useDecisionActions.ts` | Modify | Call `showToast` after each decision outcome |
| `src/components/floorplan/FloorplanGrid.tsx` | Modify | `isAboutToFree` → amber cell |
| `src/components/desk/MiniGrid.tsx` | Modify | `isAboutToFree` → amber cell |

No changes to `GameState`, `gameLogic.ts`, or `types.ts`.

---

## Dependencies

- `motion/react` (`AnimatePresence`, `motion.div`) — already in the project
- No new packages
