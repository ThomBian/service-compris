# Tablet Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tablet layout (768px–1024px) that shows Podium+Queue on the left and a tabbed Floor/Bookings/Log panel on the right, without touching the desktop layout.

**Architecture:** A new `RightPanel` component owns a three-tab switcher (Floor | Bookings | Log) rendered only at `md:`. A `useMediaQuery` hook drives conditional rendering of the `AnimatePresence` ActivityLog overlay (desktop only) without fighting Framer Motion. All other changes are targeted Tailwind class tweaks.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), Vite dev server

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/hooks/useMediaQuery.ts` | Create | Reactive `window.matchMedia` hook |
| `src/components/RightPanel.tsx` | Create | Tablet right-column tab switcher |
| `src/App.tsx` | Modify | Add `md:` grid, wire RightPanel, gate overlay |
| `src/components/Podium.tsx` | Modify | Responsive padding, font, chat box height |
| `src/components/QueuePreview.tsx` | Modify | Responsive circle size |
| `src/components/TopBar.tsx` | Modify | Responsive gaps, font, hide log button at tablet |

---

## Task 1: Add useMediaQuery hook

**Files:**
- Create: `src/hooks/useMediaQuery.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/tbianchini/workspace/service-compris && npm run lint`
Expected: no errors related to `useMediaQuery.ts`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMediaQuery.ts
git commit -m "feat: add useMediaQuery hook"
```

---

## Task 2: Create RightPanel component

**Files:**
- Create: `src/components/RightPanel.tsx`

The RightPanel renders at tablet only. It owns a local tab state and slots `FloorplanGrid`, `BookingList`, and `ActivityLog` into the active tab.

Note: `FloorplanGrid` reads directly from context via `useGame()` — it needs no props. `BookingList` and `ActivityLog` need props forwarded from App.tsx.

- [ ] **Step 1: Create RightPanel**

```tsx
// src/components/RightPanel.tsx
import React from 'react';
import { FloorplanGrid } from './FloorplanGrid';
import { BookingList } from './BookingList';
import { ActivityLog } from './ActivityLog';
import { GameState } from '../types';

type Tab = 'floor' | 'bookings' | 'log';

interface RightPanelProps {
  gameState: GameState;
  inGameMinutes: number;
  formatTime: (m: number) => string;
  toggleArrived: (id: string) => void;
  logs: string[];
}

export const RightPanel: React.FC<RightPanelProps> = ({
  gameState,
  inGameMinutes,
  formatTime,
  toggleArrived,
  logs,
}) => {
  const [activeTab, setActiveTab] = React.useState<Tab>('floor');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'floor', label: 'Floor' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'log', label: 'Log' },
  ];

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-[#141414]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'bg-[#E4E3E0] text-[#141414] hover:bg-[#141414]/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'floor' && <FloorplanGrid />}
        {activeTab === 'bookings' && (
          <div className="bg-white p-6 h-full overflow-hidden flex flex-col gap-6">
            <BookingList
              reservations={gameState.reservations}
              inGameMinutes={inGameMinutes}
              formatTime={formatTime}
              toggleArrived={toggleArrived}
            />
          </div>
        )}
        {activeTab === 'log' && (
          <div className="p-4 h-full overflow-hidden">
            <ActivityLog logs={logs} />
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/RightPanel.tsx
git commit -m "feat: add RightPanel tab switcher for tablet layout"
```

---

## Task 3: Update App.tsx — tablet grid and conditional rendering

**Files:**
- Modify: `src/App.tsx`

This is the most significant change. Three things happen:
1. The main grid gets a new `md:grid-cols-[45%_55%]` breakpoint
2. Desktop-only columns (FloorplanGrid, BookingList) get `hidden lg:flex` wrappers
3. RightPanel is inserted for `md:` with `hidden md:flex lg:hidden`
4. The ActivityLog AnimatePresence is gated with `isLg` (from useMediaQuery) so it never fights Framer Motion at tablet

- [ ] **Step 1: Update App.tsx**

Replace the entire `GameContent` function with:

```tsx
function GameContent() {
  const {
    gameState,
    askQuestion,
    callOutLie,
    handleDecision,
    waitInLine,
    seatParty,
    toggleReservationArrived,
    setTimeMultiplier
  } = useGame();

  const [showLogs, setShowLogs] = React.useState(false);
  const isLg = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      <TopBar
        inGameMinutes={gameState.inGameMinutes}
        rating={gameState.rating}
        cash={gameState.cash}
        morale={gameState.morale}
        timeMultiplier={gameState.timeMultiplier}
        setTimeMultiplier={setTimeMultiplier}
        formatTime={formatTime}
        showLogs={showLogs}
        toggleLogs={() => setShowLogs(!showLogs)}
      />

      <main className="grid grid-cols-1 md:grid-cols-[45%_55%] lg:grid-cols-12 gap-0 h-[calc(100vh-65px)] relative">
        {/* Left Column: Podium & Queue — visible at all breakpoints */}
        <div className="lg:col-span-4 flex flex-col border-r border-[#141414] overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Podium
              currentClient={gameState.currentClient}
              queueLength={gameState.queue.length}
              askQuestion={askQuestion}
              callOutLie={callOutLie}
              handleDecision={handleDecision}
              waitInLine={waitInLine}
              seatParty={seatParty}
              formatTime={formatTime}
            />
          </div>
          <div className="h-40 border-t border-[#141414] bg-stone-50 p-6 overflow-hidden shrink-0">
            <QueuePreview queue={gameState.queue} />
          </div>
        </div>

        {/* RightPanel — tablet only (md, not lg) */}
        <div className="hidden md:flex lg:hidden flex-col overflow-hidden">
          <RightPanel
            gameState={gameState}
            inGameMinutes={gameState.inGameMinutes}
            formatTime={formatTime}
            toggleArrived={toggleReservationArrived}
            logs={gameState.logs}
          />
        </div>

        {/* Middle Column: Floorplan — desktop only */}
        <div className="hidden lg:flex lg:col-span-5 flex-col border-r border-[#141414] overflow-hidden bg-[#E4E3E0]">
          <FloorplanGrid />
        </div>

        {/* Right Column: Booking List — desktop only */}
        <div className="hidden lg:flex lg:col-span-3 bg-white p-6 flex-col gap-6 overflow-hidden">
          <BookingList
            reservations={gameState.reservations}
            inGameMinutes={gameState.inGameMinutes}
            formatTime={formatTime}
            toggleArrived={toggleReservationArrived}
          />
        </div>

        {/* Activity Log Overlay — desktop only, gated with isLg to avoid AnimatePresence conflict */}
        {isLg && (
          <AnimatePresence>
            {showLogs && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 right-0 w-80 bg-stone-100 border-l border-[#141414] shadow-2xl z-30 flex flex-col"
              >
                <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-[#141414] text-[#E4E3E0]">
                  <h3 className="font-serif italic text-lg">Activity Log</h3>
                  <button
                    onClick={() => setShowLogs(false)}
                    className="hover:opacity-70 transition-opacity text-xs font-bold"
                  >
                    CLOSE
                  </button>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                  <ActivityLog logs={gameState.logs} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
```

Also add the import at the top of the file (after existing imports):
```tsx
import { RightPanel } from './components/RightPanel';
import { useMediaQuery } from './hooks/useMediaQuery';
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no TypeScript errors

- [ ] **Step 3: Visual check at tablet size**

Run: `npm run dev`
Open browser at `http://localhost:3000`, open DevTools, set viewport to 900px wide.

Expected:
- Two columns visible: Podium+Queue on left, tab bar (Floor | Bookings | Log) on right
- Clicking Floor tab shows the floorplan grid
- Clicking Bookings tab shows the reservations table
- Clicking Log tab shows the activity log
- TopBar log button is NOT visible (will be fixed in Task 6)

- [ ] **Step 4: Visual check at desktop size**

Set viewport to 1280px wide.

Expected:
- Three columns visible: Podium+Queue | Floorplan | BookingList (same as before)
- SHOW LOGS button visible and working
- No RightPanel visible

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add tablet layout with RightPanel and conditional desktop overlay"
```

---

## Task 4: Fix Podium.tsx — responsive padding, font, chat height

**Files:**
- Modify: `src/components/Podium.tsx`

Three targeted class changes. No logic changes.

- [ ] **Step 1: Fix outer wrapper padding**

In `Podium.tsx` line 30, change:
```tsx
<div className="p-6 flex flex-col gap-6">
```
to:
```tsx
<div className="p-4 md:p-6 flex flex-col gap-6">
```

- [ ] **Step 2: Fix guest name font size**

In `Podium.tsx` line 63, change:
```tsx
<h3 className="text-3xl font-bold mt-1">
```
to:
```tsx
<h3 className="text-xl md:text-3xl font-bold mt-1">
```

- [ ] **Step 3: Fix chat box height**

In `Podium.tsx` line 95, change:
```tsx
<div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto bg-[#f9f9f9] p-4 rounded-xl border border-[#141414] flex flex-col gap-3 font-mono text-xs custom-scrollbar">
```
to:
```tsx
<div className="flex-1 min-h-0 overflow-y-auto bg-[#f9f9f9] p-4 rounded-xl border border-[#141414] flex flex-col gap-3 font-mono text-xs custom-scrollbar">
```

- [ ] **Step 4: Visual check**

With dev server running at 900px viewport, verify:
- Guest card padding is tighter than before
- Guest name is smaller (scales up at 1024px+)
- Chat box fills available vertical space rather than being fixed-height

- [ ] **Step 5: Commit**

```bash
git add src/components/Podium.tsx
git commit -m "fix: responsive padding, font, and chat height in Podium"
```

---

## Task 5: Fix QueuePreview.tsx — responsive circle size

**Files:**
- Modify: `src/components/QueuePreview.tsx`

One class change.

- [ ] **Step 1: Fix circle size**

In `QueuePreview.tsx` line 18, change:
```tsx
className="w-10 h-10 rounded-full border border-[#141414] flex items-center justify-center bg-[#E4E3E0] relative group"
```
to:
```tsx
className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-[#141414] flex items-center justify-center bg-[#E4E3E0] relative group"
```

- [ ] **Step 2: Visual check**

At 900px viewport, circles in the queue strip should be slightly smaller (32px vs 40px). At 1280px they should be the original size.

- [ ] **Step 3: Commit**

```bash
git add src/components/QueuePreview.tsx
git commit -m "fix: responsive circle size in QueuePreview"
```

---

## Task 6: Fix TopBar.tsx — responsive gaps, font, hide log button at tablet

**Files:**
- Modify: `src/components/TopBar.tsx`

Three targeted changes.

- [ ] **Step 1: Fix metrics container gap**

In `TopBar.tsx` line 29, change:
```tsx
<div className="flex items-center gap-8">
```
to:
```tsx
<div className="flex items-center gap-4 md:gap-8">
```

- [ ] **Step 2: Fix metric value font sizes (4 occurrences)**

Change all four metric `<span>` elements from `text-xl` to `text-base md:text-xl`. Lines 32, 36, 40, 44:

```tsx
// Line 32
<span className="font-mono text-base md:text-xl font-bold">{formatTime(inGameMinutes)}</span>
// Line 36
<span className="font-mono text-base md:text-xl font-bold">{rating.toFixed(1)}</span>
// Line 40
<span className="font-mono text-base md:text-xl font-bold">{morale}%</span>
// Line 44
<span className="font-mono text-base md:text-xl font-bold">{cash}</span>
```

- [ ] **Step 3: Hide log toggle button at tablet**

In `TopBar.tsx` line 49, the log toggle `<button>` — add `hidden lg:block` to its className:

```tsx
<button
  onClick={toggleLogs}
  className={`hidden lg:block px-4 py-2 rounded-lg border border-[#141414] text-xs font-bold transition-all ${
    showLogs
      ? 'bg-[#141414] text-[#E4E3E0]'
      : 'bg-white hover:bg-[#141414]/5'
  }`}
>
  {showLogs ? 'HIDE LOGS' : 'SHOW LOGS'}
</button>
```

- [ ] **Step 4: Visual check**

At 900px viewport:
- TopBar metrics are more compact (smaller font, tighter gap)
- "SHOW LOGS" button is not visible
At 1280px:
- TopBar metrics are full size
- "SHOW LOGS" button is visible and functional

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "fix: responsive TopBar metrics and hide log button at tablet"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full lint pass**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 2: Tablet verification (768px)**

Set DevTools viewport to exactly 768px wide.
Expected:
- Two-column layout active
- All three tabs (Floor | Bookings | Log) functional
- No horizontal overflow or broken layout

- [ ] **Step 3: Tablet verification (1023px)**

Set DevTools viewport to 1023px wide.
Expected:
- Two-column layout still active (RightPanel visible, not desktop columns)
- Podium text and padding are appropriately sized

- [ ] **Step 4: Desktop verification (1024px)**

Set DevTools viewport to 1024px wide.
Expected:
- Desktop three-column layout kicks in
- SHOW LOGS button visible
- ActivityLog overlay works correctly

- [ ] **Step 5: Desktop verification (1440px)**

Set DevTools viewport to 1440px.
Expected:
- Everything identical to how it looked before this change

- [ ] **Step 6: Known limitation acknowledgement**

The TopBar time multiplier button group (Pause / Play / Fast-forward / 3x) may appear cramped at narrow tablet widths. This is a known, accepted gap deferred from this spec — do not attempt to fix it here.

- [ ] **Step 7: Final commit**

```bash
git add docs/superpowers/plans/2026-03-21-tablet-responsiveness.md
git commit -m "feat: tablet responsiveness complete — md: two-column layout with RightPanel"
```
