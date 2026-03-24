---
title: Tactile Party Ticket
date: 2026-03-24
status: approved
---

# Tactile Party Ticket

## Context

The current desk interaction relies on generic buttons: an ask-buttons grid (First Name, Last Name, Booking Time), a "Call Out Lie" menu (Party Size / Arriving Late / No Reservation), and a "Wait in Line" button. This spec replaces all of them with direct-click UI elements — the first sub-project of the broader tactile investigation system defined in `docs/specs/investigation/investigation-interaction.md`.

## Goal

- Remove all generic ask/accuse/wait buttons from the desk
- Replace with tactile ticket fields the player clicks directly to ask questions or trigger accusations
- Make the existing party group in the scene clickable for size accusations

---

## What is Removed

The following are deleted entirely from `PartyTicket`:

- The 3-button ask grid (First Name, Last Name, Booking Time)
- The "Call Out Lie" button and its submenu (Party Size / Arriving Late / No Reservation)
- The "Wait in Line" button and its `waitInLine` destructure from `useGame()` in `PartyTicket`
- The large `h3` name header and the `knownTime` line below it — the `TicketField` rows now display these values directly, removing the need for a separate header display
- The `isLate` "LATE ARRIVAL" badge from the guest header block — it is moved to display as a sub-label beneath the Arrival Time `TicketField` when `currentClient.isLate === true` (e.g. a small red `AlertCircle` + "LATE ARRIVAL" text below the field value)

The `waitInLine` mechanic is removed from the **UI only** due to buggy behaviour. The `waitInLine` function is **not** removed from `useDecisionActions`, `useGameEngine`, or `GameContext` — it stays as a dormant export until fixed or formally deleted in a later sub-project.

After this sub-project the only bottom action on `PartyTicket` is: **REFUSE** (full width). Seating remains handled by the door button in `DeskScene` (`onSeatParty`) — that button is unchanged. The player's positive flow is: investigate via ticket fields → seat via the door button. No accept/seat affordance is added to `PartyTicket`.

After this sub-project, no generic accusation, ask, or wait buttons exist on the desk.

---

## `PartyTicket` — New Layout

Three `TicketField` rows replace all removed buttons. The patience bar and "PARTY TICKET" label header stay at the top. The `isCaught` caught pill badge stays in the header row. Only the **REFUSE** button remains at the bottom.

### `TicketField` component

A new `TicketField` component renders each row. Its props:

```ts
interface TicketFieldProps {
  label: string;       // display label, e.g. "First Name"
  value: string | undefined; // undefined = not yet asked
  onAsk: () => void;         // called when empty field is clicked
  onAccuse: () => void;      // called when filled field is clicked
}
```

The three rows and their value sources:

| Field label | `value` source on `currentClient` | `onAsk` | `onAccuse` |
|---|---|---|---|
| First Name | `knownFirstName` (undefined if not asked) | `() => askQuestion('firstName')` | `() => callOutLie('reservation')` |
| Last Name | `knownLastName` (undefined if not asked) | `() => askQuestion('lastName')` | `() => callOutLie('reservation')` |
| Arrival Time | `knownTime !== undefined ? formatTime(knownTime) : undefined` | `() => askQuestion('time')` | `() => callOutLie('time')` |

**Both First Name and Last Name map to `callOutLie('reservation')`** — this is intentional. Either name, once known, is sufficient for the player to trigger a no-reservation accusation. The engine checks `client.type === SCAMMER` regardless of which name field was clicked.

**Semantic note — `callOutLie('reservation')`:** accuses the client of having no reservation. Engine evaluates via `client.type === SCAMMER`.

**Semantic note — `callOutLie('time')`:** accuses the client of arriving late. Engine evaluates via `client.isLate === true` (set when arrival is >30 minutes past booking time).

**Semantic note — Arrival Time field:** `askQuestion('time')` asks for the booking time — the time the reservation is for. "Arrival Time" is the player-facing label because the client arrives claiming a booking at that time. The ask drains patience identically to the other ask fields.

### Empty state (`value === undefined`)

- Dashed border, greyed-out placeholder (`_ _ _ _ _ _`)
- Hover: blue dashed border + blue background; 🔍 **Ask** badge appears flush-right on the label row (`flex justify-between` on label row, badge with `ml-auto`)
- Click → `onAsk()`

### Filled state (`value` is a string)

- Solid dark border, value displayed
- Hover: orange border + orange background; 👆 **Accuse** badge appears flush-right on the label row
- Click → `onAccuse()`
- `isCaught` does not affect field behaviour — filled fields remain clickable for accusation regardless
- No click guard is needed inside `TicketField` itself — the game engine handles redundant calls gracefully, same as the existing ask buttons

### Hover state implementation

Each `TicketField` tracks hover with a React `useState` boolean (`isHovered`), set via `onMouseEnter`/`onMouseLeave` on the outer `motion.div`. The badge is rendered inside `AnimatePresence` keyed to `'badge'`, conditionally on `isHovered`:

```tsx
<AnimatePresence>
  {isHovered && (
    <motion.span
      key="badge"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.7, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {value === undefined ? '🔍 Ask' : '👆 Accuse'}
    </motion.span>
  )}
</AnimatePresence>
```

### Motion

Each `TicketField` is a `motion.div` (import from `'motion/react'`):

- `whileHover={{ y: -1 }}` using Framer Motion's default spring
- On hover: `box-shadow: 2px 2px 0px 0px rgba(20,20,20,0.12)` (via Tailwind: `hover:shadow-[2px_2px_0px_0px_rgba(20,20,20,0.12)]`)

---

## `DeskScene` — Party Group

The existing party icons (one `Users` icon per `truePartySize`, already rendered in a `flex flex-wrap gap-1 max-w-[120px]` div) are wrapped in a new clickable `motion.div`:

- The wrapper must be `position: relative` to anchor the absolutely-positioned badge
- Hover: orange border + orange background + 👆 **Accuse — Size Lie** badge
- Badge positioning: `absolute top-0 -translate-y-full pb-1 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap` (same pattern as the speech bubble above it in the same component)
- `whileHover={{ y: -2 }}` + `hover:shadow-[2px_2px_0px_0px_rgba(20,20,20,0.12)]`
- Badge uses the same `AnimatePresence` + hover state pattern as `TicketField` (`isHovered` boolean, spring `stiffness: 400, damping: 20`)
- The parent `DeskScene` div already has `overflow-visible` — the wrapping `motion.div` must not set `overflow: hidden`
- The party group wrapper is only clickable when `currentClient?.physicalState === PhysicalState.AT_DESK`. When the client is in any other state (e.g. `SEATING`), the wrapper should be `pointer-events-none` and show no hover state.
- Click → `callOutLie('size')`

`DeskScene` currently only destructures `gameState` from `useGame()`. Add `callOutLie` to the destructure.

The `knownFirstName` label currently displayed under the party icons in `DeskScene` (`currentClient.knownFirstName || '???'`) is unchanged — it is a scene label, not part of the ticket interaction.

The party group wrapper is a **temporary scaffold** — Sub-project 2 (2D Avatars) will replace the `Users` icons and rewrap the interaction with proper silhouettes. The click target will migrate at that point.

No data model changes needed — `truePartySize` is already what's rendered.

---

## Out of Scope

- Party Size field on the ticket (Sub-project 2 — 2D Avatars)
- Allergy bubble accusation (Sub-project 4 — Dietary Mismatch)
- VIP exception logic (Sub-project 3 — Clipboard)
- Visual styling of the silhouettes beyond the existing `Users` icons (Sub-project 2)
- The door/seat button in `DeskScene` (unchanged)
- Guard states for zero-patience or terminal client states (deferred, same as existing code)
