# Desk Tools Harmonisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a consistent white paper-card shell and small-caps header to all four DeskTools components so they share one visual language.

**Architecture:** Pure styling changes — no logic, no new components, no new hooks. Each of the four files (`BookingLedger`, `Clipboard`, `PartyTicket`, `MiniGrid`) gets its outer container replaced with the shared card shell and its title replaced with the shared header pattern. No unit tests are needed (there is no logic to test); verification is lint + visual check in the browser.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Lucide React (icons)

---

## File Map

| File | Change |
|---|---|
| `src/components/desk/BookingLedger.tsx` | Shared card shell; new header; `flex-1 overflow-y-auto` moved to table wrapper |
| `src/components/desk/Clipboard.tsx` | Shared card shell; header normalised; inner border removed |
| `src/components/desk/PartyTicket.tsx` | Card shell tokens updated (shadow, radius, padding, border); shared header added; existing label removed; empty state wrapped |
| `src/components/desk/MiniGrid.tsx` | MiniGrid card shell (`self-start`); header normalised |

---

## Shared design tokens (reference for all tasks)

**Standard card shell** (BookingLedger, Clipboard, PartyTicket):
```
bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden
```

**MiniGrid card shell** (sizes to content, not row height):
```
bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 self-start overflow-hidden
```

**Shared header** (same for every tool):
```tsx
<div className="flex items-center gap-1.5 shrink-0">
  <SomeIcon size={12} />
  <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Tool Name</span>
</div>
```

---

## Task 1: Harmonise BookingLedger

**Files:**
- Modify: `src/components/desk/BookingLedger.tsx`

**Current structure:**
```tsx
<div className="flex flex-col gap-2 h-full">                   // ← outer shell
  <h3 className="font-serif italic text-lg flex items-center gap-2">  // ← old header
    <Book size={18} />
    Booking Ledger
  </h3>
  <div className="flex-1 overflow-y-auto border border-[#141414] rounded-xl">  // ← inner scroll+border div
    <table ...>...</table>
  </div>
</div>
```

- [ ] **Step 1: Rewrite `src/components/desk/BookingLedger.tsx`**

Replace the entire file with:

```tsx
import React from 'react';
import { Book, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { formatTime } from '../../utils';

export const BookingLedger: React.FC = () => {
  const { gameState: { reservations, inGameMinutes }, toggleReservationArrived } = useGame();

  return (
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <Book size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Booking Ledger</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#141414] text-[#E4E3E0] text-[10px] uppercase tracking-wider font-bold">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Name</th>
              <th className="p-2">Size</th>
              <th className="p-2 text-center">In</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {reservations.map((res) => {
              const isCurrentTime = Math.abs(inGameMinutes - res.time) <= 30;
              return (
                <tr
                  key={res.id}
                  className={`border-b border-[#141414]/10 transition-colors hover:bg-[#141414]/5 ${
                    isCurrentTime ? 'bg-emerald-50' : ''
                  } ${res.arrived ? 'opacity-40' : ''}`}
                >
                  <td className="p-2 font-bold">{formatTime(res.time)}</td>
                  <td className="p-2">{res.firstName} {res.lastName}</td>
                  <td className="p-2">{res.partySize}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => toggleReservationArrived(res.id)}
                      className={`w-5 h-5 border-2 border-[#141414] rounded flex items-center justify-center transition-colors ${
                        res.arrived ? 'bg-[#141414] text-white' : 'bg-white'
                      }`}
                    >
                      {res.arrived && <Check size={12} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

Key changes from old version:
- Outer div: plain `flex flex-col gap-2 h-full` → shared card shell
- Header: `font-serif italic text-lg h3` + `Book size={18}` → shared header with `Book size={12}`
- Inner scroll div: removed `border border-[#141414] rounded-xl` (now redundant — card provides the border); kept `flex-1 overflow-y-auto`

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/desk/BookingLedger.tsx
git commit -m "feat: harmonise BookingLedger to shared card shell"
```

---

## Task 2: Harmonise Clipboard

**Files:**
- Modify: `src/components/desk/Clipboard.tsx`

**Current structure:**
```tsx
<div className="flex flex-col gap-1 h-full">             // ← outer (no card)
  <div className="flex items-center gap-2">
    <ClipboardIcon size={14} />
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Clipboard</span>
  </div>
  <div className="flex gap-1">...</div>                   // ← tabs
  <div className="flex-1 border border-[#141414]/20 rounded-lg p-2 ...">  // ← inner border div
    {activeTab} — coming soon
  </div>
</div>
```

- [ ] **Step 1: Rewrite `src/components/desk/Clipboard.tsx`**

Replace the entire file with:

```tsx
import React from 'react';
import { Clipboard as ClipboardIcon } from 'lucide-react';

const TABS = ['Menu', 'VIPs', 'Banned'] as const;

export const Clipboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<typeof TABS[number]>('Menu');

  return (
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <ClipboardIcon size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Clipboard</span>
      </div>
      <div className="flex gap-1 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'bg-[#141414]/10 hover:bg-[#141414]/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 p-2 text-[10px] opacity-40 italic overflow-hidden">
        {activeTab} — coming soon
      </div>
    </div>
  );
};
```

Key changes from old version:
- Outer div: no card → shared card shell; `gap-1` → `gap-2`
- Header: `ClipboardIcon size={14}`, `text-[10px]`, `gap-2` → `size={12}`, `text-[9px]`, `gap-1.5`; added `shrink-0` to tab row
- Inner content div: removed `border border-[#141414]/20 rounded-lg` (inner border eliminated — card provides outer border); kept `flex-1 p-2`

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/desk/Clipboard.tsx
git commit -m "feat: harmonise Clipboard to shared card shell"
```

---

## Task 3: Harmonise PartyTicket

**Files:**
- Modify: `src/components/desk/PartyTicket.tsx`

This file has two render paths: an **empty state** (no `currentClient`) and an **active state**. Both get the shared card shell.

**Changes summary:**
- Empty state outer div: `flex-1 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-[#141414] rounded-2xl p-4` → shared card shell wrapping a dashed inner area
- Active state outer div: `flex-1 min-h-0 bg-white border border-[#141414] rounded-2xl shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] flex flex-col gap-3 relative overflow-hidden p-4` → shared card shell (keep `relative` for the patience bar)
- Add shared header with `<Users size={12} />` as first child of active state card
- Remove existing label span (`text-[10px] uppercase tracking-widest font-bold opacity-50` "Party Ticket") from inside the guest header section
- Remove `pt-1` from the guest header `div` (was compensating for patience bar; new `shrink-0` header handles spacing)
- `gap-3` → `gap-2` (shared shell)

- [ ] **Step 1: Rewrite `src/components/desk/PartyTicket.tsx`**

Replace the entire file with:

```tsx
import React from "react";
import { Users, MessageSquare, Search, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../../context/GameContext";
import { formatTime } from "../../utils";

export const PartyTicket: React.FC = () => {
  const {
    gameState: { currentClient },
    askQuestion,
    callOutLie,
    handleDecision,
    waitInLine,
  } = useGame();
  const [showLieMenu, setShowLieMenu] = React.useState(false);

  if (!currentClient) {
    return (
      <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <Users size={12} />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Party Ticket</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-[#141414] rounded-lg">
          <Users size={32} />
          <p className="font-bold mt-2 uppercase tracking-widest text-xs">
            Awaiting next guest...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden relative">
      {/* Patience Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
        <motion.div
          className={`h-full transition-all duration-500 ${
            currentClient.patience > 50
              ? "bg-emerald-500"
              : currentClient.patience > 20
                ? "bg-orange-500"
                : "bg-red-500"
          }`}
          style={{ width: `${currentClient.patience}%` }}
        />
      </div>

      {/* Shared header */}
      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        <Users size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Party Ticket</span>
      </div>

      {/* Guest header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold">
            {currentClient.knownFirstName || "???"}{" "}
            {currentClient.knownLastName || "???"}
          </h3>
          <div className="text-xs opacity-60 mt-0.5 flex flex-wrap items-center gap-x-2">
            {currentClient.knownTime !== undefined && (
              <span className="opacity-40">
                Booked: {formatTime(currentClient.knownTime)}
              </span>
            )}
          </div>
          {currentClient.isLate && (
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-1">
              <AlertCircle size={10} />
              LATE ARRIVAL
            </div>
          )}
        </div>
        {currentClient.isCaught && (
          <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 flex items-center gap-1">
            <AlertCircle size={10} />
            CAUGHT
          </div>
        )}
      </div>

      {/* Chat history */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f9f9f9] p-3 rounded-xl border border-[#141414] flex flex-col gap-2 font-mono text-xs custom-scrollbar">
        {currentClient.chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.sender === "maitre-d" ? "items-end" : "items-start"}`}
          >
            <span className="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">
              {msg.sender === "maitre-d" ? "Maître D'" : "Guest"}
            </span>
            <div
              className={`px-3 py-1.5 rounded-lg max-w-[90%] border ${
                msg.sender === "maitre-d"
                  ? "bg-[#141414] text-white border-[#141414]"
                  : "bg-white text-[#141414] border-[#141414]/20"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
      </div>

      {/* Question buttons */}
      <div className="grid grid-cols-3 gap-2">
        {(["firstName", "lastName", "time"] as const).map((field) => (
          <button
            key={field}
            onClick={() => askQuestion(field)}
            className="flex flex-col items-center gap-1 p-2 border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-white transition-all group"
          >
            <Search
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-[8px] font-bold uppercase tracking-wider text-center">
              {field === "firstName"
                ? "First Name"
                : field === "lastName"
                  ? "Last Name"
                  : "Booking Time"}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowLieMenu(!showLieMenu)}
          className={`col-span-3 flex items-center justify-center gap-2 p-2 border-2 border-orange-600 rounded-xl transition-all group ${
            showLieMenu
              ? "bg-orange-600 text-white"
              : "text-orange-600 hover:bg-orange-600 hover:text-white"
          }`}
        >
          <AlertCircle
            size={14}
            className="group-hover:scale-110 transition-transform"
          />
          <span className="text-[9px] font-bold uppercase tracking-wider">
            Call Out Lie
          </span>
        </button>
      </div>

      {/* Lie menu */}
      <AnimatePresence>
        {showLieMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 bg-orange-50 p-3 rounded-xl border border-orange-200 overflow-hidden"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-800">
              What are they lying about?
            </p>
            <div className="flex gap-2">
              {(["size", "time", "reservation"] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => {
                    callOutLie(field);
                    setShowLieMenu(false);
                  }}
                  className="flex-1 text-[9px] font-bold uppercase p-2 bg-white border border-orange-300 rounded hover:bg-orange-600 hover:text-white transition-colors"
                >
                  {field === "size"
                    ? "Party Size"
                    : field === "time"
                      ? "Arriving Late"
                      : "No Reservation"}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision buttons */}
      <div className="flex gap-2 pt-2 border-t border-[#141414]/10">
        <button
          onClick={waitInLine}
          className="flex-1 bg-amber-500 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-amber-600 transition-colors text-xs shadow-[0px_3px_0px_0px_rgba(217,119,6,1)] active:translate-y-px active:shadow-none"
        >
          <MessageSquare size={14} />
          WAIT IN LINE
        </button>
        <button
          onClick={() => handleDecision()}
          className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-red-700 transition-colors text-xs shadow-[0px_3px_0px_0px_rgba(185,28,28,1)] active:translate-y-px active:shadow-none"
        >
          <X size={14} />
          REFUSE
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: 50 tests passing (no logic was changed)

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/PartyTicket.tsx
git commit -m "feat: harmonise PartyTicket to shared card shell"
```

---

## Task 4: Harmonise MiniGrid

**Files:**
- Modify: `src/components/desk/MiniGrid.tsx`

MiniGrid uses the exception card shell (`self-start` instead of `h-full`) so the card wraps its fixed-size content rather than stretching to fill the grid row.

**Current structure:**
```tsx
<div className="flex flex-col gap-1">                  // ← no card
  <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Floorplan</span>
  <div className="grid ... bg-stone-300 ...">...</div>
</div>
```

- [ ] **Step 1: Rewrite `src/components/desk/MiniGrid.tsx`**

Replace the entire file with:

```tsx
import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { CellState } from '../../types';
import { GRID_SIZE } from '../../constants';

export const MiniGrid: React.FC = () => {
  const { gameState: { grid } } = useGame();

  return (
    <div className="bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 self-start overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <LayoutGrid size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Floorplan</span>
      </div>
      <div
        className="grid gap-0.5 bg-stone-300 p-0.5 rounded border border-stone-400"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
      >
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
      </div>
    </div>
  );
};
```

Key changes from old version:
- Outer div: bare `flex flex-col gap-1` → MiniGrid card shell (`self-start`, not `h-full`)
- Header: bare `span` → shared header with `<LayoutGrid size={12} />`; `text-[10px]` → `text-[9px]`; `gap-1` → `gap-2` (card shell)

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: 50 tests passing

- [ ] **Step 4: Visual verification**

Start the dev server if not already running:

```bash
npm run dev
```

Open `http://localhost:3000`. Verify in the DeskTools panel:
- [ ] All four tools have a white card with a 2px dark border and 4px offset shadow
- [ ] All four tools have the same small-caps label header with a small icon
- [ ] BookingLedger table still scrolls inside the card
- [ ] Clipboard inner border is gone (only the outer card border remains)
- [ ] PartyTicket patience bar still appears as a thin strip at the top edge
- [ ] PartyTicket empty state (wait for a quiet moment) shows the dashed inner area inside a card
- [ ] MiniGrid card wraps its grid content without extra whitespace below

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/MiniGrid.tsx
git commit -m "feat: harmonise MiniGrid to shared card shell"
```
