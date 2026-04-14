import { describe, it, expect } from 'vitest';
import { BOSS_ROSTER } from '../../data/bossRoster';
import type { GameState } from '../../types';
import { CellState } from '../../types';

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
      Array(4).fill(null).map((_, x) => ({ id: `${x}-${y}`, x, y, state: CellState.EMPTY })),
    ),
    cash: 0,
    rating: 3.0,
    morale: 80,
    logs: [],
    dailyCharacterIds: [],
    seatedCharacterIds: [],
    gameOverCharacterId: null,
    strikeActive: false,
    gameOver: false,
    gameOverReason: null,
    nightNumber: 2,
    coversSeated: 0,
    shiftRevenue: 0,
    activeRules: [],
    firedEventIds: [],
    revealedTools: ['LEDGER', 'PARTY_TICKET', 'CLIPBOARD_VIP', 'CLIPBOARD_BANNED'],
    nightEndPending: false,
    activeBossEncounter: null,
    ...overrides,
  } as GameState;
}

describe('BOSS_ROSTER', () => {
  it('has exactly 4 bosses', () => {
    expect(BOSS_ROSTER).toHaveLength(4);
  });

  it('each boss has a unique id', () => {
    const ids = BOSS_ROSTER.map(b => b.id);
    expect(new Set(ids).size).toBe(4);
  });

  describe('Syndicate Don (syndicate-don)', () => {
    const don = () => BOSS_ROSTER.find(b => b.id === 'syndicate-don')!;
    it('exists and is VIP', () => {
      expect(don().role).toBe('VIP');
      expect(don().miniGame).toBe('HANDSHAKE');
    });
    it('spawns when cash >= 600', () => {
      expect(don().spawnCondition(makeState({ cash: 599 }))).toBe(false);
      expect(don().spawnCondition(makeState({ cash: 600 }))).toBe(true);
    });
  });

  describe('Grand Inquisitor (grand-inquisitor)', () => {
    const inq = () => BOSS_ROSTER.find(b => b.id === 'grand-inquisitor')!;
    it('exists and is BANNED', () => {
      expect(inq().role).toBe('BANNED');
      expect(inq().miniGame).toBe('WHITE_GLOVE');
    });
    it('spawns when rating >= 4.0 and time >= 1290', () => {
      expect(inq().spawnCondition(makeState({ rating: 4.0, inGameMinutes: 1289 }))).toBe(false);
      expect(inq().spawnCondition(makeState({ rating: 3.9, inGameMinutes: 1290 }))).toBe(false);
      expect(inq().spawnCondition(makeState({ rating: 4.0, inGameMinutes: 1290 }))).toBe(true);
    });
  });

  describe('Influencer Megastar (influencer-megastar)', () => {
    const inf = () => BOSS_ROSTER.find(b => b.id === 'influencer-megastar')!;
    it('exists and is VIP', () => {
      expect(inf().role).toBe('VIP');
      expect(inf().miniGame).toBe('PAPARAZZI');
    });
    it('spawns when shiftRevenue >= 400', () => {
      expect(inf().spawnCondition(makeState({ shiftRevenue: 399 }))).toBe(false);
      expect(inf().spawnCondition(makeState({ shiftRevenue: 400 }))).toBe(true);
    });
  });

  describe('Aristocrat (aristocrat)', () => {
    const aris = () => BOSS_ROSTER.find(b => b.id === 'aristocrat')!;
    it('exists and is BANNED', () => {
      expect(aris().role).toBe('BANNED');
      expect(aris().miniGame).toBe('COAT_CHECK');
    });
    it('spawns when morale <= 65 and queue.length >= 3', () => {
      const q3 = Array(3).fill({ id: 'x', patience: 100 });
      expect(aris().spawnCondition(makeState({ morale: 65, queue: [] }))).toBe(false);
      expect(aris().spawnCondition(makeState({ morale: 66, queue: q3 as any }))).toBe(false);
      expect(aris().spawnCondition(makeState({ morale: 65, queue: q3 as any }))).toBe(true);
    });
  });
});
