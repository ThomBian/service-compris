# Testing Design — Game Logic

**Date:** 2026-03-21
**Scope:** Unit tests for `src/logic/gameLogic.ts` pure functions
**Motivation:** Foundation for adding new features safely

---

## Goals

- Cover all invariants of the pure functions in `gameLogic.ts`
- Fast feedback loop (Node environment, no DOM)
- Minimal setup overhead

## Out of Scope

- React hooks (`src/hooks/`)
- React components (`src/components/`)
- Coverage reporting (can be added later)

---

## Tooling

| Tool | Purpose |
|------|---------|
| Vitest | Test runner (native Vite integration) |
| TypeScript | Tests are type-checked via existing `tsc --noEmit` |

No JSDOM. Pure Node environment.

### New Scripts (`package.json`)

```json
"test": "vitest run",
"test:watch": "vitest"
```

### Config (`vitest.config.ts`)

Separate file from `vite.config.ts`. Sets:
- `environment: 'node'`
- `include: ['src/**/__tests__/**/*.test.ts']`

---

## File Structure

```
src/
  logic/
    gameLogic.ts
    __tests__/
      gameLogic.test.ts
```

---

## Test Cases

### `createInitialGrid()`

| Test | Assertion |
|------|-----------|
| Returns correct dimensions | Grid has 16 cells (4×4) |
| All cells empty | Every cell is `CellState.EMPTY` |

### `generateClientData()`

| Test | Assertion |
|------|-----------|
| Walk-in has no reservation claim | `clientType === WALK_IN` → no reservation name |
| Scammer always lies about identity | `clientType === SCAMMER` → `lieType === LieType.IDENTITY` |
| Legitimate may lie about size | Over 200 samples, ~30% have `LieType.SIZE` (allow 15–45% range) |
| Party size is valid | `partySize >= 1` always |

### `createNewClient()`

| Test | Assertion |
|------|-----------|
| Starts in queue | `physicalState === PhysicalState.IN_QUEUE` |
| Patience is positive | `patience > 0` |
| Dialogue state initialized | `dialogueState === DialogueState.AWAITING_GREETING` |

### `prepareClientForDesk()`

| Test | Assertion |
|------|-----------|
| Advances physical state | `physicalState === PhysicalState.AT_DESK` |
| Advances dialogue state | `dialogueState === DialogueState.OPENING_GAMBIT` |
| Greeting is set | `greeting` is a non-empty string |

---

## What Is Not Tested

- Internal randomness beyond statistical invariants
- Name generation (cosmetic, no game impact)
- Hooks, context, or component behavior
