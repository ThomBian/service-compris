import type { Banned, Reservation } from '../types';
import { START_TIME, SPAWN_PROBABILITY } from '../constants';

export function generateDailyBanned(difficulty: number, roster: Banned[]): Banned[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  const shuffled = [...roster].sort(() => Math.random() - 0.5);
  return shuffled.filter(() => Math.random() < p);
}

export function injectBannedReservations(
  dailyBanned: Banned[],
  existingReservations: Reservation[],
): Reservation[] {
  const bannedReservations: Reservation[] = dailyBanned
    .filter(b => b.arrivalMO === 'RESERVATION_ALIAS')
    .map((b, index) => ({
      id: 'banned-res-' + b.id,
      // Stagger times by 15 min per banned alias so multiple aliases don't collide.
      time: START_TIME + 60 + index * 15,
      firstName: b.aliasFirstName ?? b.name,
      lastName: b.aliasLastName ?? '',
      partySize: b.expectedPartySize,
      arrived: false,
      partySeated: false,
    }));
  return [...existingReservations, ...bannedReservations];
}

export function computeBannedSeatingOutcome(
  banned: Banned,
  current: { cash: number; morale: number; rating: number; gameOver: boolean },
): { cash: number; morale: number; rating: number; gameOver: boolean } {
  switch (banned.consequenceTier) {
    case 'CASH_FINE':
      return { ...current, cash: Math.max(0, current.cash - (banned.cashFinePenalty ?? 0)) };
    case 'MORALE':
      return { ...current, morale: Math.max(0, current.morale - (banned.moralePenalty ?? 0)) };
    case 'RATING':
      return { ...current, rating: Math.max(0, current.rating - (banned.ratingPenalty ?? 0)) };
    case 'GAME_OVER':
      return { ...current, gameOver: true };
  }
}
