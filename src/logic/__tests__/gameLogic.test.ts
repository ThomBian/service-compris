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
