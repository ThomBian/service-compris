# Game Feedback & Cues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable toast notification system for decision outcomes, and amber cell highlighting when a seated party is about to leave.

**Architecture:** A standalone `ToastContext` (outside `GameContext`) provides `showToast()` to any component or hook. `useDecisionActions` calls `showToast` after each accept/refuse outcome. Both `FloorplanGrid` and `MiniGrid` apply an amber background when `cell.mealDuration <= TABLE_TURNING_SOON_THRESHOLD`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, `motion/react` (already imported), Vitest

---

## File Map

| File | Change |
|---|---|
| `src/context/ToastContext.tsx` | **Create** — Toast type, ToastProvider, useToast hook |
| `src/components/ToastContainer.tsx` | **Create** — Renders active toasts with AnimatePresence |
| `src/main.tsx` | Modify — wrap App in ToastProvider |
| `src/App.tsx` | Modify — render `<ToastContainer />` inside GameContent |
| `src/hooks/useGameEngine.ts` | Modify — call useToast(), pass showToast to useDecisionActions |
| `src/hooks/useDecisionActions.ts` | Modify — accept showToast param, fire toast after each decision |
| `src/constants.ts` | Modify — add TABLE_TURNING_SOON_THRESHOLD constant |
| `src/components/floorplan/FloorplanGrid.tsx` | Modify — isAboutToFree → amber cell + dark timer text |
| `src/components/desk/MiniGrid.tsx` | Modify — isAboutToFree → amber cell |

---

### Task 1: ToastContext — state, provider, and hook

**Files:**
- Create: `src/context/ToastContext.tsx`

- [ ] **Step 1: Create `src/context/ToastContext.tsx`**

```tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface Toast {
  id: string;
  title: string;
  detail?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (title: string, detail?: string, variant?: Toast['variant'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((
    title: string,
    detail?: string,
    variant: Toast['variant'] = 'info',
    duration = 2500
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, detail, variant, duration }]);
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, duration);
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(t => clearTimeout(t)); };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/context/ToastContext.tsx
git commit -m "feat: add ToastContext — provider and useToast hook"
```

---

### Task 2: ToastContainer — render component

**Files:**
- Create: `src/components/ToastContainer.tsx`

The game's visual style uses hard drop-shadows (`shadow-[2px_2px_0px_0px_...]`), bold borders, and small `text-[10px]` / `text-[11px]` text. Match that here.

- [ ] **Step 1: Create `src/components/ToastContainer.tsx`**

```tsx
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useToast, type Toast } from '../context/ToastContext';

const VARIANT_CLASSES: Record<Toast['variant'], string> = {
  success: 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-[2px_2px_0px_0px_rgba(5,150,105,0.4)]',
  error:   'bg-red-50 border-red-600 text-red-700 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.4)]',
  warning: 'bg-amber-50 border-amber-500 text-amber-700 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.4)]',
  info:    'bg-white border-[#141414] text-stone-900 shadow-[2px_2px_0px_0px_rgba(20,20,20,0.15)]',
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {/* top-16 keeps toasts below the sticky TopBar (~64px). Spec says top-4 but that overlaps the header — intentional deviation. */}
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className={`rounded-lg px-3 py-2 text-[11px] border max-w-[240px] ${VARIANT_CLASSES[toast.variant]}`}
          >
            <div className="font-bold leading-snug">{toast.title}</div>
            {toast.detail && (
              <div className="opacity-70 mt-0.5 leading-snug">{toast.detail}</div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
```

Note: `top-16` keeps toasts below the TopBar (which is `p-4` with an icon row — roughly 64px tall).

- [ ] **Step 2: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ToastContainer.tsx
git commit -m "feat: add ToastContainer component"
```

---

### Task 3: Wire ToastProvider and ToastContainer into the app

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Wrap the app in `ToastProvider` in `main.tsx`**

Current `src/main.tsx`:
```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Replace with:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Render `<ToastContainer />` inside `GameContent` in `src/App.tsx`**

Find the return statement of `GameContent`:
```tsx
  return (
    <div className="h-screen flex flex-col bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      <TopBar
```

Add `ToastContainer` import and render it as the last child of the outer div:
```tsx
import React from 'react';
import { formatTime } from './utils';
import { GameProvider, useGame } from './context/GameContext';
import { PhysicalState } from './types';
import { TopBar } from './components/TopBar';
import { ScenePanel } from './components/ScenePanel';
import { BottomPanel } from './components/BottomPanel';
import { ToastContainer } from './components/ToastContainer';

function GameContent() {
  const { gameState, seatParty, setTimeMultiplier } = useGame();
  const [view, setView] = React.useState<'desk' | 'floorplan'>('desk');

  React.useEffect(() => {
    if (view === 'floorplan' && gameState.currentClient?.physicalState !== PhysicalState.SEATING) {
      setView('desk');
    }
  }, [view, gameState.currentClient?.physicalState]);

  const handleSeatParty = () => {
    seatParty();
    setView('floorplan');
  };

  return (
    <div className="h-screen flex flex-col bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      <TopBar
        inGameMinutes={gameState.inGameMinutes}
        rating={gameState.rating}
        cash={gameState.cash}
        morale={gameState.morale}
        timeMultiplier={gameState.timeMultiplier}
        setTimeMultiplier={setTimeMultiplier}
        formatTime={formatTime}
      />
      <ScenePanel view={view} onSeatParty={handleSeatParty} />
      <BottomPanel view={view} />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Smoke test in browser**

```bash
npm run dev
```

Open http://localhost:3000. The game should load normally with no visible change. No console errors. The toast system is wired but not yet triggered.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: wire ToastProvider and ToastContainer into app"
```

---

### Task 4: Decision feedback — fire toasts from useDecisionActions

**Files:**
- Modify: `src/hooks/useDecisionActions.ts`
- Modify: `src/hooks/useGameEngine.ts`

**Pattern:** The game logic runs inside `setGameState(prev => ...)` callbacks. `showToast` cannot be called inside those callbacks (it is a React state setter). Instead, capture the toast parameters in a local variable inside the callback, then call `showToast` immediately after `setGameState` returns.

```ts
let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

setGameState(prev => {
  // compute outcome...
  toastArgs = ['Title', 'detail', 'success'];
  return nextState;
});

if (toastArgs) showToast(...toastArgs);
```

The `setGameState` callback runs synchronously during the call, so `toastArgs` is populated before the `if` check.

**Outcome logic reference** (mirrors `src/logic/gameLogic.ts`):

In `handleAcceptedClient`:
- `client.hasLied && client.isCaught` → Grateful Liar (success): cash ×2.5, rating +0.8, morale +10
- `client.hasLied && client.type === ClientType.SCAMMER` → Fooled scammer (error): cash −50, rating −1.0, morale −20
- `client.hasLied` (non-scammer) → Fooled rule-breaker (error): rating −0.5, morale −10
- none of the above → Honest accept (success): cash +basePay, rating +0.1

In `handleRefusedClient`:
- `isJustified` (scammer, size lie, or late) → Justified Refusal (success): rating +0.2, morale +5
- otherwise → Unjustified Refusal (error): rating −0.5, morale −15

In `handleSeatingRefusal`:
- Always: rating −1.5, morale −30 (error)

- [ ] **Step 1: Update `src/hooks/useDecisionActions.ts`**

Replace the entire file with:

```ts
import { useCallback, Dispatch, SetStateAction } from 'react';
import { GameState, PhysicalState, CellState, ClientType, LieType } from '../types';
import { mealDurationForPartySize } from '../constants';
import {
  handleAcceptedClient,
  handleRefusedClient,
  handleSeatingRefusal,
  canSelectCell
} from '../logic/gameLogic';
import { type Toast } from '../context/ToastContext';

type ShowToast = (title: string, detail?: string, variant?: Toast['variant'], duration?: number) => void;

function buildDeltaDetail(
  cashDelta: number,
  ratingDelta: number,
  moraleDelta: number
): string | undefined {
  const parts: string[] = [];
  if (cashDelta !== 0) parts.push(cashDelta > 0 ? `+$${Math.round(cashDelta)}` : `-$${Math.round(Math.abs(cashDelta))}`);
  if (ratingDelta !== 0) parts.push(ratingDelta > 0 ? `★ +${ratingDelta.toFixed(1)}` : `★ ${ratingDelta.toFixed(1)}`);
  if (moraleDelta !== 0) parts.push(moraleDelta > 0 ? `♥ +${moraleDelta}` : `♥ ${moraleDelta}`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function useDecisionActions(
  setGameState: Dispatch<SetStateAction<GameState>>,
  showToast: ShowToast
) {
  const handleDecision = useCallback(() => {
    let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

    setGameState(prev => {
      if (!prev.currentClient) return prev;
      const { nextRating, nextMorale, nextLogs } = handleRefusedClient(
        prev.currentClient, prev.rating, prev.morale, prev.logs
      );

      // Mirrors the isJustified logic inside handleRefusedClient (gameLogic.ts:448).
      // Duplicated here because handleRefusedClient doesn't return isJustified.
      // Keep in sync if the justification rules ever change.
      const isJustified = prev.currentClient.type === ClientType.SCAMMER
        || prev.currentClient.lieType === LieType.SIZE
        || prev.currentClient.isLate;

      const detail = buildDeltaDetail(0, nextRating - prev.rating, nextMorale - prev.morale);
      toastArgs = isJustified
        ? ['Justified Refusal', detail, 'success']
        : ['Unjustified Refusal', detail, 'error'];

      return {
        ...prev,
        currentClient: null,
        rating: nextRating,
        morale: nextMorale,
        logs: nextLogs.slice(0, 50)
      };
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast]);

  const waitInLine = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentClient) return prev;
      const client = { ...prev.currentClient, physicalState: PhysicalState.IN_QUEUE };
      return {
        ...prev,
        queue: [client, ...prev.queue],
        currentClient: null,
        logs: [`Sent ${client.trueFirstName} back to the line.`, ...prev.logs]
      };
    });
  }, [setGameState]);

  const seatParty = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentClient) return prev;
      return {
        ...prev,
        currentClient: { ...prev.currentClient, physicalState: PhysicalState.SEATING }
      };
    });
  }, [setGameState]);

  const toggleCellSelection = useCallback((x: number, y: number) => {
    setGameState(prev => {
      const cell = prev.grid[y][x];
      const selectedCells = prev.grid.flat().filter(c => c.state === CellState.SELECTED);
      const isAlreadySelected = cell.state === CellState.SELECTED;
      const nextGrid = prev.grid.map((row, ry) => row.map((c, cx) => {
        if (ry === y && cx === x) {
          if (isAlreadySelected) return { ...c, state: CellState.EMPTY };
          if (canSelectCell(c, selectedCells)) return { ...c, state: CellState.SELECTED };
        }
        return c;
      }));
      return { ...prev, grid: nextGrid };
    });
  }, [setGameState]);

  const confirmSeating = useCallback(() => {
    let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

    setGameState(prev => {
      if (!prev.currentClient) return prev;
      const selectedCells = prev.grid.flat().filter(c => c.state === CellState.SELECTED);
      if (selectedCells.length === 0) return prev;

      const { nextCash, nextRating, nextMorale, nextLogs } = handleAcceptedClient(
        prev.currentClient, selectedCells.length, prev.cash, prev.rating, prev.morale, prev.logs
      );

      const client = prev.currentClient;
      const detail = buildDeltaDetail(
        nextCash - prev.cash,
        nextRating - prev.rating,
        nextMorale - prev.morale
      );

      // Walk-ins have no lie, same branch as honest accept
      if (client.hasLied && client.isCaught) {
        toastArgs = ['Grateful Liar — well played!', detail, 'success'];
      } else if (client.hasLied && client.type === ClientType.SCAMMER) {
        toastArgs = ['Fooled! Seated a scammer', detail, 'error'];
      } else if (client.hasLied) {
        toastArgs = ['Rule-breaker slipped through', detail, 'error'];
      } else {
        // Honest accept (includes walk-ins)
        toastArgs = [`✓ Accepted ${client.trueFirstName}`, detail, 'success'];
      }

      const partyId = client.id;
      const mealMinutes = mealDurationForPartySize(client.truePartySize);
      const nextGrid = prev.grid.map(row => row.map(cell => {
        if (cell.state === CellState.SELECTED) {
          return { ...cell, state: CellState.OCCUPIED, mealDuration: mealMinutes, partyId };
        }
        return cell;
      }));

      return {
        ...prev,
        currentClient: null,
        grid: nextGrid,
        cash: nextCash,
        rating: nextRating,
        morale: nextMorale,
        logs: nextLogs.slice(0, 50)
      };
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast]);

  const refuseSeatedParty = useCallback(() => {
    let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

    setGameState(prev => {
      if (!prev.currentClient || prev.currentClient.physicalState !== PhysicalState.SEATING) return prev;
      const { nextRating, nextMorale, nextLogs } = handleSeatingRefusal(
        prev.currentClient, prev.rating, prev.morale, prev.logs
      );

      const detail = buildDeltaDetail(0, nextRating - prev.rating, nextMorale - prev.morale);
      toastArgs = ['Refused after seating', detail, 'error'];

      const nextGrid = prev.grid.map(row => row.map(cell =>
        cell.state === CellState.SELECTED ? { ...cell, state: CellState.EMPTY } : cell
      ));
      return {
        ...prev,
        currentClient: null,
        grid: nextGrid,
        rating: nextRating,
        morale: nextMorale,
        logs: nextLogs.slice(0, 50)
      };
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast]);

  return { handleDecision, waitInLine, seatParty, toggleCellSelection, confirmSeating, refuseSeatedParty };
}
```

- [ ] **Step 2: Update `src/hooks/useGameEngine.ts` to pass `showToast` to `useDecisionActions`**

`useGameEngine` is a hook called inside `GameProvider` which renders inside `ToastProvider`, so `useToast()` is valid here.

Replace the file with:

```ts
import { useState } from 'react';
import { GameState } from '../types';
import { START_TIME, INITIAL_RESERVATIONS } from '../constants';
import { createInitialGrid } from '../logic/gameLogic';
import { useGameClock } from './useGameClock';
import { useClientSpawner } from './useClientSpawner';
import { useQueueManager } from './useQueueManager';
import { useQuestionActions } from './useQuestionActions';
import { useAccusationActions } from './useAccusationActions';
import { useDecisionActions } from './useDecisionActions';
import { useReservationActions } from './useReservationActions';
import { useToast } from '../context/ToastContext';

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>({
    inGameMinutes: START_TIME,
    timeMultiplier: 1,
    reservations: INITIAL_RESERVATIONS,
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: createInitialGrid(),
    cash: 0,
    rating: 5.0,
    morale: 100,
    logs: ['Welcome to The Maitre D\'. The doors are open.'],
  });

  const { showToast } = useToast();
  const { setTimeMultiplier } = useGameClock(gameState, setGameState);
  useClientSpawner(gameState, setGameState);
  useQueueManager(gameState, setGameState);

  const { askQuestion } = useQuestionActions(setGameState);
  const { callOutLie } = useAccusationActions(setGameState);
  const {
    handleDecision,
    waitInLine,
    seatParty,
    toggleCellSelection,
    confirmSeating,
    refuseSeatedParty
  } = useDecisionActions(setGameState, showToast);
  const { toggleReservationArrived } = useReservationActions(setGameState);

  return {
    gameState,
    askQuestion,
    callOutLie,
    handleDecision,
    waitInLine,
    seatParty,
    toggleCellSelection,
    confirmSeating,
    refuseSeatedParty,
    toggleReservationArrived,
    setTimeMultiplier
  };
}
```

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Verify visually**

```bash
npm run dev
```

Open http://localhost:3000. Accept a party (seat them on the grid). A green toast should appear top-right showing the party name and stat deltas. Refuse a party — a red or green toast should appear depending on justification.

- [ ] **Step 5: Run tests to confirm no regressions**

```bash
npm run test
```

Expected: all existing tests pass (pure game logic is unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useDecisionActions.ts src/hooks/useGameEngine.ts
git commit -m "feat: fire decision feedback toasts on accept/refuse/seat outcomes"
```

---

### Task 5: Amber cell — table turnover warning

**Files:**
- Modify: `src/constants.ts`
- Modify: `src/components/floorplan/FloorplanGrid.tsx`
- Modify: `src/components/desk/MiniGrid.tsx`

Both grids use the same threshold and the same amber colour so the UI is consistent regardless of which panel the player is looking at.

- [ ] **Step 1: Add `TABLE_TURNING_SOON_THRESHOLD` to `src/constants.ts`**

After the `MEAL_DURATION_PER_EXTRA_GUEST_MINUTES` block, add:

```ts
/** Cells with mealDuration ≤ this value turn amber to signal the table is about to free up. */
export const TABLE_TURNING_SOON_THRESHOLD = 10;
```

- [ ] **Step 2: Update `src/components/floorplan/FloorplanGrid.tsx`**

Add the import for `TABLE_TURNING_SOON_THRESHOLD` (already imports from `'../../constants'`):

```ts
import { GRID_SIZE, TABLE_TURNING_SOON_THRESHOLD } from '../../constants';
```

Inside the cell `<button>` render, add the `isAboutToFree` variable and update the class/timer logic. Find the inner cell button map:

```tsx
{grid.map((row, y) =>
  row.map((cell, x) => (
    <button
      key={cell.id}
      onClick={() => isSeating && toggleCellSelection(x, y)}
      disabled={!isSeating || cell.state === CellState.OCCUPIED}
      className={`
        aspect-square rounded-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5
        ${cell.state === CellState.EMPTY ? 'bg-white' : ''}
        ${cell.state === CellState.EMPTY && isSeating ? 'hover:bg-emerald-100 cursor-pointer' : ''}
        ${cell.state === CellState.SELECTED ? 'bg-emerald-500 shadow-inner scale-95' : ''}
        ${cell.state === CellState.OCCUPIED ? 'bg-stone-800 cursor-not-allowed' : ''}
        ${!isSeating ? 'cursor-default' : ''}
      `}
```

Replace with:

```tsx
{grid.map((row, y) =>
  row.map((cell, x) => {
    const isAboutToFree = cell.state === CellState.OCCUPIED
      && cell.mealDuration !== undefined
      && cell.mealDuration <= TABLE_TURNING_SOON_THRESHOLD;
    return (
      <button
        key={cell.id}
        onClick={() => isSeating && toggleCellSelection(x, y)}
        disabled={!isSeating || cell.state === CellState.OCCUPIED}
        className={`
          aspect-square rounded-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5
          ${cell.state === CellState.EMPTY ? 'bg-white' : ''}
          ${cell.state === CellState.EMPTY && isSeating ? 'hover:bg-emerald-100 cursor-pointer' : ''}
          ${cell.state === CellState.SELECTED ? 'bg-emerald-500 shadow-inner scale-95' : ''}
          ${cell.state === CellState.OCCUPIED && !isAboutToFree ? 'bg-stone-800 cursor-not-allowed' : ''}
          ${isAboutToFree ? 'bg-amber-400 cursor-not-allowed' : ''}
          ${!isSeating ? 'cursor-default' : ''}
        `}
        id={`cell-${x}-${y}`}
      >
        {cell.state === CellState.SELECTED && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        )}
        {cell.state === CellState.OCCUPIED && (
          <>
            <Users className={`w-3 h-3 shrink-0 ${isAboutToFree ? 'text-stone-700' : 'text-stone-500'}`} />
            {cell.mealDuration !== undefined && (
              <span
                className={`text-[9px] font-mono font-bold leading-none tabular-nums ${isAboutToFree ? 'text-stone-900' : 'text-amber-400/90'}`}
                title={`${cell.mealDuration} in-game minutes remaining`}
              >
                {cell.mealDuration}m
              </span>
            )}
          </>
        )}
      </button>
    );
  })
)}
```

Note the closing parenthesis of the outer `.map((cell, x) => {` is now a `}` block with an explicit `return`.

- [ ] **Step 3: Update `src/components/desk/MiniGrid.tsx`**

Add the import for the threshold constant:

```ts
import { GRID_SIZE, TABLE_TURNING_SOON_THRESHOLD } from '../../constants';
```

Inside the cell render, add `isAboutToFree` and apply amber background:

Find:
```tsx
{grid.map((row, y) =>
  row.map((cell, x) => {
    const isOccupied = cell.state === CellState.OCCUPIED;
    return (
      <div
        key={`mini-${x}-${y}`}
        className={`rounded-sm ${isOccupied ? 'bg-stone-800' : 'bg-white'}`}
        style={{ width: 14, height: 14 }}
      />
    );
  })
)}
```

Replace with:
```tsx
{grid.map((row, y) =>
  row.map((cell, x) => {
    const isOccupied = cell.state === CellState.OCCUPIED;
    const isAboutToFree = isOccupied
      && cell.mealDuration !== undefined
      && cell.mealDuration <= TABLE_TURNING_SOON_THRESHOLD;
    return (
      <div
        key={`mini-${x}-${y}`}
        className={`rounded-sm ${isAboutToFree ? 'bg-amber-400' : isOccupied ? 'bg-stone-800' : 'bg-white'}`}
        style={{ width: 14, height: 14 }}
      />
    );
  })
)}
```

- [ ] **Step 4: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Verify visually**

```bash
npm run dev
```

Open http://localhost:3000. Seat a party and speed up the clock (3× multiplier). When the table's `mealDuration` reaches 10, the cell should turn amber in both the main Floorplan view and the MiniGrid in the desk tools panel. When the table empties, the cell returns to white.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/constants.ts src/components/floorplan/FloorplanGrid.tsx src/components/desk/MiniGrid.tsx
git commit -m "feat: amber cell warning when table is about to free up (≤10m)"
```
