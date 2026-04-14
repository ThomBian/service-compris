import { describe, it, expect } from 'vitest';
import { isCaught } from '../CoatCheckGame';

describe('isCaught', () => {
  const basket = { centerX: 300, halfWidth: 50 };

  it('returns true when item center is within basket range', () => {
    expect(isCaught(300, basket)).toBe(true);
    expect(isCaught(250, basket)).toBe(true);
    expect(isCaught(350, basket)).toBe(true);
  });

  it('returns false when item center is outside basket range', () => {
    expect(isCaught(249, basket)).toBe(false);
    expect(isCaught(351, basket)).toBe(false);
    expect(isCaught(100, basket)).toBe(false);
  });
});
