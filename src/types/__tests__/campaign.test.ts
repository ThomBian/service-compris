import { describe, it, expectTypeOf } from 'vitest';
import type { ActiveRule, RuleKey, NightConfig, CampaignState, LedgerData, FiredConfig } from './campaign';

describe('campaign types', () => {
  it('ActiveRule value covers all rule key shapes', () => {
    const numRule: ActiveRule = { key: 'CLOCK_SPEED', value: 2 };
    const boolRule: ActiveRule = { key: 'PAUSE_DISABLED', value: true };
    const cellRule: ActiveRule = { key: 'BLOCKED_GRID_CELLS', value: [[0,0],[1,1]] };
    expectTypeOf(numRule).toMatchTypeOf<ActiveRule>();
    expectTypeOf(boolRule).toMatchTypeOf<ActiveRule>();
    expectTypeOf(cellRule).toMatchTypeOf<ActiveRule>();
  });

  it('CampaignState has required fields', () => {
    const s: CampaignState = {
      nightNumber: 1,
      pathScores: { underworld: 0, michelin: 0, viral: 0 },
      lastNightLedger: null,
      lossReason: null,
    };
    expectTypeOf(s).toMatchTypeOf<CampaignState>();
  });
});
