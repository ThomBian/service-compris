import { describe, it, expect } from 'vitest';
import { evaluateTimeTrigger, shouldFireEvent } from '../../hooks/useScriptedEvents';
import type { ScriptedEvent } from '../../types';

const baseEvent: ScriptedEvent = {
  id: 'test',
  trigger: { kind: 'TIME', minute: 1180 },
  actions: [],
};

describe('evaluateTimeTrigger', () => {
  it('returns true when currentTime >= trigger minute', () => {
    expect(evaluateTimeTrigger(1180, 1180)).toBe(true);
    expect(evaluateTimeTrigger(1181, 1180)).toBe(true);
  });

  it('returns false when currentTime < trigger minute', () => {
    expect(evaluateTimeTrigger(1179, 1180)).toBe(false);
  });
});

describe('shouldFireEvent', () => {
  it('returns false if event already in firedEventIds', () => {
    expect(shouldFireEvent(baseEvent, ['test'], 1180, null)).toBe(false);
  });

  it('returns true for TIME trigger when not yet fired', () => {
    expect(shouldFireEvent(baseEvent, [], 1180, null)).toBe(true);
  });

  it('returns false for TIME trigger when time not reached', () => {
    expect(shouldFireEvent(baseEvent, [], 1179, null)).toBe(false);
  });

  it('fires once=false events even if id is in firedEventIds', () => {
    const repeating: ScriptedEvent = { ...baseEvent, once: false };
    expect(shouldFireEvent(repeating, ['test'], 1180, null)).toBe(true);
  });

  it('returns true for CHARACTER_AT_DESK when characterId matches currentClient', () => {
    const event: ScriptedEvent = {
      id: 'char-event',
      trigger: { kind: 'CHARACTER_AT_DESK', characterId: 'the-phantom-eater' },
      actions: [],
    };
    expect(shouldFireEvent(event, [], 1200, 'the-phantom-eater')).toBe(true);
  });

  it('returns false for CHARACTER_AT_DESK when characterId does not match', () => {
    const event: ScriptedEvent = {
      id: 'char-event',
      trigger: { kind: 'CHARACTER_AT_DESK', characterId: 'the-phantom-eater' },
      actions: [],
    };
    expect(shouldFireEvent(event, [], 1200, 'someone-else')).toBe(false);
  });
});
