import type { NightConfig, CampaignPath } from '../types/campaign';

const NIGHT_1_DEFAULT: NightConfig = {
  newspaper: 'LE SOLSTICE REOPENS: CAN IT SURVIVE THE HYPE?',
  quote: 'A restaurant is a theater, and you are the bouncer. Don\'t let the ugly people on the stage.',
  memo: 'Tonight is your first night. Learn the basics: manage the queue, seat the guests, watch the floor.',
  characterIds: ['the-phantom-eater'],
  rules: [],
};

const NIGHT_2_DEFAULT: NightConfig = {
  newspaper: 'NEW MAÎTRE D\' SHOWS PROMISE, BUT THE REAL TEST BEGINS.',
  quote: 'Rules are the foundation of society. But cash is the foundation of this building. Don\'t confuse the two.',
  memo: 'Two unusual guests tonight. Your choices tonight will define what kind of house this becomes.',
  characterIds: ['the-phantom-eater', 'mr-feast', 'the-syndicate'],
  rules: [],
};

// Stub template for branching nights — content TBD in lore pass
const stub = (headline: string): NightConfig => ({
  newspaper: headline,
  quote: '...',
  memo: '...',
  characterIds: [],
  rules: [],
});

export const CAMPAIGN_CONFIG: Record<number, Record<CampaignPath, NightConfig>> = {
  1: { default: NIGHT_1_DEFAULT, underworld: NIGHT_1_DEFAULT, michelin: NIGHT_1_DEFAULT, viral: NIGHT_1_DEFAULT },
  2: { default: NIGHT_2_DEFAULT, underworld: NIGHT_2_DEFAULT, michelin: NIGHT_2_DEFAULT, viral: NIGHT_2_DEFAULT },
  3: {
    default: stub('THE RESTAURANT FINDS ITS RHYTHM.'),
    underworld: stub('LOUD NOISES AND FAT TIPS AT LOCAL BISTRO.'),
    michelin: stub('IS LE SOLSTICE THE STRICTEST RESTAURANT IN THE WORLD?'),
    viral: stub('THE PLACE TO BE SEEN: LE SOLSTICE TRENDING GLOBALLY.'),
  },
  4: {
    default: stub('NIGHT FOUR AT LE SOLSTICE.'),
    underworld: stub('SYNDICATE LINKS RUMOURED AS TIPS FLOW FREELY.'),
    michelin: stub('WHISPERS OF AN INSPECTOR IN THE CITY.'),
    viral: stub('QUEUES FORM BEFORE OPENING TIME.'),
  },
  5: {
    default: stub('THE CITY IS WATCHING.'),
    underworld: stub('RUMORS OF MONEY LAUNDERING AT LE SOLSTICE.'),
    michelin: stub('CULINARY ELITE FLOCK TO IMPOSSIBLE-TO-BOOK RESTAURANT.'),
    viral: stub('INFLUENCER BRAWL OVER THE LAST WAGYU STEAK.'),
  },
  6: {
    default: stub('PENULTIMATE SERVICE.'),
    underworld: stub('THE SYNDICATE TIGHTENS ITS GRIP.'),
    michelin: stub('THE INSPECTOR\'S VERDICT APPROACHES.'),
    viral: stub('VIRAL MOMENTUM REACHES A FEVER PITCH.'),
  },
  7: {
    default: stub('THE FINAL NIGHT.'),
    underworld: stub('THE RAID — COPS AND BOSSES. DO NOT LET THEM TOUCH.'),
    michelin: stub('THE THREE STARS — PERFECTION IS NOT AN EXPECTATION; IT IS A THREAT.'),
    viral: stub('THE LIVE STREAM — 100 COVERS OR NOTHING.'),
  },
};
