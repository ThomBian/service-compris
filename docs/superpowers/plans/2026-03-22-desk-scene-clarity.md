# Desk Scene Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three desk-view clarity problems — MiniGrid/PartyTicket column order, Maître D' visual identity, and guest approach animation with dialogue speech bubbles.

**Architecture:** Three independent file changes: `DeskTools.tsx` reorders its grid columns, `PartyTicket.tsx` removes its chat history block, and `DeskScene.tsx` gets a full replacement that adds Framer Motion, a bow tie on the Maître D' figure, an approach animation on arriving guests, and two in-flow speech bubbles showing the latest message from each side of the conversation.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Framer Motion (`motion/react`)

---

## File Map

| File | What changes |
|---|---|
| `src/components/desk/DeskTools.tsx` | Grid template + JSX child order |
| `src/components/desk/PartyTicket.tsx` | Remove chat history block (lines 85–107) |
| `src/components/scene/DeskScene.tsx` | Full replacement — Framer Motion import, `overflow-x-hidden`, Maître D' bow tie, guest approach animation, two speech bubbles |

---

## Task 1: Reorder DeskTools columns

**Files:**
- Modify: `src/components/desk/DeskTools.tsx`

- [ ] **Step 1: Make the change**

Replace the entire contents of `src/components/desk/DeskTools.tsx` with:

```tsx
import React from 'react';
import { BookingLedger } from './BookingLedger';
import { Clipboard } from './Clipboard';
import { PartyTicket } from './PartyTicket';
import { MiniGrid } from './MiniGrid';

export const DeskTools: React.FC = () => {
  return (
    <div className="h-full bg-[#E4E3E0] grid grid-cols-[auto_1.5fr_1fr_1fr] gap-4 p-4 overflow-hidden">
      <MiniGrid />
      <PartyTicket />
      <BookingLedger />
      <Clipboard />
    </div>
  );
};
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run lint`
Expected: no TypeScript errors

- [ ] **Step 3: Run tests to confirm no regressions**

Run: `npm run test`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/DeskTools.tsx
git commit -m "feat: reorder DeskTools columns — MiniGrid | PartyTicket | BookingLedger | Clipboard"
```

---

## Task 2: Remove chat history from PartyTicket

**Files:**
- Modify: `src/components/desk/PartyTicket.tsx:85-107`

- [ ] **Step 1: Remove the chat history block**

In `src/components/desk/PartyTicket.tsx`, delete lines 85–107 (the entire chat history `div`):

```tsx
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
```

Do not add `flex-1` or `min-h-0` anywhere else — the remaining content (ticket info + action buttons) fills available space naturally.

- [ ] **Step 2: Verify the build passes**

Run: `npm run lint`
Expected: no TypeScript errors

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/PartyTicket.tsx
git commit -m "feat: remove chat history from PartyTicket — dialogue moves to DeskScene"
```

---

## Task 3: Rewrite DeskScene with Maître D' bow tie, approach animation, and speech bubbles

**Files:**
- Modify: `src/components/scene/DeskScene.tsx` (full replacement)

Context for the implementer:
- `currentClient: Client | null` from `useGame()`
- `Client.chatHistory: ChatMessage[]` where `ChatMessage = { sender: 'maitre-d' | 'guest', text: string }`
- `Client.lastMessage: string` — always a string, may be empty on spawn (before `prepareClientForDesk` runs)
- `findLast` is available in all modern browsers; use it to get the most recent maitre-d message
- The Maître D' figure does NOT animate — only the current-party block slides in
- `overflow-hidden` on the root div must become `overflow-x-hidden` to allow speech bubbles to extend upward

- [ ] **Step 1: Replace the entire file**

Replace `src/components/scene/DeskScene.tsx` with:

```tsx
import React from 'react';
import { Users, DoorOpen, DoorClosed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { PhysicalState } from '../../types';

interface SpeechBubbleProps {
  text: string | undefined;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text }) => (
  <AnimatePresence>
    {text && (
      <motion.div
        key={text}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="relative bg-white border border-[#141414] rounded-lg px-2 py-1 text-[10px] max-w-[160px] truncate shadow-[2px_2px_0px_0px_rgba(20,20,20,1)] mb-1"
      >
        {text}
        <span
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '6px solid #141414',
          }}
        />
      </motion.div>
    )}
  </AnimatePresence>
);

interface DeskSceneProps {
  onSeatParty: () => void;
}

export const DeskScene: React.FC<DeskSceneProps> = ({ onSeatParty }) => {
  const { gameState: { currentClient, queue } } = useGame();
  const canSeat = currentClient?.physicalState === PhysicalState.AT_DESK;

  const maitreDMessage = currentClient?.chatHistory.findLast(m => m.sender === 'maitre-d')?.text;
  const guestMessage = currentClient?.lastMessage || undefined;

  return (
    <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-x-hidden">
      {/* Door */}
      <button
        onClick={canSeat ? onSeatParty : undefined}
        disabled={!canSeat}
        title={canSeat ? 'Seat this party' : 'No party to seat'}
        className={`flex flex-col items-center gap-1 transition-all ${
          canSeat
            ? 'cursor-pointer opacity-100 hover:scale-105'
            : 'cursor-default opacity-40'
        }`}
      >
        {canSeat ? <DoorOpen size={40} /> : <DoorClosed size={40} />}
        <span className="text-[9px] font-bold uppercase tracking-widest">Door</span>
      </button>

      {/* Maître D' */}
      <div className="flex flex-col items-center gap-1">
        <SpeechBubble text={maitreDMessage} />
        <div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-center justify-center text-white">
          <span className="text-base leading-none">◆</span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Maître D'</span>
      </div>

      {/* Current party at desk */}
      <AnimatePresence mode="wait">
        {currentClient ? (
          <motion.div
            key={currentClient.id}
            className="flex flex-col items-center gap-1 min-w-[60px]"
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <SpeechBubble text={guestMessage} />
            <div className="flex gap-1">
              {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
                <Users key={i} size={20} className="text-[#141414]" />
              ))}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {currentClient.knownFirstName || '???'}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="flex flex-col items-center gap-1 min-w-[60px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="opacity-20 text-[10px] uppercase tracking-widest">— empty —</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue */}
      <div className="flex items-end gap-2 flex-1 overflow-x-auto pb-1">
        {queue.length === 0 ? (
          <span className="text-xs italic opacity-30">Queue is empty</span>
        ) : (
          queue.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-0.5 shrink-0">
              <Users size={16} className="opacity-60" />
              <div
                className="w-1 rounded-full bg-emerald-500"
                style={{ height: Math.max(2, (c.patience / 100) * 20) }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run lint`
Expected: no TypeScript errors

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: all tests pass

- [ ] **Step 4: Visual verification in the browser**

Run: `npm run dev` and open `http://localhost:3000`

Check:
- DeskTools columns left-to-right: MiniGrid → PartyTicket → BookingLedger → Clipboard
- PartyTicket no longer shows a chat area; ticket info and action buttons fill the card
- Maître D' silhouette shows `◆` instead of "MD"
- When a new party arrives at the desk, the guest figures slide in from the right
- A speech bubble appears above the Maître D' showing their latest message
- A speech bubble appears above the guests showing their latest message
- Speech bubbles update (fade out old, fade in new) when a new message is exchanged
- No horizontal scrollbar or layout glitch during the approach animation

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: DeskScene — Maître D' bow tie, guest approach animation, dialogue speech bubbles"
```
