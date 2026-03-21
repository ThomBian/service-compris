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

// Tests will be added in subsequent tasks
describe('gameLogic', () => {
  it('placeholder', () => {
    // Tests will be added in subsequent tasks
  });
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
