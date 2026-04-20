import { describe, expect, it } from 'vitest';
import { pointInParryHitbox } from '../CoatCheckGame';

describe('pointInParryHitbox', () => {
  it('returns true when point is inside circle', () => {
    expect(pointInParryHitbox(100, 100, 100, 100, 10)).toBe(true);
    expect(pointInParryHitbox(105, 100, 100, 100, 10)).toBe(true);
    expect(pointInParryHitbox(100, 107, 100, 100, 10)).toBe(true);
  });

  it('returns false when point is outside circle', () => {
    expect(pointInParryHitbox(120, 100, 100, 100, 10)).toBe(false);
    expect(pointInParryHitbox(100, 85, 100, 100, 10)).toBe(false);
  });

  it('treats boundary as inside', () => {
    const r = 10;
    const cx = 50;
    const cy = 50;
    expect(pointInParryHitbox(cx + r, cy, cx, cy, r)).toBe(true);
  });
});
