import type { NightConfig, CampaignPath } from '../types/campaign';
import { START_TIME } from '../constants';

const NIGHT_1_DEFAULT: NightConfig = {
  characterIds: ['n1-vip-actor', 'n1-phantom-eater-night1'],
  rules: [
    { key: 'RESERVATIONS_DISABLED', value: true },
    { key: 'COVERS_TARGET', value: 5 },
  ],
  scriptedEvents: [
    {
      id: 'n1-step1-intro',
      trigger: { kind: 'TIME', minute: START_TIME + 2 },
      actions: [
        {
          kind: 'SHOW_DIALOGUE',
          lines: [
            'We are opening the doors.',
            'Seat these nobodies. Try not to trip over your own feet.',
          ],
        },
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-walkIn-couple', delayMinutes: 1 },
      ],
    },
    {
      id: 'n1-step2-ledger',
      trigger: { kind: 'TIME', minute: START_TIME + 8 },
      actions: [
        { kind: 'REVEAL_TOOL', tool: 'LEDGER' },
        {
          kind: 'SHOW_DIALOGUE',
          lines: [
            'From now on, we respect the book.',
            'If they claim a reservation, their name better be in there.',
          ],
        },
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-res-businessman', delayMinutes: 1 },
      ],
    },
    {
      id: 'n1-step3-ticket',
      trigger: { kind: 'TIME', minute: START_TIME + 15 },
      actions: [
        { kind: 'REVEAL_TOOL', tool: 'PARTY_TICKET' },
        {
          kind: 'SHOW_DIALOGUE',
          lines: [
            'Read the ticket carefully.',
            'If they are late, or brought extra friends, they are dead to us.',
          ],
        },
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-res-late-group', delayMinutes: 1 },
      ],
    },
    {
      id: 'n1-step4-vip',
      trigger: { kind: 'TIME', minute: START_TIME + 22 },
      actions: [
        { kind: 'REVEAL_TOOL', tool: 'CLIPBOARD_VIP' },
        {
          kind: 'SHOW_DIALOGUE',
          lines: [
            'Look at that obnoxious gold watch. That is a VIP.',
            'The rules do not apply to money. Check your VIP list.',
          ],
        },
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-vip-actor', delayMinutes: 1 },
      ],
    },
    {
      id: 'n1-step5-banned',
      trigger: { kind: 'TIME', minute: START_TIME + 29 },
      actions: [
        { kind: 'REVEAL_TOOL', tool: 'CLIPBOARD_BANNED' },
        {
          kind: 'SHOW_DIALOGUE',
          lines: [
            'Look at that chipped gold tooth.',
            'That rat has been eating here for free all month. Check the Banned list.',
          ],
        },
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-res-phantom', delayMinutes: 1 },
      ],
    },
  ],
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
