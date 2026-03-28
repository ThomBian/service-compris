import type { CharacterDefinition, Reservation } from '../types';
import { START_TIME, SPAWN_PROBABILITY } from '../constants';

export const CHARACTER_ROSTER: CharacterDefinition[] = [
  // ── Lore VIPs ──────────────────────────────────────────────────────────────
  {
    id: 'the-syndicate',
    name: 'The Syndicate',
    role: 'VIP',
    behaviorType: 'BYPASS_QUEUE',
    arrivalMO: 'BYPASS',
    expectedPartySize: 4,
    clueText: 'Watch out for the Pinstripes tonight.',
    visualTraits: { skinTone: 1, hairStyle: 1, hairColor: 1, clothingStyle: 3, clothingColor: 4, height: 1 },
    cashBonus: 500,
    ratingPenalty: 1.0,
    moralePenalty: 20,
    consequenceDescription: 'They smash the front window.',
  },
  {
    id: 'manu-macaroon',
    name: 'Manu Macaroon',
    role: 'VIP',
    behaviorType: 'AURA_DRAIN',
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Manu',
    aliasLastName: 'Macaroon',
    expectedPartySize: 4,   // true arrival size (with +2 security)
    reservedPartySize: 2,   // size injected into the reservation — the trap
    clueText: "The President is coming. Navy suit, tiny espresso cup. He brings security.",
    visualTraits: { skinTone: 2, hairStyle: 3, hairColor: 2, clothingStyle: 0, clothingColor: 4, height: 1, neckwear: 0 },
    auraRecovery: 'ON_SEATING',
    ratingPenalty: 0.5,
    moralePenalty: 10,
    consequenceDescription: 'Workers strike! Queue patience drains at double speed.',
  },
  // ── Translated placeholder VIPs ────────────────────────────────────────────
  {
    id: 'food-critic',
    name: 'The Food Critic',
    role: 'VIP',
    behaviorType: 'STANDARD_VIP',
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Marcel',
    aliasLastName: 'Dupont',
    expectedPartySize: 2,
    clueText: 'A critic is dining incognito tonight. Seat them flawlessly.',
    visualTraits: { skinTone: 1, hairStyle: 0, hairColor: 5, clothingStyle: 0, clothingColor: 0, height: 1, facialHair: 0, neckwear: 0 },
    ratingPenalty: 1.5,
    consequenceDescription: 'The review will be devastating.',
  },
  {
    id: 'the-owner',
    name: 'The Owner',
    role: 'VIP',
    behaviorType: 'STANDARD_VIP',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    clueText: "The owner may drop in unannounced. Do NOT refuse them.",
    visualTraits: { skinTone: 2, hairStyle: 3, hairColor: 1, clothingStyle: 0, clothingColor: 0, height: 2, hat: 0, neckwear: 1 },
    gameOver: true,
    consequenceDescription: "You're fired.",
  },
  {
    id: 'the-inspector',
    name: 'The Health Inspector',
    role: 'VIP',
    behaviorType: 'STANDARD_VIP',
    arrivalMO: 'LATE',
    expectedPartySize: 3,
    clueText: 'Health inspector coming tonight. They arrive late — do not accuse them of a Time Crime.',
    visualTraits: { skinTone: 0, hairStyle: 2, hairColor: 3, clothingStyle: 3, clothingColor: 2, height: 0, facialHair: 1, neckwear: 2 },
    cashPenalty: 200,
    consequenceDescription: 'The fine will sting.',
  },
  // ── Translated placeholder Banned ──────────────────────────────────────────
  {
    id: 'fake-hipster',
    name: 'The Fake Hipster',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    clueText: 'Skips the bill every time.',
    visualTraits: { skinTone: 3, hairStyle: 4, hairColor: 2, clothingStyle: 1, clothingColor: 3, height: 1, glasses: 0 },
    cashPenalty: 80,
    consequenceDescription: 'The Fake Hipster skips the bill. -€80.',
  },
  {
    id: 'drunk-group',
    name: 'The Drunk Group',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'LATE',
    expectedPartySize: 4,
    clueText: 'Rowdy crew. Do not seat.',
    visualTraits: { skinTone: 2, hairStyle: 1, hairColor: 0, clothingStyle: 2, clothingColor: 1, height: 2, eyebrows: 1 },
    moralePenalty: 30,
    consequenceDescription: "Rowdy crew all night. Staff morale tanks. -30 morale.",
  },
  {
    id: 'small-spender',
    name: 'The Small Spender',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'WALK_IN',
    expectedPartySize: 2,
    clueText: 'Orders tap water and shares a starter.',
    visualTraits: { skinTone: 0, hairStyle: 3, hairColor: 4, clothingStyle: 3, clothingColor: 4, height: 0, glasses: 0, eyebrows: 0 },
    cashPenalty: 30,
    consequenceDescription: 'They order tap water and share a starter. -€30.',
  },
  {
    id: 'fake-influencer',
    name: 'The Fake Influencer',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Chloé',
    aliasLastName: 'Lacroix',
    expectedPartySize: 1,
    clueText: 'Posted a hit piece last time.',
    visualTraits: { skinTone: 4, hairStyle: 0, hairColor: 3, clothingStyle: 1, clothingColor: 2, height: 1, glasses: 1 },
    ratingPenalty: 1.5,
    consequenceDescription: 'Charmed a free meal, then posted a hit piece. -1.5 stars.',
  },
  {
    id: 'the-dictator',
    name: 'The Dictator',
    role: 'BANNED',
    behaviorType: 'STANDARD_BANNED',
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Viktor',
    aliasLastName: 'Blanc',
    expectedPartySize: 3,
    clueText: 'Extremely dangerous. Do not seat under any circumstances.',
    visualTraits: { skinTone: 1, hairStyle: 2, hairColor: 1, clothingStyle: 0, clothingColor: 4, height: 2, eyebrows: 0 },
    gameOver: true,
    consequenceDescription: "Didn't like the food. Attacked the restaurant.",
  },
];

export function generateDailyCharacters(
  difficulty: number,
  roster: CharacterDefinition[],
): CharacterDefinition[] {
  if (difficulty === 0 || roster.length === 0) return [];
  const p = SPAWN_PROBABILITY[Math.min(difficulty, 3)];
  return [...roster].sort(() => Math.random() - 0.5).filter(() => Math.random() < p);
}

export function injectCharacterReservations(
  dailyChars: CharacterDefinition[],
  existingReservations: Reservation[],
): Reservation[] {
  const injected: Reservation[] = dailyChars
    .filter(c => c.arrivalMO === 'RESERVATION_ALIAS')
    .map((c, index) => {
      // reservedPartySize lets a character arrive with more people than their booking.
      // Falls back to expectedPartySize when not set.
      const reservationSize = c.reservedPartySize ?? c.expectedPartySize;
      return {
        id: 'char-res-' + c.id,
        time: START_TIME + 60 + index * 15,
        firstName: c.aliasFirstName ?? c.name,
        lastName: c.aliasLastName ?? '',
        partySize: reservationSize,
        arrived: false,
        partySeated: false,
      };
    });
  return [...existingReservations, ...injected];
}
