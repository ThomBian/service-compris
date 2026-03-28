import type { NightConfig, CampaignPath } from '../types/campaign';

const NIGHT_1_DEFAULT: NightConfig = {
  characterIds: ['the-phantom-eater'],
  rules: [],
};

const NIGHT_2_DEFAULT: NightConfig = {
  characterIds: ['the-phantom-eater', 'mr-feast', 'the-syndicate'],
  rules: [],
};

const stub = (): NightConfig => ({
  characterIds: [],
  rules: [],
});

export const CAMPAIGN_CONFIG: Record<number, Record<CampaignPath, NightConfig>> = {
  1: { default: NIGHT_1_DEFAULT, underworld: NIGHT_1_DEFAULT, michelin: NIGHT_1_DEFAULT, viral: NIGHT_1_DEFAULT },
  2: { default: NIGHT_2_DEFAULT, underworld: NIGHT_2_DEFAULT, michelin: NIGHT_2_DEFAULT, viral: NIGHT_2_DEFAULT },
  3: {
    default: stub(),
    underworld: stub(),
    michelin: stub(),
    viral: stub(),
  },
  4: {
    default: stub(),
    underworld: stub(),
    michelin: stub(),
    viral: stub(),
  },
  5: {
    default: stub(),
    underworld: stub(),
    michelin: stub(),
    viral: stub(),
  },
  6: {
    default: stub(),
    underworld: stub(),
    michelin: stub(),
    viral: stub(),
  },
  7: {
    default: stub(),
    underworld: stub(),
    michelin: stub(),
    viral: stub(),
  },
};
