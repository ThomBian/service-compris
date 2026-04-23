import type { BossDefinition, BossPolicyPenalty, GameState } from '../types';

const VIP_REFUSAL_DEFAULT: BossPolicyPenalty = {
  ratingLoss: 2,
  moraleLoss: 42,
  cashLoss: 280,
};

const BANNED_SEAT_DEFAULT: BossPolicyPenalty = {
  ratingLoss: 1.75,
  moraleLoss: 38,
  cashLoss: 220,
};

export function vipRefusalWrongPolicy(boss: BossDefinition): BossPolicyPenalty {
  return { ...VIP_REFUSAL_DEFAULT, ...boss.vipRefusalWrongPolicy };
}

export function bannedSeatWrongPolicy(boss: BossDefinition): BossPolicyPenalty {
  return { ...BANNED_SEAT_DEFAULT, ...boss.bannedSeatWrongPolicy };
}

export function applyBossPolicyPenalty(
  state: Pick<GameState, 'rating' | 'morale' | 'cash'>,
  penalty: BossPolicyPenalty,
): Pick<GameState, 'rating' | 'morale' | 'cash'> {
  return {
    rating: Math.max(0, state.rating - penalty.ratingLoss),
    morale: Math.max(0, state.morale - penalty.moraleLoss),
    cash: Math.max(0, state.cash - penalty.cashLoss),
  };
}
