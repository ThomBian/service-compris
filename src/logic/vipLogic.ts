import type { Vip, Reservation, VisualTraits } from '../types';
import { START_TIME, SPAWN_PROBABILITY } from '../constants';

export function generateDailyVips(difficulty: number, roster: Vip[]): Vip[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.filter(() => Math.random() < p);
}

export function injectVipReservations(
  dailyVips: Vip[],
  existingReservations: Reservation[],
): Reservation[] {
  const vipReservations: Reservation[] = dailyVips
    .filter((v) => v.arrivalMO === 'RESERVATION_ALIAS')
    .map((v) => ({
      id: 'vip-res-' + v.id,
      time: START_TIME + 60,
      firstName: v.aliasFirstName ?? v.name,
      lastName: v.aliasLastName ?? '',
      partySize: v.expectedPartySize,
      arrived: false,
      partySeated: false,
    }));
  return [...existingReservations, ...vipReservations];
}

export function computeVipRefusalOutcome(
  vip: Vip,
  current: { cash: number; rating: number; gameOver: boolean },
): { cash: number; rating: number; gameOver: boolean } {
  switch (vip.consequenceTier) {
    case 'RATING':
      return { ...current, rating: Math.max(0, current.rating - 1.5) };
    case 'CASH_FINE':
      return { ...current, cash: Math.max(0, current.cash - (vip.cashFinePenalty ?? 0)) };
    case 'GAME_OVER':
      return { ...current, gameOver: true };
  }
}

export function traitsMatch(a: VisualTraits, b: VisualTraits): boolean {
  return (
    a.skinTone      === b.skinTone &&
    a.hairStyle     === b.hairStyle &&
    a.hairColor     === b.hairColor &&
    a.clothingStyle === b.clothingStyle &&
    a.clothingColor === b.clothingColor &&
    a.height        === b.height &&
    a.hat           === b.hat &&
    a.facialHair    === b.facialHair &&
    a.neckwear      === b.neckwear &&
    a.glasses       === b.glasses &&
    a.eyebrows      === b.eyebrows
  );
}
