# Tactile Party Ticket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all generic ask/accuse/wait buttons on the desk with direct-click ticket fields and a clickable party group for size accusations.

**Architecture:** A new `TicketField` component handles the empty/filled/hover interaction for each field row. `PartyTicket` is refactored to use three `TicketField` instances and drops all old buttons except REFUSE. `DeskScene` wraps the existing party icons in a clickable `motion.div` for the size accusation.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Framer Motion (`motion/react`)

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/components/desk/TicketField.tsx` | Create | Reusable field row: empty (ask) / filled (accuse) with hover animations |
| `src/components/desk/PartyTicket.tsx` | Modify | Remove all old buttons; add three `TicketField` rows + moved `isLate` badge |
| `src/components/scene/DeskScene.tsx` | Modify | Wrap party icons in clickable `motion.div`; add `callOutLie` from context |

No data model changes. No new tests (project has no component test infrastructure — existing `src/logic/__tests__/gameLogic.test.ts` covers pure logic only). Run `npm run test` as regression check after each task.

---

## Task 1: TicketField component

**Files:**
- Create: `src/components/desk/TicketField.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/desk/TicketField.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TicketFieldProps {
  label: string;
  value: string | undefined; // undefined = not yet asked (empty state)
  onAsk: () => void;         // called when empty field is clicked
  onAccuse: () => void;      // called when filled field is clicked
}

export const TicketField: React.FC<TicketFieldProps> = ({ label, value, onAsk, onAccuse }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isEmpty = value === undefined;

  return (
    <motion.div
      className={`cursor-pointer rounded-lg px-2 py-1.5 border-2 transition-colors ${
        isEmpty
          ? isHovered
            ? 'border-dashed border-blue-400 bg-blue-50'
            : 'border-dashed border-gray-300'
          : isHovered
            ? 'border-orange-400 bg-orange-50'
            : 'border-[#141414]'
      }`}
      whileHover={{ y: -1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isEmpty ? onAsk : onAccuse}
      style={isHovered ? { boxShadow: '2px 2px 0px 0px rgba(20,20,20,0.12)' } : undefined}
    >
      {/* Label row with badge flush right */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={`text-[8px] font-bold uppercase tracking-widest transition-colors ${
            isHovered ? (isEmpty ? 'text-blue-500' : 'text-orange-500') : 'opacity-40'
          }`}
        >
          {label}
        </span>
        <AnimatePresence>
          {isHovered && (
            <motion.span
              key="badge"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`text-[8px] font-bold rounded-full px-1.5 py-0.5 ${
                isEmpty
                  ? 'text-blue-500 bg-blue-100 border border-blue-300'
                  : 'text-orange-500 bg-orange-100 border border-orange-300'
              }`}
            >
              {isEmpty ? '🔍 Ask' : '👆 Accuse'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Value or placeholder */}
      {isEmpty ? (
        <span className="text-[13px] font-bold tracking-[3px] text-gray-300 font-mono select-none">
          _ _ _ _ _ _
        </span>
      ) : (
        <span className={`text-[14px] font-bold font-mono transition-colors ${isHovered ? 'text-orange-600' : ''}`}>
          {value}
        </span>
      )}
    </motion.div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Run existing tests to check for regressions**

Run: `npm run test`
Expected: all 68 tests pass, no failures

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/TicketField.tsx
git commit -m "feat: add TicketField component with ask/accuse hover states"
```

---

## Task 2: Refactor PartyTicket

**Files:**
- Modify: `src/components/desk/PartyTicket.tsx`

Remove: ask-buttons grid, Call Out Lie button + submenu (`showLieMenu` state), Wait In Line button + `waitInLine` destructure, `h3` name header + `knownTime` display, `isLate` badge from old header location.

Add: three `TicketField` rows, `isLate` badge below the Arrival Time field.

Imports to remove: `MessageSquare`, `Search`, `X` (re-add `X` for REFUSE button — it's still needed).

Wait — `X` is used by the REFUSE button, keep it. `MessageSquare` (Wait in Line) and `Search` (ask buttons) are no longer needed.

- [ ] **Step 1: Replace the entire file**

```tsx
// src/components/desk/PartyTicket.tsx
import React from "react";
import { Users, AlertCircle, X } from "lucide-react";
import { motion } from "motion/react";
import { useGame } from "../../context/GameContext";
import { formatTime } from "../../utils";
import { TicketField } from "./TicketField";

export const PartyTicket: React.FC = () => {
  const {
    gameState: { currentClient },
    askQuestion,
    callOutLie,
    handleDecision,
  } = useGame();

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
      {/* Patience bar */}
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

      {/* Header: label + caught badge */}
      <div className="flex items-center justify-between shrink-0 pt-0.5">
        <div className="flex items-center gap-1.5">
          <Users size={12} />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Party Ticket</span>
        </div>
        {currentClient.isCaught && (
          <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 flex items-center gap-1">
            <AlertCircle size={10} />
            CAUGHT
          </div>
        )}
      </div>

      {/* Ticket fields */}
      <div className="flex flex-col gap-2 flex-1">
        <TicketField
          label="First Name"
          value={currentClient.knownFirstName}
          onAsk={() => askQuestion('firstName')}
          onAccuse={() => callOutLie('reservation')}
        />
        <TicketField
          label="Last Name"
          value={currentClient.knownLastName}
          onAsk={() => askQuestion('lastName')}
          onAccuse={() => callOutLie('reservation')}
        />
        <div className="flex flex-col gap-0.5">
          <TicketField
            label="Arrival Time"
            value={currentClient.knownTime !== undefined ? formatTime(currentClient.knownTime) : undefined}
            onAsk={() => askQuestion('time')}
            onAccuse={() => callOutLie('time')}
          />
          {currentClient.isLate && (
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-1 px-2">
              <AlertCircle size={10} />
              LATE ARRIVAL
            </div>
          )}
        </div>
      </div>

      {/* Refuse button */}
      <div className="pt-2 border-t border-[#141414]/10">
        <button
          onClick={() => handleDecision()}
          className="w-full bg-red-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-red-700 transition-colors text-xs shadow-[0px_3px_0px_0px_rgba(185,28,28,1)] active:translate-y-px active:shadow-none"
        >
          <X size={14} />
          REFUSE
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Run existing tests to check for regressions**

Run: `npm run test`
Expected: all 68 tests pass

- [ ] **Step 4: Visual check**

Start the dev server: `npm run dev`

Verify in the browser:
- A guest is at the desk → three ticket field rows visible (First Name, Last Name, Arrival Time)
- All three start empty (dashed border, greyed placeholder)
- Hovering an empty field → blue highlight + 🔍 Ask badge pops in
- Clicking an empty field → patience drains, field fills with the answer
- Hovering a filled field → orange highlight + 👆 Accuse badge pops in
- Clicking a filled name field → accusation fires (caught or false accusation)
- Clicking the filled time field → time accusation fires
- LATE ARRIVAL badge appears below the Arrival Time field when client is late
- REFUSE button is full width at the bottom
- isCaught pill badge appears in header when caught
- No "Call Out Lie" button, no ask grid, no "Wait in Line" button anywhere

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/PartyTicket.tsx
git commit -m "feat: replace PartyTicket buttons with tactile TicketField rows"
```

---

## Task 3: DeskScene — clickable party group

**Files:**
- Modify: `src/components/scene/DeskScene.tsx`

Add `isPartyHovered` state at component level. Add `callOutLie` to the `useGame()` destructure. Wrap the existing party icons `div` (the `flex flex-wrap gap-1 max-w-[120px]` block) in a clickable `motion.div` with hover state and the Accuse badge.

- [ ] **Step 1: Add `isPartyHovered` state and `callOutLie` destructure**

At the top of `DeskScene`, find:
```tsx
const { gameState: { currentClient, queue } } = useGame();
```

Replace with:
```tsx
const { gameState: { currentClient, queue }, callOutLie } = useGame();
```

And add `isPartyHovered` state after the existing state declarations:
```tsx
const [isPartyHovered, setIsPartyHovered] = useState(false);
```

`AnimatePresence` is already imported in `DeskScene.tsx` line 3 — no import change needed.

- [ ] **Step 2: Wrap the party icons in a clickable motion.div**

Find the current party icons block inside the `currentClient` `motion.div` (around line 211):
```tsx
<div className="flex flex-wrap gap-1 max-w-[120px]">
  {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
    <Users key={i} size={20} className="text-[#141414]" />
  ))}
</div>
```

Replace with:
```tsx
{/* Party group — clickable for size accusation when client is at desk */}
{(() => {
  const isAccusable = currentClient.physicalState === PhysicalState.AT_DESK;
  return (
    <motion.div
      className={`relative rounded-lg p-1 border-2 transition-colors ${
        !isAccusable
          ? 'pointer-events-none border-transparent'
          : isPartyHovered
            ? 'border-orange-400 bg-orange-50 cursor-pointer'
            : 'border-transparent cursor-pointer'
      }`}
      whileHover={isAccusable ? { y: -2 } : undefined}
      onMouseEnter={() => { if (isAccusable) setIsPartyHovered(true); }}
      onMouseLeave={() => setIsPartyHovered(false)}
      onClick={isAccusable ? () => callOutLie('size') : undefined}
      style={isAccusable && isPartyHovered ? { boxShadow: '2px 2px 0px 0px rgba(20,20,20,0.12)' } : undefined}
    >
      <AnimatePresence>
        {isPartyHovered && isAccusable && (
          <motion.div
            key="party-badge"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute top-0 -translate-y-full pb-1 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap text-[8px] font-bold text-orange-500 bg-orange-100 border border-orange-300 rounded-full px-2 py-0.5"
          >
            👆 Accuse — Size Lie
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-wrap gap-1 max-w-[120px]">
        {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
          <Users
            key={i}
            size={20}
            className={isPartyHovered && isAccusable ? 'text-orange-500' : 'text-[#141414]'}
          />
        ))}
      </div>
    </motion.div>
  );
})()}
```

Note: the IIFE pattern avoids polluting the outer scope with `isAccusable`. Since `useState` is at the component level (`isPartyHovered`), this is valid — the IIFE is not a component or hook call, just an expression.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4: Run existing tests to check for regressions**

Run: `npm run test`
Expected: all 68 tests pass

- [ ] **Step 5: Visual check**

In the browser:
- A party is standing at the desk → hovering the group shows orange highlight + 👆 Accuse — Size Lie badge floating above
- Icons tint orange on hover
- Clicking the party group fires the size accusation (caught or false accusation)
- When a client is in SEATING state, the party group is non-interactive (no hover, no click)
- The `knownFirstName` label below the party icons is unchanged

- [ ] **Step 6: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: make party group clickable for size accusation in DeskScene"
```
