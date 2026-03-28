import type { NightConfig, CampaignPath } from '../types/campaign';

const NIGHT_1_DEFAULT: NightConfig = {
  newspaper: 'LE SOLSTICE REOPENS: CAN IT SURVIVE THE HYPE?',
  newspaperDeck: 'After two years of silence, the city\'s most discussed dining room returns — this time with a new face at the podium.',
  newspaperBodyLeft: 'The doors of Le Solstice swung open last night for the first time since the incident that shuttered it — an incident which, depending on who you ask, involved either a structural survey or a dispute of considerably more personal nature between the previous management and its principal investor, one Monsieur V.\n\nThe queue that formed an hour before opening was, by all accounts, a social spectacle in itself: a former deputy mayor, three food bloggers of competing persuasions, and a gentleman in a white linen suit who declined to give his name but accepted a complimentary aperitif from a passing server nonetheless.',
  newspaperBodyRight: 'Whether Le Solstice has changed, or merely refreshed its surface, remains to be seen. What is certain is that the new Maître D\' — whose name the management declined to share — will be the test. A dining room lives or dies at the podium.\n\nOur correspondent notes that the amuse-bouches arrived eleven minutes late and the bread basket without tongs, a detail which Monsieur V., observed briefly in the corridor, did not appear to notice. Whether this is reassuring or alarming is a matter of perspective. We shall return.',
  quote: 'A restaurant is a theater, and you are the bouncer. Don\'t let the ugly people on the stage.',
  memo: 'Tonight is your first night. Learn the basics: manage the queue, seat the guests, watch the floor.',
  characterIds: ['the-phantom-eater'],
  rules: [],
};

const NIGHT_2_DEFAULT: NightConfig = {
  newspaper: 'NEW MAÎTRE D\' SHOWS PROMISE, BUT THE REAL TEST BEGINS.',
  newspaperDeck: 'First impressions suggest a steady hand at the door — but the crowd grows stranger, and the city is watching with appetite.',
  newspaperBodyLeft: 'A second night, and the queue outside Le Solstice was longer by a third. This is either a sign of genuine curiosity or the particular hunger that attends anything the city has been told it cannot have. Both are equally likely, and equally dangerous.\n\nThe Maître D\' was observed turning away at least three parties before nine o\'clock. Two were smiling when they left. The third was not, and paused long enough on the pavement to suggest a review may be forthcoming.',
  newspaperBodyRight: 'The real question — whether the house can hold its standards as the guests grow more unusual — is one this correspondent cannot answer from the street. A table has been requested through the proper channels. We are, as yet, unanswered.\n\nMonsieur V. was not sighted. This may be the most telling detail of the evening.',
  quote: 'Rules are the foundation of society. But cash is the foundation of this building. Don\'t confuse the two.',
  memo: 'Two unusual guests tonight. Your choices will define what kind of house this becomes.',
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
