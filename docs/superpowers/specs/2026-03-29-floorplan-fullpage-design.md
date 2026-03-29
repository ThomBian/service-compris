# Floorplan Full-Page View

**Date:** 2026-03-29
**Branch:** feat/street-scene-background

## Goal

When the player switches to the floorplan view, the grid should fill the entire screen below the TopBar. The current layout wastes ~70% of the screen on a decorative scene, leaving the grid tiny and cramped at the bottom. The core gameplay in this view is selecting seats — it deserves the full canvas.

## Layout Change

When `view === 'floorplan'`, `ScenePanel` renders nothing (zero height). `FloorplanGrid` expands to fill the full viewport below `TopBar`. When `view === 'desk'`, layout is unchanged.

In `ScenePanel.tsx`, the floorplan branch returns null or a zero-height element so `BottomPanel` / `FloorplanGrid` gets all available space.

## FloorplanGrid Structure

The header order is fixed across all states to preserve muscle memory — the grid always appears in the same vertical position.

```
TopBar (fixed, transparent overlay)
─────────────────────────────────────
⬡ Floorplan                          ← always present, title only, no subtitle
─────────────────────────────────────
[Party strip]                         ← seating mode only
  Maitre D' avatar | party icons (placed/empty) | party name (N/total) | Confirm | Refuse
─────────────────────────────────────
[Rush row]                            ← overtime + not seating only
  "Last Call —"  [Rush table 1]  [Rush table 2] …
─────────────────────────────────────
Grid (flex-1, centered)               ← always in same position
```

### State: Seating a party (`PhysicalState.SEATING`)

- Party strip is visible: Maitre D' icon, party member icons (filled green as seats are placed), party name with count, Confirm and Refuse buttons.
- Rush row is hidden.
- Grid has active ring (emerald glow).
- Auto-confirm fires 300ms after `selectedCells.length === partySize` (unchanged).

### State: Viewing / Overtime (not seating)

- Party strip is hidden.
- Rush row visible only when `isOvertime && occupiedPartyIds.length > 0`.
- Rush row sits directly below the header so the grid position stays fixed.
- Grid renders in greyscale/dimmed as before.

## Drag-to-Select

Allows the player to hold the pointer down and sweep across cells to select them in one gesture, rather than clicking each individually.

**Behaviour:**
- `pointerdown` on a cell → enters drag mode, selects/deselects that cell
- `pointermove` while pointer is held → selects or deselects each cell the pointer enters (same toggle direction as the initial cell)
- `pointerup` / `pointercancel` → exits drag mode
- Single click (no move) continues to work exactly as before
- `touch-action: none` on the grid wrapper to prevent scroll interference on mobile
- Auto-confirm at party size is unchanged (300ms timer)

**Toggle direction lock:** The first cell touched determines the direction — if it was unselected and gets selected, dragging over further cells selects them. If it was selected and gets deselected, dragging deselects. This prevents accidental mixed operations in a single gesture.

## Files Affected

- `src/components/ScenePanel.tsx` — return null for floorplan branch
- `src/components/floorplan/FloorplanGrid.tsx` — reorder header (title → party strip → rush row), add drag-to-select pointer event handlers
- No changes to `BottomPanel.tsx`, `App.tsx`, or game logic
