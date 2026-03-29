# Tablet Responsiveness Design

**Date:** 2026-03-21
**Status:** CANCELLED — 2026-03-29
**Project:** service-compris
**Scope:** Tablet breakpoint (768px–1024px) responsive layout

> **CANCELLED.** The game has moved to a full-screen single-column layout that works well enough on tablets. The RightPanel two-column approach is no longer aligned with the current design. No further work planned.

---

## Problem

The current UI is desktop-first with a single `lg:` (1024px) breakpoint. Below 1024px, all panels collapse into a single vertical stack with no tablet-specific design. Several components have hardcoded dimensions that cause overflow or wasted space. The goal is to make the game playable on tablet-sized screens.

---

## Layout Structure (App.tsx)

A new `md:` breakpoint introduces a two-column grid for tablet:

| Breakpoint | Layout |
|---|---|
| `< 768px` | Single column (unchanged) |
| `768px–1023px` | Two columns: Left 45% / Right 55% via RightPanel |
| `≥ 1024px` | Existing 3-column `lg:grid-cols-12` (unchanged) |

**Left column (45%):** The existing `flex flex-col border-r border-[#141414]` wrapper containing Podium + QueuePreview — structure and borders preserved as-is at `md:`.
**Right column (55%):** RightPanel component with tabbed switcher — only rendered at `md:`.
**Desktop columns (lg:):** FloorplanGrid and BookingList columns rendered directly in App.tsx as today. RightPanel is not rendered at `lg:`.
**ActivityLog overlay:** The existing `AnimatePresence` / `motion.div` overlay and its `showLogs` toggle are only rendered at `lg:`. At `md:`, the log toggle button in TopBar is hidden, and the Log tab in RightPanel renders `ActivityLog` content directly (no overlay wrapper, no `showLogs` state involved).

Grid class change in App.tsx:
```
grid-cols-1 md:grid-cols-[45%_55%] lg:grid-cols-12
```

Conditional rendering strategy (not CSS visibility):
- `{isMd && !isLg && <RightPanel ... />}` in the right column slot at `md:`
- `{isLg && <FloorplanGrid />}`, `{isLg && <BookingList />}` in their existing column slots at `lg:`
- `{isLg && showLogs && <motion.div>...</motion.div>}` for the ActivityLog overlay at `lg:`
- Use Tailwind's `useBreakpoint` pattern or a lightweight `window.matchMedia` hook to derive `isMd` / `isLg` booleans, or use CSS `hidden md:block lg:hidden` / `hidden lg:block` on wrapper divs — implementation choice left to developer, but the conditional must be clean and not fight Framer Motion's `AnimatePresence`.

---

## New Component: RightPanel

**File:** `src/components/RightPanel.tsx`

Owns a three-tab switcher for the tablet layout. Tab state is local to this component.

### Props

```ts
interface RightPanelProps {
  gameState: GameState       // passed from App.tsx, forwarded to BookingList
  inGameMinutes: number      // passed from App.tsx, forwarded to BookingList
  formatTime: (m: number) => string  // passed from App.tsx, forwarded to BookingList
  toggleArrived: (id: string) => void // passed from App.tsx, forwarded to BookingList
  logs: string[]             // passed from App.tsx, forwarded to ActivityLog
}
```

### Structure

```
[Floor] [Bookings] [Log]          ← tab bar
──────────────────────────────
<FloorplanGrid />                 ← when activeTab === 'floor'
<BookingList ... />               ← when activeTab === 'bookings'
<ActivityLog logs={logs} />       ← when activeTab === 'log' (no overlay, no showLogs)
```

- **Tab state:** `useState<'floor' | 'bookings' | 'log'>('floor')` — defaults to Floor
- **Tab bar styling:** Active tab: `bg-[#141414] text-white`. Inactive tab: `bg-[#E4E3E0] text-[#141414]`. Use existing Tailwind arbitrary value syntax throughout — no new CSS variables.
- **Content area:** `flex-1 overflow-hidden` — fills remaining height, each child component manages its own internal scroll

---

## Component Fixes

Targeted Tailwind class changes only — no logic changes.

### Podium.tsx
- Outer card padding: `p-6` → `p-4 md:p-6`
- Guest name: `text-3xl` → `text-xl md:text-3xl`
- Chat box: replace `min-h-[200px] max-h-[300px]` with `flex-1 min-h-0 overflow-y-auto`. The `min-h-0` is required because the parent flex container needs an explicit minimum to allow `flex-1` to shrink correctly and engage overflow clipping.

### QueuePreview.tsx
- Circle size: `w-10 h-10` → `w-8 h-8 md:w-10 md:h-10`

### TopBar.tsx
- Metrics gap: `gap-8` → `gap-4 md:gap-8`
- Metric values: `text-xl` → `text-base md:text-xl`
- Log toggle button: add `hidden lg:block` — not shown at tablet since the Log tab in RightPanel replaces it
- Right-side time multiplier controls: out of scope for this change — not addressed

---

## What Is Not Changing

- Mobile layout (< 768px)
- Desktop layout (≥ 1024px) — fully preserved, zero regressions
- `QueuePreview` fixed height (`h-40 shrink-0`) and horizontal scroll behavior
- TopBar right-side time multiplier button group (may be cramped at narrow tablet widths — known limitation, deferred)
- Component logic, game state, hooks — untouched
- FloorplanGrid, BookingList, ActivityLog internals

---

## Files Affected

| File | Change |
|---|---|
| `src/App.tsx` | Add `md:` grid, conditionally render RightPanel at `md:` only, suppress overlay + log button at `md:` |
| `src/components/RightPanel.tsx` | **New file** — tab switcher for tablet right column |
| `src/components/Podium.tsx` | Responsive padding, font size, chat box height fix |
| `src/components/QueuePreview.tsx` | Responsive circle size |
| `src/components/TopBar.tsx` | Responsive gap, font size, hide log toggle at `md:` |
