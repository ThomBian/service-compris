import { describe, it, expect } from 'vitest';
import { getRule } from '../nightRules';
import type { ActiveRule } from '../../types/campaign';

describe('getRule', () => {
  const rules: ActiveRule[] = [
    { key: 'CLOCK_SPEED', value: 2 },
    { key: 'PAUSE_DISABLED', value: true },
    { key: 'BLOCKED_GRID_CELLS', value: [[0, 0], [1, 1]] },
  ];

  it('returns value for present key', () => {
    expect(getRule<number>(rules, 'CLOCK_SPEED', 1)).toBe(2);
  });

  it('returns defaultValue for missing key', () => {
    expect(getRule<boolean>(rules, 'RESERVATIONS_DISABLED', false)).toBe(false);
  });

  it('returns boolean rule correctly', () => {
    expect(getRule<boolean>(rules, 'PAUSE_DISABLED', false)).toBe(true);
  });

  it('returns grid cells correctly', () => {
    expect(getRule<[number,number][]>(rules, 'BLOCKED_GRID_CELLS', [])).toEqual([[0,0],[1,1]]);
  });

  it('handles empty rules array', () => {
    expect(getRule<number>([], 'CLOCK_SPEED', 1)).toBe(1);
  });
});
