import type { Vip } from '../types';

export const VIP_ROSTER: Vip[] = [
  {
    id: 'food-critic',
    name: 'The Food Critic',
    visualTraits: {
      skinTone: 1, hairStyle: 0, hairColor: 5,
      clothingStyle: 0, clothingColor: 0, height: 1,
      facialHair: 0, neckwear: 0,
    },
    arrivalMO: 'RESERVATION_ALIAS',
    aliasFirstName: 'Marcel',
    aliasLastName: 'Dupont',
    expectedPartySize: 2,
    consequenceTier: 'RATING',
    consequenceDescription: 'The review will be devastating.',
  },
  {
    id: 'the-owner',
    name: 'The Owner',
    visualTraits: {
      skinTone: 2, hairStyle: 3, hairColor: 1,
      clothingStyle: 0, clothingColor: 0, height: 2,
      hat: 0, neckwear: 1,
    },
    arrivalMO: 'WALK_IN',
    expectedPartySize: 1,
    consequenceTier: 'GAME_OVER',
    consequenceDescription: "You're fired.",
  },
  {
    id: 'the-inspector',
    name: 'The Health Inspector',
    visualTraits: {
      skinTone: 0, hairStyle: 2, hairColor: 3,
      clothingStyle: 3, clothingColor: 2, height: 0,
      facialHair: 1, neckwear: 2,
    },
    arrivalMO: 'LATE',
    expectedPartySize: 3,
    consequenceTier: 'CASH_FINE',
    cashFinePenalty: 200,
    consequenceDescription: 'The fine will sting.',
  },
];
