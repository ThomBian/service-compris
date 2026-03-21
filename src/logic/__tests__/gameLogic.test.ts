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
