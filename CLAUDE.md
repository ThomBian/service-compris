# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # Type-check (tsc --noEmit)
npm run test      # Run unit tests (Vitest, Node env)
npm run test:watch  # Watch mode for development
npm run clean     # Remove dist/
```

## Architecture

This is a browser-based restaurant management game built with React 19 + Vite + TypeScript + Tailwind CSS 4.

### State Management

All game state flows through a single `GameContext` (`src/context/GameContext.tsx`), which wraps `useGameEngine` — a hook that composes all game subsystems:

```
useGameEngine
  ├── useGameClock          # 1s real-time tick = 1 in-game minute
  ├── useClientSpawner      # Generates walk-ins and reservations
  ├── useQueueManager       # Moves clients from queue → desk
  ├── useQuestionActions    # "Ask question" interaction
  ├── useAccusationActions  # "Call out lie" interaction
  ├── useDecisionActions    # Accept / Refuse / Seat a party
  └── useReservationActions # Toggle reservation arrival status
```

Components receive action functions from context — they never call `setState` directly.

### Core Data Model (`src/types.ts`)

- **Client** has two layers: hidden truth (`actualSize`, `actualTime`, `actualIdentity`) vs. what they claim. The game is about detecting mismatches.
- **ClientType:** `WALK_IN | LEGITIMATE | SCAMMER` — determines spawn behavior and lie probability.
- **PhysicalState:** `IN_QUEUE → AT_DESK → SEATING → ACCEPTED | REFUSED | STORMED_OUT`
- **GameState** holds the queue array, a `4×4` grid of `CellState`, cash, rating, morale, and an activity log.

### Game Logic (`src/logic/gameLogic.ts`)

Contains pure functions for:
- `createInitialGrid()` — empty 4×4 `CellState` grid
- `generateClientData()` — spawns clients with probabilistic lie assignment (Scammers fake identity, Legitimates have 30% size-lie chance)
- `prepareClientForDesk()` — transitions a client with a contextual greeting

### UI Layout (`src/App.tsx`)

Three-column layout:
- **Left:** `Podium` — active customer interaction (patience bar, dialogue, action buttons)
- **Center:** `FloorplanGrid` — clickable 4×4 seating grid
- **Right:** `BookingList` — upcoming reservations with arrival toggle
- **Overlay:** `ActivityLog` — slides in from right
- **Top:** `TopBar` — clock, rating, cash, morale, time-multiplier controls

### Key Constants (`src/constants.ts`)

- Game runs 19:30–23:30 (`START_TIME = 1170` minutes from midnight)
- `TICK_RATE = 1000ms` per in-game minute
- Meal duration: 30 min base + 20 min per extra guest
- `GRID_SIZE = 4`

### Path Alias

`@/*` resolves to the project root (not `src/`). Use `@/src/...` for src imports.

## Code style

- **Early returns:** Write functions with guard clauses and early `return`s instead of deep `if`/`else` nesting, long `else` chains, or `switch` statements when the logic is a sequence of mutually exclusive outcomes. Handle invalid or terminal cases first; leave the main path at the bottom.

## Docs

Design intent lives in `docs/`:
- `docs/GAME-CONCEPT.md` — core gameplay loop and win conditions
- `docs/specs/SPEC-01-TIME-AND-QUEUE.md` — time/queue mechanics
- `docs/specs/SPEC-02-DESK-TRIAGE.md` — desk interaction model
- `docs/specs/SPEC-03-FLOORPLAN-GRID.md` — seating grid puzzle rules
