# Testing Design — Game Logic

**Date:** 2026-03-21
**Scope:** Unit tests for all exported pure functions in `src/logic/gameLogic.ts`
**Motivation:** Foundation for adding new features safely

---

## Goals

- Cover the invariants of every exported function in `gameLogic.ts`
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

## Test Fixtures

Tests will need a minimal `Reservation` factory and a minimal `Client` factory. These are defined at the top of the test file:

```ts
const makeReservation = (overrides?: Partial<Reservation>): Reservation => ({
  id: 'res-1',
  firstName: 'John',
  lastName: 'Smith',
  partySize: 2,
  time: 1200, // 20:00
  arrived: false,
  ...overrides
});

const makeClient = (overrides?: Partial<Client>): Client => ({
  id: 'test-client',
  type: ClientType.LEGITIMATE,
  patience: 100,
  physicalState: PhysicalState.IN_QUEUE,
  dialogueState: DialogueState.AWAITING_GREETING,
  spawnTime: 1200,
  trueFirstName: 'John',
  trueLastName: 'Smith',
  truePartySize: 2,
  trueReservationId: 'res-1',
  isLate: false,
  lieType: LieType.NONE,
  hasLied: false,
  isCaught: false,
  lastMessage: 'Waiting in line...',
  chatHistory: [],
  ...overrides
});
```

---

## Test Cases

### `createInitialGrid()`

| Test | Assertion |
|------|-----------|
| Returns correct dimensions | `grid.length === GRID_SIZE` and `grid[0].length === GRID_SIZE` |
| All cells empty | Every cell has `state === CellState.EMPTY` |
| Cell IDs are unique | All `cell.id` values are distinct |

### `generateClientData()`

| Test | Assertion |
|------|-----------|
| Walk-in has no reservation | `trueReservationId === undefined` when called without `res` and type is `WALK_IN` |
| Scammer always lies about identity | `lieType === LieType.IDENTITY` when `type === SCAMMER` |
| Scammer has no reservation | `trueReservationId === undefined` for scammers |
| Legitimate has reservation id | `trueReservationId === res.id` when called with a `res` |
| Legitimate may lie about size | Over 500 samples with a `res`, between 15–45% have `lieType === LieType.SIZE` |
| Walk-in party size range | `truePartySize >= 1 && truePartySize <= 4` |
| Scammer party size range | `truePartySize >= 2 && truePartySize <= 5` |

### `createNewClient()`

| Test | Assertion |
|------|-----------|
| Starts in queue | `physicalState === PhysicalState.IN_QUEUE` |
| Patience is 100 | `patience === 100` |
| Dialogue state initialized | `dialogueState === DialogueState.AWAITING_GREETING` |
| Late legitimate gets TIME lie | When `currentMinutes - res.time > 30` and `lieType` was `NONE`, result has `lieType === LieType.TIME` |
| On-time legitimate keeps original lie | `lieType` is not overridden when client is not late |

### `prepareClientForDesk()`

| Test | Assertion |
|------|-----------|
| Advances physical state | `physicalState === PhysicalState.AT_DESK` |
| Advances dialogue state | `dialogueState === DialogueState.OPENING_GAMBIT` |
| Sets lastMessage to greeting | `lastMessage` is a non-empty string |
| Greeting is added to chatHistory | `chatHistory` has one entry from `'guest'` matching `lastMessage` |

### `isAdjacent()`

| Test | Assertion |
|------|-----------|
| Horizontal neighbors | `{x:0,y:0}` and `{x:1,y:0}` → `true` |
| Vertical neighbors | `{x:0,y:0}` and `{x:0,y:1}` → `true` |
| Diagonal is not adjacent | `{x:0,y:0}` and `{x:1,y:1}` → `false` |
| Same cell is not adjacent | `{x:0,y:0}` and `{x:0,y:0}` → `false` |
| Distance 2 is not adjacent | `{x:0,y:0}` and `{x:2,y:0}` → `false` |

### `canSelectCell()`

| Test | Assertion |
|------|-----------|
| Empty cell with no selection | `true` (first cell is always selectable) |
| Non-empty cell is never selectable | `false` when `cell.state !== CellState.EMPTY` |
| Adjacent empty cell is selectable | `true` when cell neighbors a selected cell |
| Non-adjacent empty cell is not selectable | `false` when no selected cell is adjacent |

### `checkAccusation()`

| Test | Assertion |
|------|-----------|
| Correctly accuses a scammer | `caught === true` when `field === 'reservation'` and `client.type === SCAMMER` |
| False accusation on legit client | `caught === false`, `patiencePenalty === 50` |
| Correctly accuses late client | `caught === true` when `field === 'time'` and `client.isLate === true` |
| False time accusation | `caught === false` when `client.isLate === false` |
| Correctly accuses size lie | `caught === true` when `field === 'size'` and `client.truePartySize > res.partySize` |
| False size accusation | `caught === false` when party sizes match |

### `handleRefusedClient()`

| Test | Assertion |
|------|-----------|
| Justified refusal (scammer) | `rating` increases, `morale` increases |
| Justified refusal (size lie) | `rating` increases, `morale` increases |
| Justified refusal (late) | `rating` increases, `morale` increases |
| Unjustified refusal | `rating` decreases by 0.5, `morale` decreases by 15 |
| Log entry added | `nextLogs.length === currentLogs.length + 1` |

### `handleAcceptedClient()`

| Test | Assertion |
|------|-----------|
| Honest customer: cash increases | `nextCash > currentCash` |
| Honest customer: small rating boost | `nextRating === currentRating + 0.1` (capped at 5) |
| Scammer (uncaught): cash decreases by 50 | `nextCash === currentCash - 50` |
| Scammer (uncaught): rating drops by 1.0 | `nextRating === currentRating - 1.0` |
| Grateful liar (caught + seated): cash bonus | `nextCash === currentCash + basePay * 2.5` |
| Cropped party: rating penalty | `nextRating < currentRating` when `seatedCount < truePartySize` |

### `processQueueTick()`

| Test | Assertion |
|------|-----------|
| Drains patience by 1 per tick | Queue clients each lose 1 patience |
| Storm out removes zero-patience clients | Clients at `patience === 0` are removed from queue |
| Storm out penalizes rating | `rating` decreases when storm outs occur |
| Promotes first queue client to desk | When `currentClient` is null and queue is non-empty, first client moves to desk |
| Does not promote when desk occupied | `currentClient` unchanged when already set |
| Grid meal duration decrements | `mealDuration` decreases by 1 each tick |
| Finished meal frees cell | Cell transitions to `CellState.EMPTY` when `mealDuration` reaches 0 |

---

## What Is Not Tested

- Internal randomness beyond statistical invariants
- Name generation cosmetics (`FIRST_NAMES`, `LAST_NAMES`)
- Non-exported helper functions (`updateQueuePatience`, `handleStormOuts`, `tryMoveToDesk`, etc.)
- `generateQuestionResponse` — covered implicitly via the `checkAccusation` and decision tests; can be added later
