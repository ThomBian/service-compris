import type { NightConfig, CampaignPath } from "../types/campaign";
import {
  N1_T1,
  N1_T2,
  N1_T3,
  N1_T4,
  N1_T5,
  N1_T_CLOSE,
  NIGHT_1_SPAWN_DELAY,
  NIGHT_1_SHIFT_END_TIME,
} from "../constants";

const NIGHT_1_DEFAULT: NightConfig = {
  characterIds: ["n1-vip-actor", "n1-phantom-eater-night1"],
  rules: [
    { key: "RESERVATIONS_DISABLED", value: true },
    { key: "SHIFT_END_TIME", value: NIGHT_1_SHIFT_END_TIME },
  ],
  scriptedEvents: [
    // Step 1 — spawn couple immediately; MrV speaks when they reach the desk
    {
      id: "n1-step1-spawn",
      trigger: { kind: "TIME", minute: N1_T1 },
      actions: [{ kind: "SPAWN_CHARACTER", characterId: "n1-walkIn-couple" }],
    },
    {
      id: "n1-step1-intro",
      trigger: { kind: "CHARACTER_AT_DESK", characterId: "n1-walkIn-couple" },
      actions: [
        { kind: "SHOW_DIALOGUE", lines: ["mrv.n1Step1L1", "mrv.n1Step1L2"] },
      ],
    },
    // Step 2 — ledger revealed at beat; MrV speaks when businessman reaches the desk
    {
      id: "n1-step2-ledger-spawn",
      trigger: { kind: "TIME", minute: N1_T2 },
      actions: [
        {
          kind: "SPAWN_CHARACTER",
          characterId: "n1-res-businessman",
          delayMinutes: NIGHT_1_SPAWN_DELAY,
        },
      ],
    },
    {
      id: "n1-step2-ledger",
      trigger: { kind: "CHARACTER_AT_DESK", characterId: "n1-res-businessman" },
      actions: [
        { kind: "REVEAL_TOOL", tool: "LEDGER" },
        { kind: "SHOW_DIALOGUE", lines: ["mrv.n1Step2L1", "mrv.n1Step2L2", "mrv.n1Step2L3"] },
      ],
    },
    // Step 3 — ticket revealed at beat; MrV speaks when late group reaches the desk
    {
      id: "n1-step3-ticket-spawn",
      trigger: { kind: "TIME", minute: N1_T3 },
      actions: [
        { kind: "REVEAL_TOOL", tool: "PARTY_TICKET" },
        {
          kind: "SPAWN_CHARACTER",
          characterId: "n1-res-late-group",
          delayMinutes: NIGHT_1_SPAWN_DELAY,
        },
      ],
    },
    {
      id: "n1-step3-ticket",
      trigger: { kind: "CHARACTER_AT_DESK", characterId: "n1-res-late-group" },
      actions: [
        { kind: "SHOW_DIALOGUE", lines: ["mrv.n1Step3L1", "mrv.n1Step3L2"] },
      ],
    },
    // Step 4 — VIP clipboard revealed at beat; MrV speaks when VIP actor reaches the desk
    {
      id: "n1-step4-vip-spawn",
      trigger: { kind: "TIME", minute: N1_T4 },
      actions: [
        { kind: "REVEAL_TOOL", tool: "CLIPBOARD_VIP" },
        {
          kind: "SPAWN_CHARACTER",
          characterId: "n1-vip-actor",
          delayMinutes: NIGHT_1_SPAWN_DELAY,
        },
      ],
    },
    {
      id: "n1-step4-vip",
      trigger: { kind: "CHARACTER_AT_DESK", characterId: "n1-vip-actor" },
      actions: [
        { kind: "SHOW_DIALOGUE", lines: ["mrv.n1Step4L1", "mrv.n1Step4L2"] },
      ],
    },
    // Step 5 — Banned tab revealed at beat; MrV speaks when Phantom reaches the desk
    {
      id: "n1-step5-banned-spawn",
      trigger: { kind: "TIME", minute: N1_T5 },
      actions: [
        { kind: "REVEAL_TOOL", tool: "CLIPBOARD_BANNED" },
        {
          kind: "SPAWN_CHARACTER",
          characterId: "n1-res-phantom",
          delayMinutes: NIGHT_1_SPAWN_DELAY,
        },
      ],
    },
    {
      id: "n1-step5-banned",
      trigger: {
        kind: "CHARACTER_AT_DESK",
        characterId: "n1-phantom-eater-night1",
      },
      actions: [
        { kind: "SHOW_DIALOGUE", lines: ["mrv.n1Step5L1", "mrv.n1Step5L2"] },
      ],
    },
    // Closing — MrV signs off; the player must dismiss to end the night
    {
      id: "n1-closing",
      trigger: { kind: "TIME", minute: N1_T_CLOSE },
      actions: [
        { kind: "SHOW_DIALOGUE", lines: ["mrv.n1ClosingL1", "mrv.n1ClosingL2"] },
        { kind: "SET_SHIFT_END_PENDING" },
      ],
    },
  ],
};

const NIGHT_2_DEFAULT: NightConfig = {
  characterIds: ["the-phantom-eater", "mr-feast", "the-syndicate"],
  rules: [],
};

const stub = (): NightConfig => ({
  characterIds: [],
  rules: [],
});

export const CAMPAIGN_CONFIG: Record<
  number,
  Record<CampaignPath, NightConfig>
> = {
  1: {
    default: NIGHT_1_DEFAULT,
    underworld: NIGHT_1_DEFAULT,
    michelin: NIGHT_1_DEFAULT,
    viral: NIGHT_1_DEFAULT,
  },
  2: {
    default: NIGHT_2_DEFAULT,
    underworld: NIGHT_2_DEFAULT,
    michelin: NIGHT_2_DEFAULT,
    viral: NIGHT_2_DEFAULT,
  },
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
