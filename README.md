# Service Compris

A browser-based **Maître D’ simulator**: run the door at an overbooked restaurant, catch lies at the podium, and fit parties on a **4×4 floorplan** like spatial Tetris—all in real time while the queue’s patience runs out.

## What you do

1. **Queue** — Walk-ins and reservations arrive; if you ignore them too long, they leave and your rating suffers.
2. **Desk** — Cross-check what guests *say* against the booking list. Ask questions, spot scammers and time cheats, then **accept**, **refuse**, or **seat**.
3. **Floorplan** — Seat a party by placing a contiguous block on the grid. Meal length scales with party size; when tables clear, you get space back for the next rush.

The game cares about **cash**, **star rating**, **morale**, and making it through the night (roughly **19:30–23:30** in-game, with pause and time controls).

Design intent and loop details live in [`docs/game-concept.md`](docs/game-concept.md).

## Tech stack

| Layer | Choice |
|--------|--------|
| UI | React 19, TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Motion | Motion (Framer Motion successor) |
| Icons | Lucide React |
| Tests | Vitest |

State is centralized in a **`GameContext`** that composes smaller hooks (clock, spawner, queue, desk actions, reservations, etc.). Game rules lean on pure helpers in `src/logic/`.

## Getting started

**Requirements:** Node.js 20+ (or current LTS) and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (dev server binds to `0.0.0.0` so it’s reachable on your LAN).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |
| `npm run clean` | Remove `dist/` |

## Project layout (short)

```
src/
  components/   # UI (podium, grid, booking list, overlays, …)
  context/      # GameContext + engine hooks
  logic/        # Pure game functions
  types.ts      # Core domain types
docs/
  game-concept.md
  specs/        # Time/queue, desk triage, floorplan, layout, …
```

## Contributing / AI assistants

Repo conventions for agents are summarized in [`CLAUDE.md`](CLAUDE.md) (commands, architecture sketch, path alias `@/*`).

---

*Working name: **Service Compris** — the house always wins, except when the guests lie.*
