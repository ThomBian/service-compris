import { Reservation } from '../types';
import { FIRST_NAMES, LAST_NAMES } from '../constants';

interface GenerateOptions {
  nightNumber: number;
  rating: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function weightedPartySize(): number {
  const roll = Math.random();
  if (roll < 0.40) return Math.floor(Math.random() * 2) + 1;
  if (roll < 0.75) return Math.floor(Math.random() * 2) + 3;
  if (roll < 0.95) return Math.floor(Math.random() * 2) + 5;
  return Math.floor(Math.random() * 2) + 7;
}

function pickWithoutReplacement<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const picked: T[] = [];
  for (let i = 0; i < Math.min(count, copy.length); i++) {
    const idx = Math.floor(Math.random() * (copy.length - i));
    picked.push(copy[idx]);
    copy[idx] = copy[copy.length - i - 1];
  }
  return picked;
}

const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => 1170 + i * 15);

export function generateReservations({ nightNumber, rating }: GenerateOptions): Reservation[] {
  const ratingBonus = Math.round((rating - 3.0) * 2);
  const N = clamp(8 + Math.floor(nightNumber * 0.5) + ratingBonus, 4, 16);

  const firstPool = [...FIRST_NAMES].sort(() => Math.random() - 0.5);
  const lastPool = [...LAST_NAMES].sort(() => Math.random() - 0.5);

  const reservations: Reservation[] = Array.from({ length: N }, (_, i) => ({
    id: `res-proc-${nightNumber}-${i}`,
    time: TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)],
    firstName: firstPool[i % firstPool.length],
    lastName: lastPool[i % lastPool.length],
    partySize: weightedPartySize(),
    arrived: false,
    partySeated: false,
  }));

  // Inject first-name collisions (~15% of N, min 1 if N >= 2)
  const nameCollisionCount = Math.max(N >= 2 ? 1 : 0, Math.floor(N * 0.15));
  const nameSources = pickWithoutReplacement(reservations, nameCollisionCount);
  const nameTargetPool = reservations.filter(r => !nameSources.includes(r));
  const nameTargets = pickWithoutReplacement(nameTargetPool, nameCollisionCount);
  nameSources.forEach((src, i) => {
    if (nameTargets[i]) nameTargets[i].firstName = src.firstName;
  });

  // Inject time collisions (~15% of N) from remaining reservations
  const timeCollisionCount = Math.floor(N * 0.15);
  const remaining = reservations.filter(r => !nameSources.includes(r));
  const timeSources = pickWithoutReplacement(remaining, timeCollisionCount);
  const timeTargetPool = reservations.filter(r => !timeSources.includes(r) && !nameSources.includes(r));
  const timeTargets = pickWithoutReplacement(timeTargetPool, timeCollisionCount);
  timeSources.forEach((src, i) => {
    if (timeTargets[i]) timeTargets[i].time = src.time;
  });

  return reservations;
}
