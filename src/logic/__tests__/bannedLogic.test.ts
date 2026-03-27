import { describe, it, expect } from 'vitest';
import { generateDailyBanned, injectBannedReservations, computeBannedSeatingOutcome } from '../bannedLogic';
import type { Banned } from '../../types';
import { START_TIME } from '../../constants';

const CASH_FINE_BANNED: Banned = {
  id: 'fake-hipster',
  name: 'The Fake Hipster',
  visualTraits: { skinTone: 3, hairStyle: 4, hairColor: 2, clothingStyle: 1, clothingColor: 3, height: 1, glasses: 0 },
  arrivalMO: 'WALK_IN',
  expectedPartySize: 1,
  consequenceTier: 'CASH_FINE',
  cashFinePenalty: 80,
  consequenceDescription: 'Skips the bill.',
};

const MORALE_BANNED: Banned = {
  id: 'drunk-group',
  name: 'The Drunk Group',
  visualTraits: { skinTone: 2, hairStyle: 1, hairColor: 0, clothingStyle: 2, clothingColor: 1, height: 2, eyebrows: 1 },
  arrivalMO: 'LATE',
  expectedPartySize: 4,
  consequenceTier: 'MORALE',
  moralePenalty: 30,
  consequenceDescription: 'Morale tanks.',
};

const RATING_BANNED: Banned = {
  id: 'fake-influencer',
  name: 'The Fake Influencer',
  visualTraits: { skinTone: 4, hairStyle: 0, hairColor: 3, clothingStyle: 1, clothingColor: 2, height: 1, glasses: 1 },
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Chloé',
  aliasLastName: 'Lacroix',
  expectedPartySize: 1,
  consequenceTier: 'RATING',
  ratingPenalty: 1.5,
  consequenceDescription: 'Hit piece published.',
};

const GAME_OVER_BANNED: Banned = {
  id: 'the-dictator',
  name: 'The Dictator',
  visualTraits: { skinTone: 1, hairStyle: 2, hairColor: 1, clothingStyle: 0, clothingColor: 4, height: 2, eyebrows: 0 },
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Viktor',
  aliasLastName: 'Blanc',
  expectedPartySize: 3,
  consequenceTier: 'GAME_OVER',
  consequenceDescription: 'Game over.',
};

const ALL_FOUR = [CASH_FINE_BANNED, MORALE_BANNED, RATING_BANNED, GAME_OVER_BANNED];

describe('generateDailyBanned', () => {
  it('returns [] at difficulty 0', () => {
    expect(generateDailyBanned(0, ALL_FOUR)).toEqual([]);
  });

  it('returns [] for empty roster', () => {
    expect(generateDailyBanned(2, [])).toEqual([]);
  });

  it('never returns duplicates across 50 runs', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyBanned(2, ALL_FOUR);
      const ids = result.map(b => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('never returns more than roster size', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyBanned(3, ALL_FOUR);
      expect(result.length).toBeLessThanOrEqual(ALL_FOUR.length);
    }
  });
});

describe('injectBannedReservations', () => {
  it('injects a reservation for RESERVATION_ALIAS banned', () => {
    const result = injectBannedReservations([RATING_BANNED], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('banned-res-fake-influencer');
    expect(result[0].time).toBe(START_TIME + 60);
  });

  it('does not inject reservation for WALK_IN banned', () => {
    const result = injectBannedReservations([CASH_FINE_BANNED], []);
    expect(result).toHaveLength(0);
  });

  it('does not inject reservation for LATE banned', () => {
    const result = injectBannedReservations([MORALE_BANNED], []);
    expect(result).toHaveLength(0);
  });
});

describe('computeBannedSeatingOutcome', () => {
  it('CASH_FINE subtracts penalty from cash', () => {
    const out = computeBannedSeatingOutcome(CASH_FINE_BANNED, { cash: 200, morale: 100, rating: 5, gameOver: false });
    expect(out.cash).toBe(120);
    expect(out.morale).toBe(100);
    expect(out.gameOver).toBe(false);
  });

  it('CASH_FINE floors cash at 0', () => {
    const out = computeBannedSeatingOutcome(CASH_FINE_BANNED, { cash: 50, morale: 100, rating: 5, gameOver: false });
    expect(out.cash).toBe(0);
  });

  it('MORALE subtracts penalty from morale', () => {
    const out = computeBannedSeatingOutcome(MORALE_BANNED, { cash: 200, morale: 60, rating: 5, gameOver: false });
    expect(out.morale).toBe(30);
  });

  it('MORALE floors morale at 0', () => {
    const out = computeBannedSeatingOutcome(MORALE_BANNED, { cash: 200, morale: 20, rating: 5, gameOver: false });
    expect(out.morale).toBe(0);
  });

  it('RATING subtracts penalty from rating', () => {
    const out = computeBannedSeatingOutcome(RATING_BANNED, { cash: 200, morale: 100, rating: 5, gameOver: false });
    expect(out.rating).toBeCloseTo(3.5);
  });

  it('RATING floors rating at 0', () => {
    const out = computeBannedSeatingOutcome(RATING_BANNED, { cash: 200, morale: 100, rating: 1, gameOver: false });
    expect(out.rating).toBe(0);
  });

  it('GAME_OVER sets gameOver to true', () => {
    const out = computeBannedSeatingOutcome(GAME_OVER_BANNED, { cash: 200, morale: 100, rating: 5, gameOver: false });
    expect(out.gameOver).toBe(true);
  });
});
