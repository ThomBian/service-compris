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
  handleSeatingRefusal,
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

const makeClientData = (overrides?: Partial<ReturnType<typeof generateClientData>>): ReturnType<typeof generateClientData> => ({
  type: ClientType.LEGITIMATE,
  trueFirstName: 'John',
  trueLastName: 'Smith',
  truePartySize: 2,
  trueReservationId: 'res-1',
  lieType: LieType.NONE as const,
  claimedReservationId: undefined,
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

describe('generateClientData — impersonator logic', () => {
  const res1 = makeReservation({ id: 'res-1', firstName: 'Sophie', lastName: 'Blanc', time: 1200 });
  const res2 = makeReservation({ id: 'res-2', firstName: 'Marc', lastName: 'Dupont', time: 1210 });
  const allRes = [res1, res2];
  // currentInGameMinutes = 1260 means res.time + 45 <= 1260 for both (1245 and 1255)
  const currentMinutes = 1260;

  it('scammer true name is never a reservation name', () => {
    const reservationNames = allRes.map(r => r.firstName);
    const results = Array.from({ length: 200 }, () =>
      generateClientData(undefined, allRes, currentMinutes)
    );
    const scammers = results.filter(r => r.type === ClientType.SCAMMER);
    scammers.forEach(r => {
      expect(reservationNames).not.toContain(r.trueFirstName);
    });
  });

  it('impersonator rate is ~10% among scammers when qualifying reservations exist', () => {
    const results = Array.from({ length: 500 }, () =>
      generateClientData(undefined, allRes, currentMinutes)
    );
    const scammers = results.filter(r => r.type === ClientType.SCAMMER);
    const impersonators = scammers.filter(r => r.claimedReservationId !== undefined);
    const rate = impersonators.length / scammers.length;
    expect(rate).toBeGreaterThanOrEqual(0.04);
    expect(rate).toBeLessThanOrEqual(0.18);
  });

  it('claimedReservationId always points to a qualifying reservation', () => {
    const results = Array.from({ length: 200 }, () =>
      generateClientData(undefined, allRes, currentMinutes)
    );
    const impersonators = results.filter(r => r.claimedReservationId !== undefined);
    impersonators.forEach(r => {
      const match = allRes.find(res => res.id === r.claimedReservationId);
      expect(match).toBeDefined();
      expect(match!.time + 45).toBeLessThanOrEqual(currentMinutes);
    });
  });

  it('no impersonator is assigned when no qualifying reservations exist (all too recent)', () => {
    const recentRes = [makeReservation({ id: 'r', time: 1250 })]; // time + 45 = 1295 > 1260
    const results = Array.from({ length: 100 }, () =>
      generateClientData(undefined, recentRes, currentMinutes)
    );
    const impersonators = results.filter(r => r.claimedReservationId !== undefined);
    expect(impersonators.length).toBe(0);
  });

  it('no impersonator is assigned when currentInGameMinutes is not provided', () => {
    const results = Array.from({ length: 100 }, () =>
      generateClientData(undefined, allRes)
    );
    const impersonators = results.filter(r => r.claimedReservationId !== undefined);
    expect(impersonators.length).toBe(0);
  });
});

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
    expect(result.lastMessage.length).toBeGreaterThan(0);
    expect(typeof result.lastMessage).toBe('string');
  });

  it('replaces chatHistory with a maitre-d greeting followed by a guest greeting', () => {
    // Pass a client with pre-existing chatHistory to confirm replacement, not append
    const client = makeClient({
      chatHistory: [{ sender: 'guest', text: 'old message' }],
    });
    const result = prepareClientForDesk(client);
    expect(result.chatHistory.length).toBe(2);
    expect(result.chatHistory[0].sender).toBe('maitre-d');
    expect(result.chatHistory[1].sender).toBe('guest');
    expect(result.chatHistory[1].text).toBe(result.lastMessage);
  });
});

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
  it('first cell is always selectable (no selection yet)', () => {
    const emptyCell = { id: 'c', x: 1, y: 0, state: CellState.EMPTY };
    expect(canSelectCell(emptyCell, [])).toBe(true);
  });

  it('non-empty cell is not selectable', () => {
    const occupiedCell = { id: 'd', x: 1, y: 0, state: CellState.OCCUPIED };
    expect(canSelectCell(occupiedCell, [])).toBe(false);
  });

  it('empty cell adjacent to a selected cell is selectable', () => {
    const emptyCell = { id: 'c', x: 1, y: 0, state: CellState.EMPTY };
    const selectedNeighbor = { id: 'e', x: 0, y: 0, state: CellState.EMPTY };
    expect(canSelectCell(emptyCell, [selectedNeighbor])).toBe(true);
  });

  it('empty cell not adjacent to any selected cell is not selectable', () => {
    const selectedNeighbor = { id: 'e', x: 0, y: 0, state: CellState.EMPTY };
    const farCell = { id: 'f', x: 3, y: 3, state: CellState.EMPTY };
    expect(canSelectCell(farCell, [selectedNeighbor])).toBe(false);
  });
});

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
    // Client's true party size (4) exceeds the reservation (2)
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

  it('refusing a walk-in does not change rating or morale', () => {
    const client = makeClient({
      type: ClientType.WALK_IN,
      trueReservationId: undefined,
      lieType: LieType.NONE,
    });
    const { nextRating, nextMorale, nextLogs } = handleRefusedClient(client, 3.0, 50, []);
    expect(nextRating).toBe(3.0);
    expect(nextMorale).toBe(50);
    expect(nextLogs[0]).toMatch(/Walk-in turned away/);
  });

  it('always adds a log entry', () => {
    const client = makeClient();
    const { nextLogs } = handleRefusedClient(client, 3.0, 50, ['existing log']);
    expect(nextLogs.length).toBe(2);
  });
});

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
    expect(nextCash).toBe(50); // 100 (starting cash) - 50 (penalty) = 50; basePay not earned for uncaught scammer
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
    expect(nextRating).toBeCloseTo(2.1); // -1.0 penalty for 2 cropped guests (-0.5 * 2^(2-1)) + 0.1 bonus for honest = 3.0 - 0.9 = 2.1
  });
});

describe('handleSeatingRefusal', () => {
  it('applies a heavy rating and morale penalty regardless of client type', () => {
    const client = makeClient({ type: ClientType.WALK_IN, lieType: LieType.NONE });
    const result = handleSeatingRefusal(client, 4.0, 80, []);
    expect(result.nextRating).toBeCloseTo(2.5);
    expect(result.nextMorale).toBe(50);
    expect(result.nextLogs[0]).toMatch(/Refused after seating/i);
  });

  it('clamps rating to 0 if penalty exceeds current rating', () => {
    const client = makeClient();
    const result = handleSeatingRefusal(client, 1.0, 20, []);
    expect(result.nextRating).toBe(0);
    expect(result.nextMorale).toBe(0);
  });
});

describe('processQueueTick', () => {
  it('drains patience by 1 for each queue client', () => {
    const occupant = makeClient({ id: 'occupant', physicalState: PhysicalState.AT_DESK });
    // Occupant prevents desk-promotion from removing this client before assertion
    const state = makeGameState({
      queue: [makeClient({ patience: 80 }), makeClient({ id: 'c2', patience: 50 })],
      currentClient: occupant,
    });
    const next = processQueueTick(state);
    expect(next.queue[0].patience).toBe(79);
    expect(next.queue[1].patience).toBe(49);
  });

  it('removes clients with zero patience (storm out)', () => {
    const occupant = makeClient({ id: 'occupant', physicalState: PhysicalState.AT_DESK });
    // Occupant prevents desk-promotion from removing this client before assertion
    const state = makeGameState({
      queue: [makeClient({ patience: 0 }), makeClient({ id: 'c2', patience: 50 })],
      currentClient: occupant,
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
