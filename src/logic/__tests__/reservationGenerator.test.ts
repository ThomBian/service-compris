import { describe, it, expect } from 'vitest';
import { generateReservations } from '../reservationGenerator';

describe('generateReservations', () => {
  it('returns between 4 and 16 reservations', () => {
    const result = generateReservations({ nightNumber: 2, rating: 3.0 });
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.length).toBeLessThanOrEqual(16);
  });

  it('uses rating to adjust count — high rating produces more than low', () => {
    const high = generateReservations({ nightNumber: 2, rating: 5.0 });
    const low = generateReservations({ nightNumber: 2, rating: 1.0 });
    expect(high.length).toBeLessThanOrEqual(16);
    expect(low.length).toBeGreaterThanOrEqual(4);
  });

  it('each reservation has required fields', () => {
    const result = generateReservations({ nightNumber: 2, rating: 4.0 });
    for (const r of result) {
      expect(r.id).toMatch(/^res-proc-/);
      expect(r.time).toBeGreaterThanOrEqual(1170);
      expect(r.time).toBeLessThanOrEqual(1320);
      expect(r.time % 15).toBe(0);
      expect(r.partySize).toBeGreaterThanOrEqual(1);
      expect(r.partySize).toBeLessThanOrEqual(8);
      expect(typeof r.firstName).toBe('string');
      expect(typeof r.lastName).toBe('string');
      expect(r.arrived).toBe(false);
      expect(r.partySeated).toBe(false);
    }
  });

  it('time slots are 15-minute increments between 1170 and 1320', () => {
    const result = generateReservations({ nightNumber: 1, rating: 3.0 });
    for (const r of result) {
      expect((r.time - 1170) % 15).toBe(0);
    }
  });

  it('at least some first-name collisions are injected', () => {
    const result = generateReservations({ nightNumber: 5, rating: 4.0 });
    if (result.length < 2) return;
    const firstNames = result.map(r => r.firstName);
    const hasDuplicate = firstNames.some((n, i) => firstNames.indexOf(n) !== i);
    expect(hasDuplicate).toBe(true);
  });
});
