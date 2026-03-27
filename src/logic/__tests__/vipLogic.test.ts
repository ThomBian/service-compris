import { describe, it, expect } from 'vitest';
import { generateDailyVips, injectVipReservations, computeVipRefusalOutcome } from '../vipLogic';
import { generateClientData } from '../gameLogic';
import type { Vip } from '../../types';
import { START_TIME } from '../../constants';

const FOOD_CRITIC: Vip = {
  id: 'food-critic',
  name: 'The Food Critic',
  visualTraits: { skinTone: 1, hairStyle: 0, hairColor: 5, clothingStyle: 0, clothingColor: 0, height: 1, facialHair: 0, neckwear: 0 },
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Marcel', aliasLastName: 'Dupont',
  expectedPartySize: 2,
  consequenceTier: 'RATING',
  consequenceDescription: 'The review will be devastating.',
};

const THE_OWNER: Vip = {
  id: 'the-owner',
  name: 'The Owner',
  visualTraits: { skinTone: 2, hairStyle: 3, hairColor: 1, clothingStyle: 0, clothingColor: 0, height: 2, hat: 0, neckwear: 1 },
  arrivalMO: 'WALK_IN',
  expectedPartySize: 1,
  consequenceTier: 'GAME_OVER',
  consequenceDescription: "You're fired.",
};

const THE_INSPECTOR: Vip = {
  id: 'the-inspector',
  name: 'The Health Inspector',
  visualTraits: { skinTone: 0, hairStyle: 2, hairColor: 3, clothingStyle: 3, clothingColor: 2, height: 0, facialHair: 1, neckwear: 2 },
  arrivalMO: 'LATE',
  expectedPartySize: 3,
  consequenceTier: 'CASH_FINE',
  cashFinePenalty: 200,
  consequenceDescription: 'The fine will sting.',
};

describe('generateDailyVips', () => {
  it('returns empty array when roster is empty', () => {
    expect(generateDailyVips(1, [])).toEqual([]);
  });

  it('returns empty array when difficulty is 0', () => {
    expect(generateDailyVips(0, [FOOD_CRITIC, THE_OWNER])).toEqual([]);
  });

  it('never returns duplicates across 50 runs', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyVips(2, [FOOD_CRITIC, THE_OWNER, THE_INSPECTOR]);
      const ids = result.map(v => v.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('never returns more VIPs than roster size', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyVips(3, [FOOD_CRITIC, THE_OWNER]);
      expect(result.length).toBeLessThanOrEqual(2);
    }
  });

  it('is probabilistic at difficulty 1 — count varies across 200 runs', () => {
    const counts = new Set<number>();
    for (let i = 0; i < 200; i++) {
      counts.add(generateDailyVips(1, [FOOD_CRITIC, THE_OWNER, THE_INSPECTOR]).length);
    }
    expect(counts.size).toBeGreaterThan(1);
  });
});

describe('injectVipReservations', () => {
  it('creates a fake reservation for RESERVATION_ALIAS VIPs', () => {
    const result = injectVipReservations([FOOD_CRITIC], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vip-res-food-critic');
    expect(result[0].firstName).toBe('Marcel');
    expect(result[0].lastName).toBe('Dupont');
    expect(result[0].partySize).toBe(2);
    expect(result[0].time).toBe(START_TIME + 60);
    expect(result[0].arrived).toBe(false);
    expect(result[0].partySeated).toBe(false);
  });

  it('does not inject a reservation for WALK_IN VIPs', () => {
    const result = injectVipReservations([THE_OWNER], []);
    expect(result).toHaveLength(0);
  });
});

describe('generateClientData excludeTraits', () => {
  it('never generates a client whose visualTraits exactly match an excluded VIP', () => {
    const vipTraits = FOOD_CRITIC.visualTraits;
    for (let i = 0; i < 200; i++) {
      const { visualTraits } = generateClientData(undefined, [], undefined, [], [vipTraits]);
      const isMatch =
        visualTraits.skinTone      === vipTraits.skinTone &&
        visualTraits.hairStyle     === vipTraits.hairStyle &&
        visualTraits.hairColor     === vipTraits.hairColor &&
        visualTraits.clothingStyle === vipTraits.clothingStyle &&
        visualTraits.clothingColor === vipTraits.clothingColor &&
        visualTraits.height        === vipTraits.height &&
        visualTraits.hat           === vipTraits.hat &&
        visualTraits.facialHair    === vipTraits.facialHair &&
        visualTraits.neckwear      === vipTraits.neckwear;
      expect(isMatch, `Collision at iteration ${i}`).toBe(false);
    }
  });
});

describe('computeVipRefusalOutcome', () => {
  it('subtracts 1.5 stars for RATING tier, clamped to 0', () => {
    const result = computeVipRefusalOutcome(FOOD_CRITIC, { cash: 100, rating: 3.0, gameOver: false });
    expect(result.rating).toBeCloseTo(1.5);
    expect(result.cash).toBe(100);
    expect(result.gameOver).toBe(false);

    const clamped = computeVipRefusalOutcome(FOOD_CRITIC, { cash: 100, rating: 1.0, gameOver: false });
    expect(clamped.rating).toBe(0);
  });

  it('subtracts cashFinePenalty from cash for CASH_FINE tier, clamped to 0', () => {
    const result = computeVipRefusalOutcome(THE_INSPECTOR, { cash: 300, rating: 4.0, gameOver: false });
    expect(result.cash).toBe(100);
    expect(result.rating).toBe(4.0);

    const clamped = computeVipRefusalOutcome(THE_INSPECTOR, { cash: 50, rating: 4.0, gameOver: false });
    expect(clamped.cash).toBe(0);
  });

  it('sets gameOver to true for GAME_OVER tier', () => {
    const result = computeVipRefusalOutcome(THE_OWNER, { cash: 100, rating: 4.0, gameOver: false });
    expect(result.gameOver).toBe(true);
  });
});
