import { describe, it, expect } from 'vitest';
import { BypassQueueVip } from '../characters/BypassQueueVip';
import { AuraDrainVip } from '../characters/AuraDrainVip';
import { StandardVip } from '../characters/StandardVip';
import { StandardBanned } from '../characters/StandardBanned';
import type { CharacterDefinition, GameState } from '../../types';
import { PhysicalState, DialogueState, CellState, ClientType, LieType } from '../../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    inGameMinutes: 1200,
    timeMultiplier: 1,
    difficulty: 1,
    reservations: [],
    spawnedReservationIds: [],
    queue: [],
    currentClient: null,
    grid: Array(4).fill(null).map((_, y) =>
      Array(4).fill(null).map((_, x) => ({
        id: `cell-${x}-${y}`, x, y, state: CellState.EMPTY,
      }))
    ),
    cash: 100,
    rating: 4.0,
    morale: 80,
    logs: [],
    dailyCharacterIds: [],
    seatedCharacterIds: [],
    gameOverCharacterId: null,
    strikeActive: false,
    gameOver: false,
    gameOverReason: null,
    nightNumber: 1,
    coversSeated: 0,
    shiftRevenue: 0,
    ...overrides,
  } as GameState;
}

function makeDef(overrides: Partial<CharacterDefinition> = {}): CharacterDefinition {
  return {
    id: 'test-vip',
    name: 'Test VIP',
    role: 'VIP',
    behaviorType: 'STANDARD',
    visualTraits: { skinTone: 0, hairStyle: 0, hairColor: 0, clothingStyle: 0, clothingColor: 0, height: 0 } as const,
    clueText: 'Test clue',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 2,
    consequenceDescription: 'Test consequence',
    ...overrides,
  };
}

function makeClient(id = 'c1') {
  return {
    id,
    type: ClientType.WALK_IN,
    patience: 80,
    physicalState: PhysicalState.AT_DESK,
    dialogueState: DialogueState.WAITING_FOR_PLAYER,
    spawnTime: 1190,
    trueFirstName: 'John',
    trueLastName: 'Doe',
    truePartySize: 2,
    isLate: false,
    lieType: LieType.NONE,
    hasLied: false,
    visualTraits: { skinTone: 0, hairStyle: 0, hairColor: 0, clothingStyle: 0, clothingColor: 0, height: 0 } as const,
    isCaught: false,
    lastMessage: '',
    chatHistory: [],
  };
}

// BypassQueueVip
describe('BypassQueueVip', () => {
  const def = makeDef({ id: 'the-syndicate', behaviorType: 'BYPASS_QUEUE', cashBonus: 500, ratingPenalty: 1.0, moralePenalty: 20 });
  const syndicate = new BypassQueueVip(def);

  it('onDesk with no current client returns unchanged queue', () => {
    const state = makeState();
    const result = syndicate.onDesk!(state);
    expect(result.queue).toEqual([]);
  });

  it('onDesk pushes current client to front of queue', () => {
    const client = makeClient();
    const state = makeState({ currentClient: client });
    const result = syndicate.onDesk!(state);
    expect(result.queue).toHaveLength(1);
    expect(result.queue![0].id).toBe('c1');
    expect(result.queue![0].physicalState).toBe(PhysicalState.IN_QUEUE);
  });

  it('onDesk prepends displaced client before existing queue', () => {
    const existing = makeClient('c2');
    const current = makeClient('c1');
    const state = makeState({ currentClient: current, queue: [existing] });
    const result = syndicate.onDesk!(state);
    expect(result.queue![0].id).toBe('c1');
    expect(result.queue![1].id).toBe('c2');
  });

  it('onSeated adds cashBonus', () => {
    const state = makeState({ cash: 100 });
    const result = syndicate.onSeated(state);
    expect(result.cash).toBe(600);
  });

  it('onRefused applies rating and morale penalties', () => {
    const state = makeState({ rating: 4.0, morale: 80 });
    const result = syndicate.onRefused(state);
    expect(result.rating).toBeCloseTo(3.0);
    expect(result.morale).toBe(60);
  });

  it('onRefused clamps rating to 0', () => {
    const state = makeState({ rating: 0.5, morale: 10 });
    const result = syndicate.onRefused(state);
    expect(result.rating).toBe(0);
    expect(result.morale).toBe(0);
  });
});

// AuraDrainVip
describe('AuraDrainVip', () => {
  const def = makeDef({ id: 'manu-macaroon', behaviorType: 'AURA_DRAIN', auraRecovery: 'ON_SEATING' });
  const macaroon = new AuraDrainVip(def);

  it('onRefused sets strikeActive', () => {
    const state = makeState({ strikeActive: false });
    const result = macaroon.onRefused(state);
    expect(result.strikeActive).toBe(true);
  });

  it('onSeated clears strikeActive when auraRecovery is ON_SEATING', () => {
    const state = makeState({ strikeActive: true });
    const result = macaroon.onSeated(state);
    expect(result.strikeActive).toBe(false);
  });

  it('onStormOut clears strikeActive', () => {
    const state = makeState({ strikeActive: true });
    const result = macaroon.onStormOut!(state);
    expect(result.strikeActive).toBe(false);
  });
});

// StandardVip
describe('StandardVip', () => {
  it('onRefused subtracts ratingPenalty when set', () => {
    const def = makeDef({ ratingPenalty: 1.5 });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState({ rating: 4.0 }));
    expect(result.rating).toBeCloseTo(2.5);
  });

  it('onRefused subtracts cashPenalty when set', () => {
    const def = makeDef({ cashPenalty: 200 });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState({ cash: 300 }));
    expect(result.cash).toBe(100);
  });

  it('onRefused can apply both ratingPenalty and cashPenalty simultaneously', () => {
    const def = makeDef({ ratingPenalty: 0.5, cashPenalty: 100 });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState({ rating: 3.0, cash: 200 }));
    expect(result.rating).toBeCloseTo(2.5);
    expect(result.cash).toBe(100);
  });

  it('onRefused sets gameOver when gameOver is true', () => {
    const def = makeDef({ gameOver: true });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState());
    expect(result.gameOver).toBe(true);
    expect(result.gameOverCharacterId).toBe('test-vip');
    expect(result.gameOverReason).toBe('VIP');
  });

  it('onRefused clamps rating and cash to 0', () => {
    const def = makeDef({ ratingPenalty: 10, cashPenalty: 500 });
    const vip = new StandardVip(def);
    const result = vip.onRefused(makeState({ rating: 1.0, cash: 50 }));
    expect(result.rating).toBe(0);
    expect(result.cash).toBe(0);
  });

  it('onSeated returns empty partial (no special reward)', () => {
    const vip = new StandardVip(makeDef());
    const result = vip.onSeated(makeState());
    expect(result).toEqual({});
  });
});

// StandardBanned
describe('StandardBanned', () => {
  it('onSeated subtracts cashPenalty', () => {
    const def = makeDef({ role: 'BANNED', cashPenalty: 80 });
    const banned = new StandardBanned(def);
    const result = banned.onSeated(makeState({ cash: 200 }));
    expect(result.cash).toBe(120);
  });

  it('onSeated subtracts moralePenalty', () => {
    const def = makeDef({ role: 'BANNED', moralePenalty: 30 });
    const banned = new StandardBanned(def);
    const result = banned.onSeated(makeState({ morale: 80 }));
    expect(result.morale).toBe(50);
  });

  it('onSeated sets gameOver with BANNED reason', () => {
    const def = makeDef({ id: 'the-dictator', role: 'BANNED', gameOver: true });
    const banned = new StandardBanned(def);
    const result = banned.onSeated(makeState());
    expect(result.gameOver).toBe(true);
    expect(result.gameOverCharacterId).toBe('the-dictator');
    expect(result.gameOverReason).toBe('BANNED');
  });

  it('onRefused returns empty partial (justified refusal is handled by the caller)', () => {
    const banned = new StandardBanned(makeDef({ role: 'BANNED' }));
    expect(banned.onRefused(makeState())).toEqual({});
  });
});
