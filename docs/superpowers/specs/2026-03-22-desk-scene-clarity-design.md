# Desk Scene Clarity Design

**Date:** 2026-03-22
**Project:** service-compris
**Scope:** Three UI clarity improvements to the DeskScene and DeskTools panel

---

## Problem

Three player-facing issues reduce clarity in the desk view:

1. **MiniGrid placement** — MiniGrid sits at the far right of DeskTools, visually disconnected from the Door and floorplan concept it represents.
2. **PartyTicket disconnect** — PartyTicket is separated from the party figures in DeskScene; the player struggles to link the ticket to the people standing at the desk.
3. **Maître D' confusion** — The Maître D' silhouette looks identical to a guest figure; the player doesn't immediately recognise it as their avatar. There is no animation or dialogue feedback when a new party arrives.

---

## Design

### 1. DeskTools Column Reorder

`DeskTools.tsx` changes its grid template from:
```
grid-cols-[1fr_1fr_1.5fr_auto]
```
to:
```
grid-cols-[auto_1.5fr_1fr_1fr]
```

And the JSX children reorder to match:
```tsx
<MiniGrid />
<PartyTicket />
<BookingLedger />
<Clipboard />
```

Column order becomes: **`MiniGrid | PartyTicket | BookingLedger | Clipboard`**

- MiniGrid (leftmost, `auto` width) aligns with the Door above it in DeskScene.
- PartyTicket sits immediately right of MiniGrid, spatially linking the floorplan and the current party.
- BookingLedger and Clipboard move to the right as reference tools.

No changes to any individual tool component.

---

### 2. Maître D' Visual Redesign

The Maître D' figure in `DeskScene.tsx` gets a bow tie detail that distinguishes it from guest icons.

**Current:**
```tsx
<div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-end justify-center text-white text-xs pb-1">
  MD
</div>
```

**New:** Same silhouette shape, but the "MD" text is replaced with a white `◆` character (preferred) rendered at `text-[10px]` in the collar area. A CSS border-triangle approach is an acceptable alternative if the unicode character looks poor in the browser. The label below the figure stays: `Maître D'`.

---

### 3. Guest Approach Animation

When `currentClient` changes (a new party reaches `PhysicalState.AT_DESK`), the party figures in DeskScene animate in from the right rather than appearing instantly.

- Requires adding `import { motion, AnimatePresence } from 'motion/react'` to `DeskScene.tsx` (not currently imported there)
- Also replace `overflow-hidden` with `overflow-x-hidden` on the `DeskScene` root div — the current `overflow-hidden` would clip speech bubbles that extend upward above the figure wrappers
- `AnimatePresence` wraps only the current-party block (not the queue). The guest figures wrapper is a `motion.div` keyed on `currentClient.id`:

```tsx
<AnimatePresence mode="wait">
  {currentClient && (
    <motion.div
      key={currentClient.id}
      className="flex flex-col items-center gap-1 min-w-[60px]"
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* speech bubble + guest figures */}
    </motion.div>
  )}
</AnimatePresence>
```

- Initial state: `x: 120, opacity: 0`
- Animate to: `x: 0, opacity: 1`
- Transition: spring (`stiffness: 200, damping: 20`)
- The Maître D' figure does not move

---

### 4. Dialogue Speech Bubbles in DeskScene

Two speech bubbles replace the chat history. Both live in `DeskScene.tsx`.

**Maître D' bubble** — shown above the Maître D' figure:
- Content: most recent entry in `currentClient.chatHistory` where `sender === 'maitre-d'`
- Use `chatHistory.findLast(m => m.sender === 'maitre-d')` (or `[...chatHistory].reverse().find(...)` as a fallback)
- Hidden when `currentClient` is null, or when no maitre-d message exists yet

**Guest bubble** — shown above the party figures:
- Content: `currentClient.lastMessage`
- Hidden when `currentClient` is null, or when `currentClient.lastMessage` is an empty string

**Visual treatment** (both bubbles):
- White rounded pill, `border border-[#141414]`, small `shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]`
- Small downward-pointing CSS triangle pointer at the bottom centre
- `text-[10px]` font, `max-w-[160px]`, truncated with ellipsis if overflowing
- Fade in/update with Framer Motion `opacity: 0 → 1`, `duration: 0.15s`, keyed on message text

**Positioning:** Bubbles are placed as **in-flow elements** above each figure, not as `absolute` positioned layers. Each figure group becomes a `flex flex-col items-center` wrapper with the bubble as the first child (above the silhouette). Since the parent uses `items-end`, taller wrappers extend upward naturally — no additional vertical overflow change is needed beyond the `overflow-x-hidden` already specified in Section 3.

```tsx
<div className="flex flex-col items-center gap-1">
  {/* bubble first — renders above the figure */}
  <SpeechBubble text={...} />
  {/* figure below */}
  <div className="w-10 h-14 ...">...</div>
  <span>Maître D'</span>
</div>
```

**Speech bubble animation:** Each bubble is a `motion.div` keyed on the message text, fading in with Framer Motion:

```tsx
<AnimatePresence>
  {text && (
    <motion.div
      key={text}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="..."
    >
      {text}
    </motion.div>
  )}
</AnimatePresence>
```

**No speech bubble appears when `currentClient` is null.**

---

### 5. PartyTicket Chat Removal

The chat history block in `PartyTicket.tsx` is removed entirely:

```tsx
{/* Chat history — REMOVED */}
<div className="flex-1 min-h-0 overflow-y-auto bg-[#f9f9f9] p-3 rounded-xl border border-[#141414] flex flex-col gap-2 font-mono text-xs custom-scrollbar">
  ...
</div>
```

The `flex-1 min-h-0` that was on the chat block is not transferred elsewhere — the ticket info and action buttons now fill the available space naturally. The patience bar, guest header, question buttons, lie menu, and decision buttons are unchanged.

`chatHistory` remains in the data model and game logic — it is simply no longer rendered.

---

## Component File Map

| File | Change |
|---|---|
| `src/components/desk/DeskTools.tsx` | Change grid template and reorder JSX children |
| `src/components/scene/DeskScene.tsx` | Add Framer Motion import; Maître D' bow tie detail; guest approach animation; two in-flow speech bubbles |
| `src/components/desk/PartyTicket.tsx` | Remove chat history block |

---

## What Does Not Change

- All game logic, context hooks, and action handlers
- `chatHistory` data model and population
- ScenePanel height (`25vh`)
- All other DeskTools components (BookingLedger, Clipboard, MiniGrid)
- FloorplanScene, FloorplanGrid
