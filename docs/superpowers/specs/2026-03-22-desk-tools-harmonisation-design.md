# Desk Tools Harmonisation Design

**Date:** 2026-03-22
**Project:** service-compris
**Scope:** Visual harmonisation of the four DeskTools panel components

---

## Problem

The four desk tools — `BookingLedger`, `Clipboard`, `PartyTicket`, and `MiniGrid` — were built independently and each has a different container style:

- `BookingLedger`: no card background; serif italic `h3` title; dark-bordered inner table
- `Clipboard`: no card; tiny label header; faint border on content area
- `PartyTicket`: white card; `rounded-2xl`; `shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]`; bold serif title hidden inside
- `MiniGrid`: no wrapper at all; bare label above the grid

The result is a panel where each tool feels like it belongs to a different UI. The goal of this spec is to bring them into a single shared visual language.

---

## Design

### Shared Card Shell

Every tool is wrapped in the same container:

```
bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 h-full overflow-hidden
```

**Exception — `MiniGrid`:** `MiniGrid` lives in the `auto` column of the `DeskTools` grid, so it sizes to its content width. Its card does **not** use `h-full`; instead it uses `self-start` so the card wraps its content height rather than stretching to fill the row. The card shell for MiniGrid is:

```
bg-white border-2 border-[#141414] rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2 self-start overflow-hidden
```

This gives each tool the feel of a physical paper or document laid on the desk — consistent with the "Bureaucratic Hospitality" aesthetic.

### Shared Header

Every card starts with the same header pattern:

```tsx
<div className="flex items-center gap-1.5 shrink-0">
  <SomeIcon size={12} />
  <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Tool Name</span>
</div>
```

- Icon: Lucide, `size={12}`, inherits current text color
- Label: `text-[9px] font-bold uppercase tracking-widest opacity-50`
- The header does not change in size or weight between tools

### What Changes Per Tool

The intent for each tool is a **full replacement** of the outer container class string with the shared shell — not a targeted diff. This ensures all tokens (`border-2`, `rounded-xl`, shadow, padding) are consistent.

| Component | Container change | Header change | Notes |
|---|---|---|---|
| `BookingLedger` | Replace outer `div` with shared card shell. Remove inner `border border-[#141414] rounded-xl` scrollable div; move its `flex-1 overflow-y-auto` classes to a wrapping `<div>` directly around the `<table>` so scroll behaviour is preserved. | Replace `font-serif italic text-lg h3` + `<Book size={18} />` with shared header using `<Book size={12} />` | Scroll must be preserved on the table wrapper |
| `Clipboard` | Apply shared card shell; remove the inner `border border-[#141414]/20 rounded-lg` on the content area (keep the content itself). `gap-1` → `gap-2` (shared shell). | Normalise `ClipboardIcon` from `size={14}` to `size={12}`; apply shared label token | Inner border removal required — without it a double border appears |
| `PartyTicket` | **Active state:** full replacement with shared card shell. Notable changes: `rounded-2xl` → `rounded-xl`, `border` → `border-2`, shadow `6px` → `4px`, `p-4` → `p-3`, `flex-1 min-h-0` → `h-full` (both work in a grid cell context). Padding change from `p-4` to `p-3` is safe — the patience bar is `absolute` and bleeds to the card edge regardless, and the first child already has `pt-1`. **Empty state** (no `currentClient`): apply the shared card shell, replacing `border-dashed rounded-2xl`; keep the dashed border as an inner visual hint if desired. | Apply shared header with `<Users size={12} />`; remove existing `text-[10px] uppercase` label span | `flex-1 min-h-0` → `h-full` is intentional — grid children accept `h-full` |
| `MiniGrid` | Apply MiniGrid card shell (`self-start`, no `h-full`) — card sizes to grid content, not row height. | Normalise existing label to shared token | `self-start` prevents empty whitespace below the grid inside the card |

### What Does Not Change

- The interior content and logic of each tool (table rows, tabs, chat history, grid cells, question buttons)
- The `DeskTools` grid layout (`grid-cols-[1fr_1fr_1.5fr_auto]`)
- The `DeskTools` background (`bg-[#E4E3E0]`)
- All game logic, context hooks, and props

---

## Component File Map

| File | Change |
|---|---|
| `src/components/desk/BookingLedger.tsx` | Apply shared card shell; replace header |
| `src/components/desk/Clipboard.tsx` | Apply shared card shell; normalise header |
| `src/components/desk/PartyTicket.tsx` | Adjust shadow and border-radius to shared tokens; normalise header |
| `src/components/desk/MiniGrid.tsx` | Apply shared card shell; normalise header |
