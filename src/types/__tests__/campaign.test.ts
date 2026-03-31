import { describe, it, expect, expectTypeOf } from 'vitest';
import type { ActiveRule, RuleKey, NightConfig, CampaignState, LedgerData } from '../campaign';
import type { ScriptedEvent } from '../../types';
import { ClientType } from '../../types';

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

  it('NightConfig accepts scriptedEvents', () => {
    const event: ScriptedEvent = {
      id: 'test-event',
      trigger: { kind: 'TIME', minute: 1172 },
      actions: [
        { kind: 'SHOW_DIALOGUE', lines: ['Hello.'] },
        { kind: 'REVEAL_TOOL', tool: 'LEDGER' },
      ],
    };
    const config: NightConfig = {
      characterIds: [],
      rules: [],
      scriptedEvents: [event],
    };
    expect(config.scriptedEvents).toHaveLength(1);
  });

  it('ScriptedEvent CHARACTER_AT_DESK trigger compiles', () => {
    const event: ScriptedEvent = {
      id: 'at-desk',
      trigger: { kind: 'CHARACTER_AT_DESK', characterId: 'the-phantom-eater' },
      actions: [{ kind: 'SHOW_DIALOGUE', lines: ['Check the list.'] }],
    };
    expect(event.trigger.kind).toBe('CHARACTER_AT_DESK');
  });
});
