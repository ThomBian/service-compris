import { describe, it, expect } from 'vitest';
import { TOUR_STEPS } from '../tourSteps';

describe('TOUR_STEPS', () => {
  it('has exactly 7 steps', () => {
    expect(TOUR_STEPS).toHaveLength(7);
  });

  it('each step has target, title, tooltip, and view', () => {
    for (const step of TOUR_STEPS) {
      expect(typeof step.target).toBe('string');
      expect(typeof step.title).toBe('string');
      expect(typeof step.tooltip).toBe('string');
      expect(['desk', 'floorplan']).toContain(step.view);
    }
  });

  it('targets are the expected values in order', () => {
    expect(TOUR_STEPS.map(s => s.target)).toEqual([
      'topbar',
      'queue',
      'party-ticket',
      'booking-ledger',
      'clipboard',
      'seat-party',
      'floorplan',
    ]);
  });

  it('last step targets floorplan view', () => {
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].view).toBe('floorplan');
  });

  it('all steps except the last target desk view', () => {
    expect(TOUR_STEPS.slice(0, -1).every(s => s.view === 'desk')).toBe(true);
  });
});
