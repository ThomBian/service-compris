import { describe, expect, it } from 'vitest';
import { BOSS_ROSTER } from '../../data/bossRoster';
import {
  applyBossPolicyPenalty,
  bannedSeatWrongPolicy,
  vipRefusalWrongPolicy,
} from '../bossWrongPolicy';

describe('bossWrongPolicy', () => {
  it('applies VIP refusal defaults when boss has no vipRefusalWrongPolicy', () => {
    const inq = BOSS_ROSTER.find(b => b.id === 'grand-inquisitor')!;
    const p = vipRefusalWrongPolicy(inq);
    expect(p.ratingLoss).toBe(2);
    expect(p.moraleLoss).toBe(42);
    expect(p.cashLoss).toBe(280);
  });

  it('merges roster overrides for the Don', () => {
    const don = BOSS_ROSTER.find(b => b.id === 'syndicate-don')!;
    const p = vipRefusalWrongPolicy(don);
    expect(p.ratingLoss).toBe(2.75);
    expect(p.moraleLoss).toBe(55);
    expect(p.cashLoss).toBe(450);
  });

  it('clamps stats at zero', () => {
    const don = BOSS_ROSTER.find(b => b.id === 'syndicate-don')!;
    const next = applyBossPolicyPenalty(
      { rating: 1, morale: 10, cash: 50 },
      vipRefusalWrongPolicy(don),
    );
    expect(next.rating).toBe(0);
    expect(next.morale).toBe(0);
    expect(next.cash).toBe(0);
  });

  it('uses banned seat roster overrides for the Inquisitor', () => {
    const inq = BOSS_ROSTER.find(b => b.id === 'grand-inquisitor')!;
    const p = bannedSeatWrongPolicy(inq);
    expect(p.ratingLoss).toBe(1.25);
    expect(p.moraleLoss).toBe(28);
    expect(p.cashLoss).toBe(180);
  });
});
