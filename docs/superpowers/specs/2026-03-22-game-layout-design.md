# Game Layout Design

**Date:** 2026-03-22
**Project:** service-compris
**Scope:** Full layout redesign — two-view model replacing the current 3-column layout

---

## Problem

The current UI is a 3-column layout where the Podium (desk interaction) and FloorplanGrid (seating puzzle) are always visible simultaneously. This contradicts the intended game design, which places the player in two distinct, mutually exclusive contexts: managing the door versus placing a party on the floorplan.

---

## Design

### Screen Structure

The layout is a full-height vertical stack with no width breakpoints:

```
┌─────────────────────────────────────────┐
│               TopBar                    │  always visible
├─────────────────────────────────────────┤
│                                         │
│             ScenePanel                  │  starting point: h-[40vh]
│   (content varies by view)             │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│             BottomPanel                 │  flex-1, fills remaining height
│   (content varies by view)             │
│                                         │
└─────────────────────────────────────────┘
```

```tsx
<div className="flex flex-col h-screen">
  <TopBar />
  <ScenePanel view={view} currentClient={currentClient} queue={queue} />
  <BottomPanel view={view} grid={grid} />
</div>
```

No `md:`, `lg:`, or `2xl:` breakpoints. Single layout for all screen sizes. The `h-[40vh]` is a starting point and can be adjusted during implementation.

---

### The Two Views

#### View A — Desk (default)

The player manages the door: investigating customers, checking the booking ledger, and deciding who gets in.

**ScenePanel renders `<DeskScene>`:**
A 2D side-view of the entrance. From left to right:
- The restaurant **Door** — clickable to commit to seating the current party (see View Transition). Visually inert when no party is at the desk.
- The **Maître D'** figure
- The **Desk / Podium** with the current party standing at it
- The **Queue** extending to the right

Minimum required props: `currentClient`, `queue`, `onSeatParty` callback.

**BottomPanel renders `<DeskTools>`:**
The player's physical tools laid out as a panel:
- **Booking Ledger** — reservation list for tonight
- **Clipboard** — tabs for Menu, VIPs, Banned List. Interaction behavior (clicking to accuse) is governed by `docs/specs/investigation/investigation-interaction.md`.
- **Party Ticket** — fills out as the player asks questions during chat
- **Mini Grid** — a read-only, passive snapshot of the current floorplan state. Only renders `EMPTY` and `OCCUPIED` cell states; `SELECTED` is never shown here since no painting session is active in View A.

The exact spatial arrangement of tools within `DeskTools` is intentionally loose at this stage and will be refined in a dedicated spec.

---

#### View B — Floorplan (seating mode)

The player places the current party onto the restaurant grid. **There is no Cancel — the player must resolve the seating to return to View A.** The game clock keeps ticking while in View B; queue patience continues to drain.

**ScenePanel renders `<FloorplanScene>`:**
A 2D side-view of the dining room. From left to right:
- The **Maître D'** figure
- The **Current party** — individual members highlight progressively as they are placed on the grid, giving the player a live count of remaining seats to fill
- **Seated guests** at tables throughout the scene

**BottomPanel renders `<FloorplanGrid>`:**
The interactive NxN seating grid. Painting mechanics are defined in `docs/specs/layout/floor-plan-grid.md`.

---

### View Transition

**View state** lives in `App.tsx`:

```ts
const [view, setView] = React.useState<'desk' | 'floorplan'>('desk');
```

**Entering View B — the Door click:**
- The Door in `DeskScene` is clickable only when `currentClient?.physicalState === 'AT_DESK'` (a party is present at the desk).
- Clicking the Door **replaces the Seat Party button entirely** — it is the one and only trigger to commit to seating the current party. There is no separate Seat button.
- Clicking the Door calls `seatParty()` from `GameContext` (which transitions the client to `SEATING`) and sets `view = 'floorplan'`.
- The Door is visually inert at all other times.

**Returning to View A:**
View B has no back button and no Cancel. Return is triggered exclusively by the three floorplan resolutions:

1. **Perfect fit** — all party members placed; auto-locks cells to `OCCUPIED` and returns to View A.
2. **Partial confirm** — player places fewer seats than the party size and clicks the Crop Party button; applies the exponential rating penalty and returns to View A.
3. **Forced refuse** — when the player judges there is no valid placement (grid is too full), a visible "Refuse Party" button in View B allows them to refuse the seated party and return to View A. Detection is manual — the player decides, not the system. This calls a dedicated `refuseSeatedParty()` action in `GameContext` (new action required — see note below). The penalty is a heavy rating hit: the player committed to seating this party by clicking the Door, so refusing after acceptance is treated as a severe frustration event, regardless of whether the reason is legitimate.

Each resolution calls back into `GameContext` and sets `view = 'desk'`.

> **Note on `GameContext` changes:** The "Forced refuse" path requires a new `refuseSeatedParty()` action in `GameContext`. This is the only state management addition required by this layout redesign. The existing `cancelSeating` action (which reverts the client to `AT_DESK` with no penalty) is no longer reachable from the UI and should be removed.

**Transition animation:**
`BottomPanel` content swaps with a cross-fade using Framer Motion `AnimatePresence`. In `ScenePanel`, the **Maître D' figure persists in place** across both views (no fade). The surrounding scene elements (Door/Queue in View A; seated guests in View B) cross-fade independently.

---

### Component File Structure

```
src/
  App.tsx                          # view state, mounts layout shell
  components/
    TopBar.tsx                     # unchanged
    ScenePanel.tsx                 # scene wrapper — renders DeskScene or FloorplanScene
    BottomPanel.tsx                # panel wrapper — renders DeskTools or FloorplanGrid
    scene/
      DeskScene.tsx                # 2D side-view: Door, Maître D', Desk, Party, Queue
      FloorplanScene.tsx           # 2D side-view: Maître D', party highlights, seated guests
    desk/
      DeskTools.tsx                # layout container for tools + mini-grid
      BookingLedger.tsx            # reservation list
      Clipboard.tsx                # menu / VIP / banned list tabs (see investigation-interaction.md)
      PartyTicket.tsx              # fills out during chat
      MiniGrid.tsx                 # read-only passive floorplan snapshot (EMPTY/OCCUPIED only)
    floorplan/
      FloorplanGrid.tsx            # interactive seating grid (refactored from current)
```

---

### Components Removed

| Component | Disposition |
|---|---|
| `Podium.tsx` | Replaced by `DeskScene.tsx` + `DeskTools.tsx` |
| `BookingList.tsx` | Absorbed into `BookingLedger.tsx` |
| `QueuePreview.tsx` | Absorbed into `DeskScene.tsx` |
| `RightPanel.tsx` | Deleted — tablet tab pattern no longer applies |
| `ActivityLog.tsx` | Deferred — out of scope for this layout redesign |

---

### Superseded Specs

- `docs/superpowers/specs/2026-03-21-tablet-responsiveness-design.md` — superseded by this design. Archive only; do not implement.
- `docs/specs/layout/floor-plan-grid.md` — two rules are superseded:
  1. The **Cancel** resolution (section 3) is removed — there is no escape from View B.
  2. The **Undo** rule (section 2) states "clicking any SELECTED cell instantly clears the entire current selection." The current implementation instead toggles a single cell (deselects only the clicked cell). The spec should be updated to match the implementation.

---

## What Is Not Changing

- `TopBar.tsx` internals and props
- `FloorplanGrid.tsx` game logic and painting mechanics
- `GameContext.tsx` and all hooks — minimal change: add `refuseSeatedParty()`, remove `cancelSeating()`
- `src/types.ts`, `src/constants.ts`, `src/logic/gameLogic.ts`
- The `ActivityLog` feature (deferred, out of scope)
- The visual aesthetic and Tailwind color palette
