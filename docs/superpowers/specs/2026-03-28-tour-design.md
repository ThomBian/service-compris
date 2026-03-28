# In-Product Tour — Design Spec

**Date:** 2026-03-28
**Status:** Approved

---

## Overview

A spotlight-based quick tour that runs on first launch and is re-accessible via a `?` button in the TopBar. The tour freezes the game clock, highlights 4 UI regions one at a time with a tooltip, and can be skipped at any step.

---

## Decisions

| Question | Decision |
|---|---|
| Style | Spotlight overlay (SVG mask punching a hole over the target element) |
| Trigger | Auto on first launch (localStorage) + `?` in TopBar during game |
| Clock | Frozen (forced `timeMultiplier=0`) for the duration of the tour |
| Steps | 4: TopBar → Queue → Desk tools → Floorplan |
| HowToPlay modal | Retired — tour replaces it entirely |

---

## New Files

### `src/tour/tourSteps.ts`

Config array of 4 steps:

```ts
interface TourStep {
  target: string;            // matches data-tour="…" on the DOM element
  title: string;
  tooltip: string;
  view: 'desk' | 'floorplan';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'topbar',
    title: 'Your Stats',
    tooltip: 'Survive from 19:30 to 23:30. Keep your star rating up and don\'t go broke.',
    view: 'desk',
  },
  {
    target: 'queue',
    title: 'The Queue',
    tooltip: 'Customers wait outside. Too slow and they storm out — tanking your rating.',
    view: 'desk',
  },
  {
    target: 'desk-tools',
    title: 'The Desk',
    tooltip: 'Ask questions (blue). Call out lies (orange). Accept, refuse, or seat the party.',
    view: 'desk',
  },
  {
    target: 'floorplan',
    title: 'The Floorplan',
    tooltip: 'Select cells to assign a table. Fit the whole party, or crop them smaller for a penalty.',
    view: 'floorplan',
  },
];
```

### `src/hooks/useTour.ts`

Manages tour state. Exposes:

- `isTourActive: boolean`
- `currentStep: number` (0–3)
- `startTour()` — sets active, marks localStorage key as seen
- `nextStep()` — advances step; calls `skipTour()` when past last step
- `skipTour()` — ends tour

First-launch logic: caller checks `localStorage.getItem('service-compris-tour-seen')` and calls `startTour()` if absent.

### `src/components/TourOverlay.tsx`

Renders in a React portal on `document.body`. Props: `step`, `onNext`, `onSkip`.

`GameContent` watches `currentStep` and calls `setView(TOUR_STEPS[currentStep].view)` whenever the step changes — `TourOverlay` has no knowledge of the view.

**Spotlight rendering:**
- Full-viewport SVG with a mask — white rect covering everything, black rounded-rect punched over the target bounding box
- Fill the SVG with `rgba(0,0,0,0.7)` using `mask="url(#tour-hole)"`
- Target found via `document.querySelector('[data-tour="<step.target>"]')`
- Position re-computed in `useEffect` after step change, inside a `requestAnimationFrame` (waits for view transition to complete)
- `ResizeObserver` on `window` keeps position accurate on resize

**Tooltip:**
- Positioned div, below the hole by default; flips above if hole bottom > 60% of viewport height
- Shows step title, tooltip text, step counter ("2 of 4"), and "Next →" / "Done" button
- "Skip" button fixed top-right of the overlay

---

## Modified Files

### `src/App.tsx`

- Add `useTour()` hook at `App` level (outside `GameProvider` so it persists across resets)
- Pass `isTourActive` and `startTour` into `GameContent`
- In `GameContent`:
  - `useEffect`: if `!localStorage.getItem('service-compris-tour-seen')` → `startTour()` after first render
  - When `isTourActive`: call `setTimeMultiplier(0)`
  - Suppress the "Paused / Click to resume" overlay: add `&& !isTourActive` to its render condition
  - When tour ends (`skipTour`): call `setTimeMultiplier(1)` (or `3` on Hell difficulty)
- Remove `showHelp` state and `HowToPlay` import/usage

### `src/components/TopBar.tsx`

- Rename `onHelpClick` prop to `onTourClick`
- The `?` icon button calls `onTourClick`
- Add `data-tour="topbar"` to the stats container div

### `src/components/scene/DeskScene.tsx`

- Add `data-tour="queue"` to the customer avatar + patience bar container

### `src/components/desk/DeskTools.tsx`

- Add `data-tour="desk-tools"` to the root wrapper div

### `src/components/floorplan/FloorplanGrid.tsx`

- Add `data-tour="floorplan"` to the grid container div

### `src/components/HowToPlay.tsx`

- Deleted

---

## Tour Flow

```
gameStarted = true
  GameContent mounts
  useEffect → localStorage check → startTour() if first time
    isTourActive = true
    setTimeMultiplier(0)
    suppress pause overlay
    TourOverlay renders (step 0: topbar, view: desk)

  Player clicks Next → step 1 (queue, view: desk)
  Player clicks Next → step 2 (desk-tools, view: desk)
  Player clicks Next → step 3 (floorplan, view: floorplan)
    GameContent switches view to 'floorplan'
    TourOverlay re-reads getBoundingClientRect after rAF
  Player clicks Done (or Skip at any point)
    skipTour()
    setTimeMultiplier(1) [or 3 on Hell]
    clock unfreezes
```

---

## localStorage Keys

| Key | Value | Purpose |
|---|---|---|
| `service-compris-tour-seen` | `"true"` | Suppress auto-launch on subsequent games |

---

## Out of Scope

- Animated transitions between spotlight steps
- Mobile-specific tooltip positioning
- Tour progress persistence across page reloads
