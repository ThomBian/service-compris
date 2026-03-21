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

Three factories are defined at the top of the test file. All accept `Partial<T>` overrides.

```ts
const makeReservation = (overrides?: Partial<Reservation>): Reservation => ({
  id: 'res-1',
  firstName: 'John',
  lastName: 'Smith',
  partySize: 2,
  time: 1200, // 20:00 in minutes from midnight
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

const makeGameState = (overrides?: Partial<GameState>): GameState => ({
  inGameMinutes: 1200,
  timeMultiplier: 1,
  reservations: [],
  spawnedReservationIds: [],
  queue: [],
  currentClient: null,
  grid: createInitialGrid(),
  cash: 0,
  rating: 3.0,
  morale: 50,
  logs: [],
  ...overrides
});
```

### Controlling Randomness

`generateClientData()` uses `Math.random()` to select client type. Tests that need a specific branch (walk-in vs scammer) must control randomness with Vitest's spy:

```ts
// Force walk-in branch (typeRoll < 0.6)
vi.spyOn(Math, 'random').mockReturnValueOnce(0.3);

// Force scammer branch (typeRoll >= 0.6)
vi.spyOn(Math, 'random').mockReturnValueOnce(0.8);
```

Restore with `vi.restoreAllMocks()` in `afterEach`.

`prepareClientForDesk()` sets `knownPartySize` with 50% probability. Tests must **not** assert on `knownPartySize` unless `Math.random` is mocked.

---

## Test Cases

### `createInitialGrid()`

| Test | Assertion |
|------|-----------|
| Returns correct dimensions | `grid.length === GRID_SIZE` and `grid[0].length === GRID_SIZE` |
| All cells empty | Every cell has `state === CellState.EMPTY` |
| Cell IDs are unique | All `cell.id` values are distinct |

### `generateClientData()`

Walk-in and scammer tests require mocking `Math.random` to force the type branch (see Fixtures section).

| Test | Assertion |
|------|-----------|
| Walk-in has no reservation | Mock `typeRoll = 0.3` → `trueReservationId === undefined` |
| Walk-in party size range | Mock `typeRoll = 0.3` → `truePartySize >= 1 && truePartySize <= 4` |
| Scammer always lies about identity | Mock `typeRoll = 0.8` → `lieType === LieType.IDENTITY` |
| Scammer has no reservation | Mock `typeRoll = 0.8` → `trueReservationId === undefined` |
| Scammer party size range | Mock `typeRoll = 0.8` → `truePartySize >= 2 && truePartySize <= 5` |
| Legitimate has reservation id | Call `generateClientData(makeReservation())` → `trueReservationId === 'res-1'` |
| Legitimate may lie about size | Over 500 samples calling `generateClientData(makeReservation())`, between 22–38% have `lieType === LieType.SIZE` (no mock needed — statistical) |

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
| chatHistory is replaced with greeting | `chatHistory.length === 1`, `chatHistory[0].sender === 'guest'`, `chatHistory[0].text === lastMessage` (function replaces chatHistory, not appends) |

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

Note: the function looks up the client's reservation via `reservations.find(r => r.id === client.trueReservationId)`. For size-related tests, the `reservations` array must include a reservation whose `id` matches `client.trueReservationId`.

| Test | Assertion |
|------|-----------|
| Correctly accuses a scammer | `caught === true` when `field === 'reservation'` and `client.type === SCAMMER` |
| False accusation on legit client | `caught === false`, `patiencePenalty === 50` |
| Correctly accuses late client | `caught === true` when `field === 'time'` and `client.isLate === true` |
| False time accusation | `caught === false` when `client.isLate === false` |
| Correctly accuses size lie | Use `makeClient({ truePartySize: 4 })` and `[makeReservation({ partySize: 2 })]` → `caught === true` |
| False size accusation — no excess guests | `caught === false` when `client.truePartySize === res.partySize` and matching reservation is in array |
| False size accusation — no reservation found | `caught === false` when `reservations` is empty (function returns false if `res` is undefined) |

### `handleRefusedClient()`

Justified refusal is triggered by `client.type === SCAMMER`, `client.lieType === LieType.SIZE`, or `client.isLate === true`. Use `isLate: true` (not `lieType: LieType.TIME`) for the late-client fixture.

Use starting values well below caps: `currentRating = 3.0`, `currentMorale = 50`. For unjustified refusal, ensure `currentRating >= 0.5` and `currentMorale >= 15` so `Math.max(0, ...)` clamping does not mask the delta.

| Test | Assertion |
|------|-----------|
| Justified refusal (scammer) | `nextRating === 3.2`, `nextMorale === 55` (starting from `3.0` / `50`) |
| Justified refusal (size lie) | `nextRating === 3.2`, `nextMorale === 55` |
| Justified refusal (late, `isLate: true`) | `nextRating === 3.2`, `nextMorale === 55` |
| Unjustified refusal | `nextRating === 2.5`, `nextMorale === 35` (starting from `3.0` / `50`) |
| Log entry added | `nextLogs.length === currentLogs.length + 1` |

### `handleAcceptedClient()`

The internal `basePay` formula is: `((20 + partySize * 10) / partySize) * seatedCount`. Tests should compute expected cash values using this formula or use concrete examples. All tests should pass `seatedCount === client.truePartySize` unless explicitly testing cropping.

| Test | Assertion |
|------|-----------|
| Honest customer: cash increases | `nextCash > currentCash` (for `truePartySize=2, seatedCount=2`: expected pay = `(40/2)*2 = 40`, so `nextCash === currentCash + 40`) |
| Honest customer: small rating boost | `nextRating === currentRating + 0.1` (capped at 5) |
| Scammer (uncaught, `seatedCount === truePartySize`): cash decreases | `nextCash === currentCash - 50` |
| Scammer (uncaught): rating drops by 1.0 | `nextRating === currentRating - 1.0` |
| Grateful liar (`isCaught: true`, `seatedCount === truePartySize`): cash bonus | For `truePartySize=2, seatedCount=2`: `basePay = 40`, so `nextCash === currentCash + 40 * 2.5 === currentCash + 100` |
| Cropped party (`seatedCount < truePartySize`): rating penalty | `nextRating < currentRating` |

### `processQueueTick()`

| Test | Assertion |
|------|-----------|
| Drains patience by 1 per tick | Queue clients each lose 1 patience |
| Storm out removes zero-patience clients | Clients at `patience === 0` are removed from queue |
| Storm out penalizes rating | `rating` decreases when storm outs occur |
| Promotes first queue client to desk | When `currentClient` is null and queue is non-empty, first client moves to desk with `physicalState === AT_DESK` and `dialogueState === OPENING_GAMBIT` |
| Does not promote when desk occupied | `currentClient` unchanged when already set |
| Grid meal duration decrements | `mealDuration` decreases by 1 each tick |
| Finished meal frees cell | Cell transitions to `CellState.EMPTY` when `mealDuration` reaches 0 |

---

## What Is Not Tested

- Internal randomness beyond statistical invariants
- Name generation cosmetics (`FIRST_NAMES`, `LAST_NAMES`)
- Non-exported helper functions (`updateQueuePatience`, `handleStormOuts`, `tryMoveToDesk`, etc.)
- `generateQuestionResponse` — deferred; can be added later
