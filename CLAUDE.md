# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # Type-check (tsc --noEmit)
npm run test       # Run unit tests (Vitest, Node env)
npm run test:watch # Watch mode for development
npm run clean      # Remove dist/
```

## Development (local / `import.meta.env.DEV`)

The dev **command palette** is the single entry point for test helpers (mock corkboard jumps, boss mini-games while a shift is running). It is omitted from production builds.

- **Open / close:** **Cmd+Shift+K** (macOS) or **Ctrl+Shift+K** (Windows/Linux). A small **Dev** corner button can also open it when enabled; uncheck “Show Dev button when closed” in the palette footer to hide that button — preference is stored in `**localStorage`** under `service-compris-dev-palette-ui`.
- **Implementation:** `[src/components/dev/DevCommandPalette.tsx](src/components/dev/DevCommandPalette.tsx)`, `[src/dev/DevPlayApiContext.tsx](src/dev/DevPlayApiContext.tsx)`, mock ledger in `[src/dev/devMockLedger.ts](src/dev/devMockLedger.ts)`.
- `**VITE_DEV_START_NIGHT`:** Optional `.env` value (integer **≥ 2**): starting a new game from the landing page skips the intro and jumps to that night (see `DEV_START_NIGHT` in `[src/App.tsx](src/App.tsx)`). Unrelated to the palette.

## How we work

- **Bilingual product (EN + FR):** Treat the game as localized by default. User-facing copy lives in **i18n JSON** (`src/i18n/locales/{en,fr}/`), not hard-coded in components—add or update keys in **both** languages when you introduce or change text. Use `useTranslation` in React and `i18n.t()` in non-React code (pure logic, hooks that build strings). Persisted strings (e.g. activity logs) should be resolved at write time with `i18n.t(...)` unless we explicitly re-localize on read later.
- **Boss mini-game UX contract:** Any new boss mini-game must reuse the same presentation flow: intro/dramatic beat, stakes block, short “How to play” explanation, then challenge, then outcome summary + Continue. Treat this as a product pattern, not per-game improvisation.
- **Mini-game copy checklist:** When adding a `MiniGameId`, add matching `game.boss.*` keys in **both** locales for at least: placeholder label (if WIP), instruction text, and any game-specific HUD labels/aria strings. Keep fallback keys (`boss.genericInstruction`, generic win/lose lines) intact so incomplete content degrades gracefully.
- **Architecture at scale:** Prefer **clear boundaries**: pure functions in `src/logic/` (testable, no React), side effects and orchestration in hooks (`src/hooks/`), a single game state pipe through `GameContext` / `useGameEngine`, and thin UI components. When adding features, extend existing subsystems (spawner, queue, actions) instead of duplicating state or bypassing context. Large or cross-cutting work is often specced first under `docs/` (see below).
- **Docs and specs:** Design notes and plans live in `docs/` (`docs/game-concept.md`, `docs/specs/`, `docs/superpowers/`). Use them to align behavior before rewriting core loops.

## Internationalization (`src/i18n`)

Stack: **i18next** + **react-i18next** + browser language detection. Supported locales: `en`, `fr`; fallback `en`. Storage key: `service-compris-lang` (localStorage).

Namespaces (keep keys grouped; mirror structure across locales):


| Namespace  | Typical content                                    |
| ---------- | -------------------------------------------------- |
| `common`   | Shared chrome, errors, generic labels              |
| `ui`       | Buttons, panels, navigation                        |
| `game`     | In-game copy, log lines, dialogue-adjacent strings |
| `tour`     | Onboarding / tour steps                            |
| `campaign` | Corkboard, landing, meta-progression copy          |
| `intro`    | Cinematic intro / character creation copy          |


Entry point: `src/i18n/index.ts`. The app entry should import it **once** (side effect) so initialization runs before render, e.g. `import '@/src/i18n'` in `main.tsx`.

## Architecture

Browser-based restaurant management game: **React 19** + **Vite** + **TypeScript** + **Tailwind CSS 4**.

### App phases (`src/App.tsx`)

High-level flow:

1. **LANDING** — `LandingPage` (language, start new game).
2. **INTRO** — `IntroSequence`: cinematic setup, ID card (name, avatar, difficulty), stakes, clock-in; writes `service-compris-intro-seen` when finished.
3. **CORKBOARD** — `CorkboardScreen` after a shift: ledger summary, campaign path, or “fired” variant from `FIRED_CONFIG` / `useCampaign`.
4. **PLAYING** — `GameContent` inside `GameProvider`: live shift with tour overlay, toasts, pause overlay.

`GameProvider` wraps **PLAYING** only. Corkboard and intro sit outside it; campaign hooks (`incrementPathScore`, `pathScores`) are passed into `GameProvider` from `App`.

### In-shift UI (`GameContent`)

- **Top:** `TopBar` — time, rating, cash, morale, speed, difficulty, tour entry, night/rules hints; optional **player identity** (pixel avatar + name from intro) when set in `App` state.
- **Center column:** `ScenePanel` toggles `**DeskScene` | `FloorplanScene`** (desk vs floorplan view); `BottomPanel` holds queue, bookings, podium-style actions below the scene.
- **Overlays:** `TourOverlay`, `ToastContainer`, full-screen pause when time multiplier is 0.

### State management

All game state flows through `**GameContext`** (`src/context/GameContext.tsx`), which wraps `**useGameEngine`** — a hook that composes subsystems:

```
useGameEngine
  ├── useGameClock          # 1s real-time tick = 1 in-game minute
  ├── useClientSpawner      # Walk-ins and reservations
  ├── useQueueManager       # Queue → desk
  ├── useQuestionActions    # Ask question
  ├── useAccusationActions  # Call out lie
  ├── useDecisionActions    # Accept / refuse / seat
  └── useReservationActions # Reservation arrival toggles
```

Components use **action functions from context**; they do not call raw `setState` on the engine.

### Core data model (`src/types.ts`)

- **Client:** hidden truth (`actualSize`, `actualTime`, `actualIdentity`) vs. claims—the core mismatch loop.
- **ClientType:** `WALK_IN | LEGITIMATE | SCAMMER` — spawn and lie behavior.
- **PhysicalState:** `IN_QUEUE → AT_DESK → SEATING → ACCEPTED | REFUSED | STORMED_OUT`
- **GameState:** queue, `4×4` `CellState` grid, economy, morale, rules, logs, etc.

Campaign-specific types live under `src/types/campaign.ts` (e.g. ledger, path scoring) where relevant.

### Game logic (`src/logic/gameLogic.ts`)

Pure functions: grid creation, client generation (lies / identities), greetings, scoring helpers, etc. Keep this file free of React; use `**i18n.t()`** when emitting user-visible strings from here.

### Key constants (`src/constants.ts`)

- Shift window 19:30–22:30 (`START_TIME` as minutes from midnight).
- `TICK_RATE = 1000ms` per in-game minute.
- Meal duration: 30 min base + 20 min per extra guest.
- `GRID_SIZE = 4`.

### Path alias

`@/*` resolves to the **project root** (not `src/`). Prefer `@/src/...` for imports from `src/`.

## Code style

- **Early returns:** Guard clauses and early `return`s instead of deep nesting or long `else` chains when outcomes are mutually exclusive. Invalid or terminal cases first; happy path last.

## Docs

- `**docs/game-concept.md`** — core loop and win/lose framing.
- `**docs/specs/`** — layouts, time/queue, investigation UX, lore notes.
- `**docs/superpowers/**` — dated plans and design specs for larger features (tour, campaign, i18n, etc.).
- Specs are coming from Obsidian, whenever you plan something take them from the obsidian vault
- When a plan is executed, update the spec file in Obsidian to show what is done and what is not
- Attach the specs implemented in the codebase
- After each feature commited, review the specs in the codebase and update them to match what we have delivered
- Push a new release note into Obsidian explaining the version change

