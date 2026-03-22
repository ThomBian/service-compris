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

`DeskTools.tsx` changes its grid from:
```
grid-cols-[1fr_1fr_1.5fr_auto]
```
to:
```
grid-cols-[auto_1.5fr_1fr_1fr]
```

Column order changes from `BookingLedger | Clipboard | PartyTicket | MiniGrid` to:

**`MiniGrid | PartyTicket | BookingLedger | Clipboard`**

- MiniGrid (leftmost, `auto` width) aligns with the Door above it in DeskScene.
- PartyTicket sits immediately right of MiniGrid, spatially linking the floorplan and the current party.
- BookingLedger and Clipboard move to the right as reference tools.

No changes to any individual tool component.

---

### 2. Maître D' Visual Redesign

The Maître D' figure in `DeskScene.tsx` gets a uniform detail that distinguishes it from guest icons.

**Current:**
```tsx
<div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-end justify-center text-white text-xs pb-1">
  MD
</div>
```

**New:** Same silhouette shape, but the "MD" text is replaced with a white bow tie rendered in CSS — two small white triangles forming a bow tie shape, positioned at the collar area. Implementation: two `div` elements with `border` tricks or a `◆` character in white at an appropriate size.

The label below the figure stays: `Maître D'`.

---

### 3. Guest Approach Animation

When `currentClient` changes (a new party reaches `PhysicalState.AT_DESK`), the party figures in DeskScene animate in from the right rather than appearing instantly.

- The guest figures wrapper is a `motion.div` keyed on `currentClient.id`
- Initial state: `x: 120, opacity: 0`
- Animate to: `x: 0, opacity: 1`
- Transition: spring (`stiffness: 200, damping: 20`)
- Uses `AnimatePresence` (already imported in the project)
- The Maître D' figure does not move

---

### 4. Dialogue Speech Bubbles in DeskScene

Two speech bubbles replace the chat history. Both live in `DeskScene.tsx`.

**Maître D' bubble** — shown above the Maître D' figure:
- Content: last entry in `currentClient.chatHistory` where `sender === 'maitre-d'`
- Hidden when no such message exists

**Guest bubble** — shown above the party figures:
- Content: `currentClient.lastMessage`
- Hidden when `currentClient` is null

**Visual treatment** (both bubbles):
- White rounded pill, `border border-[#141414]`, small `shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]`
- Small downward-pointing CSS triangle pointer at the bottom centre
- `text-[10px]` font, `max-w-[160px]`, truncated with ellipsis if overflowing
- Fade in/update with Framer Motion `opacity: 0 → 1`, `duration: 0.15s`, keyed on message text

Both bubbles are positioned using a `relative` wrapper around each figure, with the bubble as `absolute bottom-full mb-1`.

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
| `src/components/desk/DeskTools.tsx` | Change grid template and column order |
| `src/components/scene/DeskScene.tsx` | Maître D' bow tie detail; guest approach animation; two speech bubbles |
| `src/components/desk/PartyTicket.tsx` | Remove chat history block |

---

## What Does Not Change

- All game logic, context hooks, and action handlers
- `chatHistory` data model and population
- ScenePanel height (`25vh`)
- All other DeskTools components (BookingLedger, Clipboard, MiniGrid)
- FloorplanScene, FloorplanGrid
