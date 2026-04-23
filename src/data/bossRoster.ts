import type { BossDefinition, MiniGameId } from "../types";

/** Order matches Shift+Alt+1 … 4 in dev (`GameContent`). */
export const DEV_MINI_GAME_ORDER = [
  "HANDSHAKE",
  "WHITE_GLOVE",
  "PAPARAZZI",
  "COAT_CHECK",
] as const satisfies readonly MiniGameId[];

export function bossForMiniGame(miniGame: MiniGameId): BossDefinition {
  const boss = BOSS_ROSTER.find(b => b.miniGame === miniGame);
  if (!boss) throw new Error(`No boss for mini game: ${miniGame}`);
  return boss;
}

export const BOSS_ROSTER: BossDefinition[] = [
  {
    id: "syndicate-don",
    name: "The Syndicate Don",
    role: "VIP",
    behaviorType: "STANDARD_VIP",
    miniGame: "HANDSHAKE",
    quoteKey: "boss.syndicateDon.quote",
    introLineKeys: [
      "boss.syndicateDon.intro1",
      "boss.syndicateDon.intro2",
    ],
    arrivalMO: "WALK_IN",
    expectedPartySize: 4,
    clueText: "Watch out for the Pinstripes tonight.",
    visualTraits: {
      skinTone: 1,
      hairStyle: 1,
      hairColor: 1,
      clothingStyle: 3,
      clothingColor: 4,
      height: 2,
      facialHair: 1,
      neckwear: 0,
    },
    cashBonus: 1000,
    moralePenalty: 25,
    ratingPenalty: 1.0,
    consequenceDescription: "They leave a briefcase of cash on the ledger.",
    refusalDescription: "The Don smashes the front window.",
    vipRefusalWrongPolicy: { ratingLoss: 2.75, moraleLoss: 55, cashLoss: 450 },
    spawnCondition: (s) => s.cash >= 3000,
  },
  {
    id: "grand-inquisitor",
    name: "The Grand Inquisitor",
    role: "BANNED",
    behaviorType: "STANDARD_BANNED",
    miniGame: "WHITE_GLOVE",
    quoteKey: "boss.grandInquisitor.quote",
    introLineKeys: [
      "boss.grandInquisitor.intro1",
      "boss.grandInquisitor.intro2",
    ],
    arrivalMO: "WALK_IN",
    expectedPartySize: 1,
    clueText:
      "The Inquisition is doing random inspections. Look for the Crimson Ascot.",
    visualTraits: {
      skinTone: 2,
      hairStyle: 3,
      hairColor: 1,
      clothingStyle: 3,
      clothingColor: 1,
      height: 2,
      neckwear: 2,
    },
    ratingPenalty: 2.0,
    moralePenalty: 0,
    consequenceDescription:
      'The Inquisitor mutters, "Acceptable." Rating immunity granted.',
    refusalDescription:
      "The Inquisitor screams. Two full stars lost immediately.",
    bannedSeatWrongPolicy: { ratingLoss: 1.25, moraleLoss: 28, cashLoss: 180 },
    spawnCondition: (s) => s.rating >= 4.5 && s.inGameMinutes >= 1290,
  },
  {
    id: "influencer-megastar",
    name: "The Influencer",
    role: "VIP",
    behaviorType: "STANDARD_VIP",
    miniGame: "PAPARAZZI",
    quoteKey: "boss.influencer.quote",
    introLineKeys: [
      "boss.influencer.intro1",
      "boss.influencer.intro2",
    ],
    arrivalMO: "WALK_IN",
    expectedPartySize: 2,
    clueText: "A megastar is rumored to visit tonight. Neon hoodie.",
    visualTraits: {
      skinTone: 3,
      hairStyle: 2,
      hairColor: 5,
      clothingStyle: 2,
      clothingColor: 3,
      height: 1,
    },
    moralePenalty: 15,
    ratingPenalty: 0,
    consequenceDescription:
      "Their viral post instantly refills the queue patience meters.",
    refusalDescription:
      "The Influencer is caught from a bad angle. Massive queue patience drain.",
    vipRefusalWrongPolicy: { ratingLoss: 2.1, moraleLoss: 48, cashLoss: 320 },
    spawnCondition: (s) => s.shiftRevenue >= 1500,
  },
  {
    id: "aristocrat",
    name: "The Duchess",
    role: "BANNED",
    behaviorType: "STANDARD_BANNED",
    miniGame: "COAT_CHECK",
    quoteKey: "boss.aristocrat.quote",
    introLineKeys: [
      "boss.aristocrat.intro1",
      "boss.aristocrat.intro2",
    ],
    arrivalMO: "WALK_IN",
    expectedPartySize: 2,
    clueText: "The Duchess is coming. She brings her own lighting.",
    visualTraits: {
      skinTone: 0,
      hairStyle: 4,
      hairColor: 0,
      clothingStyle: 3,
      clothingColor: 1,
      height: 2,
      hat: 0,
    },
    gameOver: true,
    moralePenalty: 0,
    ratingPenalty: 0,
    consequenceDescription: "The Duchess scoffs and demands her table.",
    refusalDescription: "The poodle hits the floor. YOU ARE FIRED.",
    /** `onSeated` already fires game over — keep extra policy hits light. */
    bannedSeatWrongPolicy: { ratingLoss: 0, moraleLoss: 12, cashLoss: 80 },
    spawnCondition: (s) => s.morale <= 65 && s.queue.length >= 3,
  },
];
