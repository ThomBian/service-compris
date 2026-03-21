# Game Logic Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest unit tests for all exported pure functions in `src/logic/gameLogic.ts` as a foundation for new features.

**Architecture:** Install Vitest with a minimal `vitest.config.ts` (Node environment, no JSDOM), add two npm scripts (`test` / `test:watch`), and write all tests in a single file `src/logic/__tests__/gameLogic.test.ts` with four fixture factories at the top. Tests are grouped by function using `describe` blocks.

**Tech Stack:** Vitest 2.x, TypeScript, Node environment (no DOM).

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `vitest.config.ts` | Vitest config (Node env, test glob) |
| Modify | `package.json` | Add `test` and `test:watch` scripts |
| Create | `src/logic/__tests__/gameLogic.test.ts` | All unit tests |

---

### Task 1: Install Vitest and wire up config

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

Expected: `vitest` appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add after the existing `"lint"` entry:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

Create the file at the repo root (`/vitest.config.ts`, same level as `vite.config.ts`):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Verify the config is valid**

```bash
npm run test 2>&1 | head -5
```

Expected: output mentions "Vitest" starting up. Vitest 2.x exits with code 1 when no test files are found — this is expected at this stage. Look for "No test files found" in the output, not an import or config error. Any config error (e.g. unknown option) would print a different message.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest with node environment config"
```

---

### Task 2: Create test file with fixtures

**Files:**
- Create: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Create the test file with imports and fixtures**

Create `src/logic/__tests__/gameLogic.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  createInitialGrid,
  generateClientData,
  createNewClient,
  prepareClientForDesk,
  isAdjacent,
  canSelectCell,
  checkAccusation,
  handleRefusedClient,
  handleAcceptedClient,
  processQueueTick,
} from '../gameLogic';
import {
  ClientType,
  LieType,
  PhysicalState,
  DialogueState,
  CellState,
  type Reservation,
  type Client,
  type GameState,
} from '../../types';
import { GRID_SIZE } from '../../constants';

// --- Fixtures ---

const makeReservation = (overrides?: Partial<Reservation>): Reservation => ({
  id: 'res-1',
  firstName: 'John',
  lastName: 'Smith',
  partySize: 2,
  time: 1200,
  arrived: false,
  ...overrides,
});

const makeClientData = (overrides?: Partial<ReturnType<typeof generateClientData>>) => ({
  type: ClientType.LEGITIMATE,
  trueFirstName: 'John',
  trueLastName: 'Smith',
  truePartySize: 2,
  trueReservationId: 'res-1',
  lieType: LieType.NONE,
  ...overrides,
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
  ...overrides,
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
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

- [ ] **Step 2: Run test to make sure the file compiles**

```bash
npm run test
```

Expected: `No test files found` or `0 tests` — no TypeScript errors, no crashes.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add test file with fixtures"
```

---

### Task 3: Tests for `createInitialGrid`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the test file, after the `afterEach` block:

```ts
describe('createInitialGrid', () => {
  it('returns a grid with GRID_SIZE rows and GRID_SIZE columns', () => {
    const grid = createInitialGrid();
    expect(grid.length).toBe(GRID_SIZE);
    grid.forEach(row => expect(row.length).toBe(GRID_SIZE));
  });

  it('all cells start as EMPTY', () => {
    const grid = createInitialGrid();
    grid.forEach(row =>
      row.forEach(cell => expect(cell.state).toBe(CellState.EMPTY))
    );
  });

  it('all cell IDs are unique', () => {
    const grid = createInitialGrid();
    const ids = grid.flat().map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
npm run test
```

Expected: `3 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add createInitialGrid tests"
```

---

### Task 4: Tests for `generateClientData`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the tests**

Append to the test file. Each spec invariant gets its own `it` block so failures are independently visible:

```ts
describe('generateClientData', () => {
  // Legitimate (called with a reservation)
  it('legitimate client carries the reservation id', () => {
    const data = generateClientData(makeReservation());
    expect(data.trueReservationId).toBe('res-1');
    expect(data.type).toBe(ClientType.LEGITIMATE);
  });

  it('legitimate client size-lie rate is ~30% over 500 samples', () => {
    const results = Array.from({ length: 500 }, () => generateClientData(makeReservation()));
    const rate = results.filter(r => r.lieType === LieType.SIZE).length / 500;
    expect(rate).toBeGreaterThanOrEqual(0.22);
    expect(rate).toBeLessThanOrEqual(0.38);
  });

  // Walk-in and scammer tests use sampling (called without a reservation)
  // 200 samples reliably produces both types; filter and assert per-type invariants.
  const noResResults = Array.from({ length: 200 }, () => generateClientData());
  const walkIns = noResResults.filter(r => r.type === ClientType.WALK_IN);
  const scammers = noResResults.filter(r => r.type === ClientType.SCAMMER);

  it('walk-ins have no reservation id', () => {
    expect(walkIns.length).toBeGreaterThan(0);
    walkIns.forEach(r => expect(r.trueReservationId).toBeUndefined());
  });

  it('walk-in party size is between 1 and 4', () => {
    walkIns.forEach(r => {
      expect(r.truePartySize).toBeGreaterThanOrEqual(1);
      expect(r.truePartySize).toBeLessThanOrEqual(4);
    });
  });

  it('scammers always have LieType.IDENTITY', () => {
    expect(scammers.length).toBeGreaterThan(0);
    scammers.forEach(r => expect(r.lieType).toBe(LieType.IDENTITY));
  });

  it('scammers have no reservation id', () => {
    scammers.forEach(r => expect(r.trueReservationId).toBeUndefined());
  });

  it('scammer party size is between 2 and 5', () => {
    scammers.forEach(r => {
      expect(r.truePartySize).toBeGreaterThanOrEqual(2);
      expect(r.truePartySize).toBeLessThanOrEqual(5);
    });
  });
});
```

- [ ] **Step 2: Run tests and verify they all pass**

```bash
npm run test
```

Expected: `10 passed` (3 from before + 7 new).

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add generateClientData tests"
```

---

### Task 5: Tests for `createNewClient`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the tests**

Append to the test file:

```ts
describe('createNewClient', () => {
  it('starts in queue with full patience and awaiting greeting', () => {
    const data = makeClientData();
    const client = createNewClient({ data, currentMinutes: 1200 });
    expect(client.physicalState).toBe(PhysicalState.IN_QUEUE);
    expect(client.patience).toBe(100);
    expect(client.dialogueState).toBe(DialogueState.AWAITING_GREETING);
  });

  it('assigns LieType.TIME when legitimate client is more than 30 min late', () => {
    const data = makeClientData({ lieType: LieType.NONE });
    const res = makeReservation({ time: 1170 }); // 19:30
    const client = createNewClient({ data, currentMinutes: 1210, res }); // 40 min late
    expect(client.lieType).toBe(LieType.TIME);
    expect(client.isLate).toBe(true);
  });

  it('does not assign TIME lie when client is on time', () => {
    const data = makeClientData({ lieType: LieType.NONE });
    const res = makeReservation({ time: 1170 }); // 19:30
    const client = createNewClient({ data, currentMinutes: 1180, res }); // 10 min late — not enough
    expect(client.lieType).toBe(LieType.NONE);
    expect(client.isLate).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: `13 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add createNewClient tests"
```

---

### Task 6: Tests for `prepareClientForDesk`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the tests**

Append to the test file:

```ts
describe('prepareClientForDesk', () => {
  it('advances physical and dialogue state', () => {
    const client = makeClient();
    const result = prepareClientForDesk(client);
    expect(result.physicalState).toBe(PhysicalState.AT_DESK);
    expect(result.dialogueState).toBe(DialogueState.OPENING_GAMBIT);
  });

  it('sets lastMessage to a non-empty greeting string', () => {
    const client = makeClient();
    const result = prepareClientForDesk(client);
    expect(result.lastMessage).toBeTruthy();
    expect(typeof result.lastMessage).toBe('string');
  });

  it('replaces chatHistory with a single guest greeting entry', () => {
    // Pass a client with pre-existing chatHistory to confirm replacement, not append
    const client = makeClient({
      chatHistory: [{ sender: 'guest', text: 'old message' }],
    });
    const result = prepareClientForDesk(client);
    expect(result.chatHistory.length).toBe(1);
    expect(result.chatHistory[0].sender).toBe('guest');
    expect(result.chatHistory[0].text).toBe(result.lastMessage);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: `16 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add prepareClientForDesk tests"
```

---

### Task 7: Tests for `isAdjacent` and `canSelectCell`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the tests**

Append to the test file:

```ts
describe('isAdjacent', () => {
  it('horizontal neighbors are adjacent', () => {
    expect(isAdjacent({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
  });

  it('vertical neighbors are adjacent', () => {
    expect(isAdjacent({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(true);
  });

  it('diagonal cells are not adjacent', () => {
    expect(isAdjacent({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false);
  });

  it('same cell is not adjacent to itself', () => {
    expect(isAdjacent({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false);
  });

  it('cells two apart are not adjacent', () => {
    expect(isAdjacent({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);
  });
});

describe('canSelectCell', () => {
  const emptyCell = { id: 'c', x: 1, y: 0, state: CellState.EMPTY };
  const occupiedCell = { id: 'd', x: 1, y: 0, state: CellState.OCCUPIED };
  const selectedNeighbor = { id: 'e', x: 0, y: 0, state: CellState.EMPTY };
  const farCell = { id: 'f', x: 3, y: 3, state: CellState.EMPTY };

  it('first cell is always selectable (no selection yet)', () => {
    expect(canSelectCell(emptyCell, [])).toBe(true);
  });

  it('non-empty cell is not selectable', () => {
    expect(canSelectCell(occupiedCell, [])).toBe(false);
  });

  it('empty cell adjacent to a selected cell is selectable', () => {
    expect(canSelectCell(emptyCell, [selectedNeighbor])).toBe(true);
  });

  it('empty cell not adjacent to any selected cell is not selectable', () => {
    expect(canSelectCell(farCell, [selectedNeighbor])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: `25 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add isAdjacent and canSelectCell tests"
```

---

### Task 8: Tests for `checkAccusation`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the tests**

Append to the test file:

```ts
describe('checkAccusation', () => {
  it('correctly catches a scammer on reservation accusation', () => {
    const client = makeClient({ type: ClientType.SCAMMER });
    const result = checkAccusation({ field: 'reservation', client, reservations: [] });
    expect(result.caught).toBe(true);
  });

  it('false reservation accusation on a legit client has a patience penalty', () => {
    const client = makeClient({ type: ClientType.LEGITIMATE });
    const result = checkAccusation({ field: 'reservation', client, reservations: [] });
    expect(result.caught).toBe(false);
    expect(result.patiencePenalty).toBe(50);
  });

  it('correctly catches a late client on time accusation', () => {
    const client = makeClient({ isLate: true });
    const result = checkAccusation({ field: 'time', client, reservations: [] });
    expect(result.caught).toBe(true);
  });

  it('false time accusation on an on-time client', () => {
    const client = makeClient({ isLate: false });
    const result = checkAccusation({ field: 'time', client, reservations: [] });
    expect(result.caught).toBe(false);
  });

  it('correctly catches a size lie when reservation is in the array', () => {
    // Client claims 4 people but reservation is for 2
    const client = makeClient({ truePartySize: 4, trueReservationId: 'res-1' });
    const reservations = [makeReservation({ partySize: 2 })];
    const result = checkAccusation({ field: 'size', client, reservations });
    expect(result.caught).toBe(true);
  });

  it('false size accusation when party sizes match', () => {
    const client = makeClient({ truePartySize: 2, trueReservationId: 'res-1' });
    const reservations = [makeReservation({ partySize: 2 })];
    const result = checkAccusation({ field: 'size', client, reservations });
    expect(result.caught).toBe(false);
  });

  it('false size accusation when reservation is not found in array', () => {
    const client = makeClient({ truePartySize: 4, trueReservationId: 'res-1' });
    const result = checkAccusation({ field: 'size', client, reservations: [] });
    expect(result.caught).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: `32 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add checkAccusation tests"
```

---

### Task 9: Tests for `handleRefusedClient`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the tests**

Append to the test file:

```ts
describe('handleRefusedClient', () => {
  // Use safe starting values: rating=3.0, morale=50
  // Justified: +0.2 rating, +5 morale → 3.2 / 55
  // Unjustified: -0.5 rating, -15 morale → 2.5 / 35

  it('justified refusal of a scammer boosts rating and morale', () => {
    const client = makeClient({ type: ClientType.SCAMMER });
    const { nextRating, nextMorale } = handleRefusedClient(client, 3.0, 50, []);
    expect(nextRating).toBeCloseTo(3.2);
    expect(nextMorale).toBe(55);
  });

  it('justified refusal of a size liar boosts rating and morale', () => {
    const client = makeClient({ lieType: LieType.SIZE });
    const { nextRating, nextMorale } = handleRefusedClient(client, 3.0, 50, []);
    expect(nextRating).toBeCloseTo(3.2);
    expect(nextMorale).toBe(55);
  });

  it('justified refusal of a late client boosts rating and morale', () => {
    const client = makeClient({ isLate: true });
    const { nextRating, nextMorale } = handleRefusedClient(client, 3.0, 50, []);
    expect(nextRating).toBeCloseTo(3.2);
    expect(nextMorale).toBe(55);
  });

  it('unjustified refusal of an honest client drops rating and morale', () => {
    const client = makeClient({ type: ClientType.LEGITIMATE, lieType: LieType.NONE, isLate: false });
    const { nextRating, nextMorale } = handleRefusedClient(client, 3.0, 50, []);
    expect(nextRating).toBeCloseTo(2.5);
    expect(nextMorale).toBe(35);
  });

  it('always adds a log entry', () => {
    const client = makeClient();
    const { nextLogs } = handleRefusedClient(client, 3.0, 50, ['existing log']);
    expect(nextLogs.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: `37 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add handleRefusedClient tests"
```

---

### Task 10: Tests for `handleAcceptedClient`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the tests**

`basePay` for `truePartySize=2, seatedCount=2` = `((20 + 20) / 2) * 2 = 40`.

Append to the test file:

```ts
describe('handleAcceptedClient', () => {
  it('honest customer earns cash and a small rating boost', () => {
    const client = makeClient({ hasLied: false, truePartySize: 2 });
    const { nextCash, nextRating } = handleAcceptedClient(client, 2, 0, 3.0, 50, []);
    expect(nextCash).toBe(40); // basePay = 40
    expect(nextRating).toBeCloseTo(3.1);
  });

  it('uncaught scammer costs $50 and drops rating by 1', () => {
    const client = makeClient({
      type: ClientType.SCAMMER,
      hasLied: true,
      isCaught: false,
      truePartySize: 2,
    });
    const { nextCash, nextRating } = handleAcceptedClient(client, 2, 100, 3.0, 50, []);
    expect(nextCash).toBe(50); // 100 - 50
    expect(nextRating).toBeCloseTo(2.0);
  });

  it('grateful liar (caught + seated) earns 2.5x basePay', () => {
    const client = makeClient({
      hasLied: true,
      isCaught: true,
      truePartySize: 2,
    });
    const { nextCash } = handleAcceptedClient(client, 2, 0, 3.0, 50, []);
    expect(nextCash).toBe(100); // 40 * 2.5
  });

  it('cropped party (fewer seated than actual) drops rating', () => {
    const client = makeClient({ hasLied: false, truePartySize: 4 });
    // Only seat 2 of 4 — 2 cropped
    const { nextRating } = handleAcceptedClient(client, 2, 0, 3.0, 50, []);
    expect(nextRating).toBeLessThan(3.0);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: `41 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add handleAcceptedClient tests"
```

---

### Task 11: Tests for `processQueueTick`

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write the tests**

Append to the test file:

```ts
describe('processQueueTick', () => {
  it('drains patience by 1 for each queue client', () => {
    const state = makeGameState({
      queue: [makeClient({ patience: 80 }), makeClient({ id: 'c2', patience: 50 })],
    });
    const next = processQueueTick(state);
    expect(next.queue[0].patience).toBe(79);
    expect(next.queue[1].patience).toBe(49);
  });

  it('removes clients with zero patience (storm out)', () => {
    const state = makeGameState({
      queue: [makeClient({ patience: 0 }), makeClient({ id: 'c2', patience: 50 })],
    });
    const next = processQueueTick(state);
    expect(next.queue.length).toBe(1);
    expect(next.queue[0].id).toBe('c2');
  });

  it('storm out reduces rating', () => {
    const state = makeGameState({
      queue: [makeClient({ patience: 0 })],
      rating: 3.0,
    });
    const next = processQueueTick(state);
    expect(next.rating).toBeLessThan(3.0);
  });

  it('promotes first queue client to desk when desk is empty', () => {
    const state = makeGameState({
      queue: [makeClient({ id: 'first' })],
      currentClient: null,
    });
    const next = processQueueTick(state);
    expect(next.currentClient).not.toBeNull();
    expect(next.currentClient!.physicalState).toBe(PhysicalState.AT_DESK);
    expect(next.currentClient!.dialogueState).toBe(DialogueState.OPENING_GAMBIT);
    expect(next.queue.length).toBe(0);
  });

  it('does not promote when desk is already occupied', () => {
    const occupant = makeClient({ id: 'occupant', physicalState: PhysicalState.AT_DESK });
    const state = makeGameState({
      queue: [makeClient({ id: 'queued' })],
      currentClient: occupant,
    });
    const next = processQueueTick(state);
    expect(next.currentClient!.id).toBe('occupant');
    expect(next.queue.length).toBe(1);
  });

  it('decrements meal duration on occupied cells', () => {
    const grid = createInitialGrid();
    grid[0][0] = { ...grid[0][0], state: CellState.OCCUPIED, mealDuration: 5 };
    const state = makeGameState({ grid });
    const next = processQueueTick(state);
    expect(next.grid[0][0].mealDuration).toBe(4);
  });

  it('frees a cell when meal duration reaches zero', () => {
    const grid = createInitialGrid();
    grid[0][0] = { ...grid[0][0], state: CellState.OCCUPIED, mealDuration: 1 };
    const state = makeGameState({ grid });
    const next = processQueueTick(state);
    expect(next.grid[0][0].state).toBe(CellState.EMPTY);
    expect(next.grid[0][0].mealDuration).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: `48 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/logic/__tests__/gameLogic.test.ts
git commit -m "test: add processQueueTick tests"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: all 48 tests pass, exit code 0.

- [ ] **Step 2: Run type check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Update CLAUDE.md to document the test command**

In `CLAUDE.md`, the Commands section currently reads:

```markdown
npm run lint      # Type-check (tsc --noEmit) — no test suite exists
```

Change it to:

```markdown
npm run lint      # Type-check (tsc --noEmit)
npm run test      # Run unit tests (Vitest, Node env)
npm run test:watch  # Watch mode for development
```

- [ ] **Step 4: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with test commands"
```
