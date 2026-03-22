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

| Component | Container change | Header change |
|---|---|---|
| `BookingLedger` | Add shared card shell; remove inner bordered div | Replace `font-serif italic text-lg h3` with small caps label |
| `Clipboard` | Add shared card shell | Header already close — normalise to shared token |
| `PartyTicket` | Change `rounded-2xl` → `rounded-xl`; change shadow from `6px` to `4px` offset | Remove existing label; apply shared header |
| `MiniGrid` | Add shared card shell | Already uses small caps label — normalise to shared token |

### What Does Not Change

- The interior content and logic of each tool (table rows, tabs, chat, grid cells)
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
