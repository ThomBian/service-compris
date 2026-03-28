import { describe, it, expect } from 'vitest';
import { TOUR_STEPS } from '../tourSteps';

describe('TOUR_STEPS', () => {
  it('has exactly 4 steps', () => {
    expect(TOUR_STEPS).toHaveLength(4);
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
      'desk-tools',
      'floorplan',
    ]);
  });

  it('last step targets floorplan view', () => {
    expect(TOUR_STEPS[3].view).toBe('floorplan');
  });

  it('first three steps target desk view', () => {
    expect(TOUR_STEPS.slice(0, 3).every(s => s.view === 'desk')).toBe(true);
  });
});
