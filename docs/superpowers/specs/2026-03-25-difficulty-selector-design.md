---
title: TopBar Difficulty Selector
date: 2026-03-25
status: approved
---

# TopBar Difficulty Selector

## Context

A developer testing tool added to the TopBar. The VIP system (sub-project 3) introduced `generateDailyVips(difficulty, roster)` but the difficulty parameter was ignored. This spec makes difficulty functional and adds a UI control to select it — enabling testers to verify 0-VIP, 1-VIP, and multi-VIP scenarios without code changes.

## Goal

- Make `generateDailyVips` respect the difficulty value (0 = no VIPs, N = N random VIPs without replacement)
- Add a 4-button difficulty selector (0–3) to the TopBar that resets the game with the chosen difficulty

## Out of Scope

- Persisting difficulty across page reloads
- Hiding the selector in production builds
- Difficulty affecting anything other than VIP count

---

## Data Model

No new types or `GameState` fields.

---

## Logic

### `generateDailyVips` — `src/logic/vipLogic.ts`

Replace the existing implementation:

```ts
export function generateDailyVips(difficulty: number, roster: Vip[]): Vip[] {
  if (difficulty <= 0 || roster.length === 0) return [];
  const count = Math.min(difficulty, roster.length);
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

### `buildInitialState` + `resetGame` — `src/hooks/useGameEngine.ts`

Extract a pure `buildInitialState(difficulty: number): GameState` function. The lazy `useState` initializer calls `buildInitialState(1)`. A new `resetGame(difficulty: number)` callback calls `setGameState(buildInitialState(difficulty))`.

### `GameContext` — `src/context/GameContext.tsx`

Add `resetGame: (difficulty: number) => void` to the context value.

---

## Components

### `TopBar` — `src/components/TopBar.tsx`

Add two new props:
- `difficulty: number`
- `onDifficultyChange: (d: number) => void`

Render a small button group (labels `0` / `1` / `2` / `3`) alongside the existing controls. Active difficulty uses the `bg-[#141414] text-[#E4E3E0]` style; inactive uses `bg-[#141414]/10`. Clicking calls `onDifficultyChange(d)`.

### `App.tsx` — `src/App.tsx`

Add `const [difficulty, setDifficulty] = React.useState(1)` in `GameContent`. Wire `resetGame` from `useGame()`. Pass `difficulty` and a handler that calls `setDifficulty(d)` + `resetGame(d)` to `TopBar`.

---

## Testing

Add one test to `src/logic/__tests__/vipLogic.test.ts`:

- **`generateDailyVips` returns empty array at difficulty 0** — assert `generateDailyVips(0, [FOOD_CRITIC, THE_OWNER])` returns `[]`

Update existing test "returns exactly 1 VIP from roster regardless of difficulty" to also verify `generateDailyVips(2, [FOOD_CRITIC, THE_OWNER])` returns length 2 (both VIPs, no duplicates).

Total: 85 tests after this change (84 existing + 1 new; 1 existing test expanded).
