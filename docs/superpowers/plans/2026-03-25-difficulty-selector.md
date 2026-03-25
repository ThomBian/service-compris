# Difficulty Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generateDailyVips` respect the difficulty parameter (0 = no VIPs, N = N random VIPs) and add a 0–3 difficulty selector to the TopBar that resets the game.

**Architecture:** Two sequential tasks. Task 1 updates the pure logic + tests. Task 2 wires a `resetGame(difficulty)` callback through the engine → context → App → TopBar.

**Tech Stack:** TypeScript, React 19, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/logic/vipLogic.ts` | Modify | `generateDailyVips` respects difficulty: 0→[], N→N VIPs without replacement |
| `src/logic/__tests__/vipLogic.test.ts` | Modify | Add difficulty-0 test; expand difficulty-2 assertion |
| `src/hooks/useGameEngine.ts` | Modify | Extract `buildInitialState(difficulty)`; add `resetGame` callback |
| `src/context/GameContext.tsx` | Modify | Add `resetGame` to context type + provider value |
| `src/components/TopBar.tsx` | Modify | Add `difficulty` + `onDifficultyChange` props; render button group |
| `src/App.tsx` | Modify | Add local `difficulty` state; wire `resetGame` to TopBar |

---

## Task 1: generateDailyVips difficulty scaling (TDD)

**Files:**
- Modify: `src/logic/vipLogic.ts`
- Modify: `src/logic/__tests__/vipLogic.test.ts`

- [ ] **Step 1: Write failing tests**

In `src/logic/__tests__/vipLogic.test.ts`, update the `generateDailyVips` describe block to:

```ts
describe('generateDailyVips', () => {
  it('returns empty array when roster is empty', () => {
    expect(generateDailyVips(1, [])).toEqual([]);
  });

  it('returns empty array when difficulty is 0', () => {
    expect(generateDailyVips(0, [FOOD_CRITIC, THE_OWNER])).toEqual([]);
  });

  it('returns exactly 1 VIP from roster regardless of difficulty', () => {
    const result = generateDailyVips(1, [FOOD_CRITIC, THE_OWNER]);
    expect(result).toHaveLength(1);
    expect([FOOD_CRITIC, THE_OWNER]).toContainEqual(result[0]);

    const result2 = generateDailyVips(2, [FOOD_CRITIC, THE_OWNER]);
    expect(result2).toHaveLength(2);
    const ids = result2.map(v => v.id);
    expect(new Set(ids).size).toBe(2); // no duplicates
  });
});
```

- [ ] **Step 2: Run tests — confirm new ones fail**

Run: `npm run test -- vipLogic`
Expected: 2 failures — the new difficulty-0 test, and the expanded difficulty-2 assertions within the existing "returns exactly 1 VIP" test. The "returns empty array when roster is empty" test still passes.

- [ ] **Step 3: Update generateDailyVips**

In `src/logic/vipLogic.ts`, replace lines 4–7:

```ts
export function generateDailyVips(difficulty: number, roster: Vip[]): Vip[] {
  if (difficulty <= 0 || roster.length === 0) return [];
  const count = Math.min(difficulty, roster.length);
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

- [ ] **Step 4: Run tests — confirm all pass**

Run: `npm run test`
Expected: 85 passing (84 existing + 1 new)

- [ ] **Step 5: Commit**

```bash
git add src/logic/vipLogic.ts src/logic/__tests__/vipLogic.test.ts
git commit -m "feat: generateDailyVips respects difficulty (0=none, N=N VIPs without replacement)"
```

---

## Task 2: resetGame + TopBar difficulty selector

**Files:**
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/context/GameContext.tsx`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Extract buildInitialState and add resetGame to useGameEngine**

In `src/hooks/useGameEngine.ts`, add `useCallback` to the React import. Then extract a module-level function before `useGameEngine`:

```ts
function buildInitialState(difficulty: number): GameState {
  const dailyVips = generateDailyVips(difficulty, VIP_ROSTER);
  const reservations = injectVipReservations(dailyVips, INITIAL_RESERVATIONS);
  return {
    inGameMinutes: START_TIME,
    timeMultiplier: 1,
    reservations,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: 0,
    rating: 5.0,
    morale: 100,
    logs: ["Welcome to The Maitre D'. The doors are open."],
    dailyVips,
    seatedVipIds: [],
    gameOver: false,
  };
}
```

Change the `useState` initializer to call `buildInitialState(1)`:

```ts
const [gameState, setGameState] = useState<GameState>(() => buildInitialState(1));
```

Add a `resetGame` callback after the `useState` line:

```ts
const resetGame = useCallback((difficulty: number) => {
  setGameState(buildInitialState(difficulty));
}, []);
```

Add `resetGame` to the return object.

- [ ] **Step 2: Add resetGame to GameContext**

In `src/context/GameContext.tsx`, add to `GameContextType`:

```ts
resetGame: (difficulty: number) => void;
```

The `GameProvider` passes `engine` directly to the context value — no change needed there since `useGameEngine` now returns `resetGame`.

- [ ] **Step 3: Add difficulty props to TopBar**

In `src/components/TopBar.tsx`, add to `TopBarProps`:

```ts
difficulty: number;
onDifficultyChange: (d: number) => void;
```

Add to the destructured params: `difficulty, onDifficultyChange`.

After the existing speed-control button group (closing `</div>` at line 92), add a difficulty selector group. Separate it with a small divider:

```tsx
<div className="w-px h-5 bg-[#141414]/20 mx-1" />
<div className="flex items-center gap-1 bg-white/50 p-1 rounded-lg border border-[#141414]/10">
  <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 px-1">VIPs</span>
  {[0, 1, 2, 3].map((d) => (
    <button
      key={d}
      type="button"
      onClick={() => onDifficultyChange(d)}
      title={d === 0 ? 'No VIPs tonight' : `${d} VIP${d > 1 ? 's' : ''} tonight`}
      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
        difficulty === d
          ? 'bg-[#141414] text-[#E4E3E0]'
          : 'bg-[#141414]/10'
      }`}
    >
      {d}
    </button>
  ))}
</div>
```

The divider and difficulty group go inside the outermost `<header>` flex container, after the speed-control group.

- [ ] **Step 4: Wire difficulty state in App.tsx**

In `src/App.tsx`, in `GameContent`:

1. Destructure `resetGame` from `useGame()`:
```ts
const { gameState, seatParty, setTimeMultiplier, resetGame } = useGame();
```

2. Add local difficulty state:
```ts
const [difficulty, setDifficulty] = React.useState(1);
```

3. Add a handler:
```ts
const handleDifficultyChange = (d: number) => {
  setDifficulty(d);
  resetGame(d);
};
```

4. Pass to TopBar:
```tsx
<TopBar
  inGameMinutes={gameState.inGameMinutes}
  rating={gameState.rating}
  cash={gameState.cash}
  morale={gameState.morale}
  timeMultiplier={gameState.timeMultiplier}
  setTimeMultiplier={setTimeMultiplier}
  formatTime={formatTime}
  difficulty={difficulty}
  onDifficultyChange={handleDifficultyChange}
/>
```

- [ ] **Step 5: Lint and run tests**

Run: `npm run lint && npm run test`
Expected: 0 errors, 85 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useGameEngine.ts src/context/GameContext.tsx src/components/TopBar.tsx src/App.tsx
git commit -m "feat: add TopBar difficulty selector — resets game with 0–3 VIPs tonight"
```
