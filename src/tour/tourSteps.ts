export type TourTarget = 'topbar' | 'queue' | 'desk-tools' | 'floorplan';

export interface TourStep {
  target: TourTarget;
  title: string;
  tooltip: string;
  view: 'desk' | 'floorplan';
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'topbar',
    title: 'Your Stats',
    tooltip: 'Watch the clock (19:30 → 23:30), your ★ rating, morale %, and cash. Rating drops when guests storm out or you make bad calls. Hit 0% morale or seat the wrong VIP and the night ends early.',
    view: 'desk',
  },
  {
    target: 'queue',
    title: 'The Queue',
    tooltip: "Each guest has a patience bar. Leave them waiting too long and they storm out — costing you rating. The front of the queue steps up to your desk automatically. Keep things moving.",
    view: 'desk',
  },
  {
    target: 'desk-tools',
    title: 'The Desk',
    tooltip: 'Tap empty ticket fields (blue) to ask questions. Tap filled fields or the party group (orange) to call out a lie. Cross-check their claims against the Booking List on the right. Then Accept, Refuse, or hit the door to seat them.',
    view: 'desk',
  },
  {
    target: 'floorplan',
    title: 'The Floorplan',
    tooltip: 'Tap cells to build a contiguous table for the party. Seat everyone for full cash. Select fewer cells to crop the party — you take a rating hit but free up space. Tables stay occupied until the meal ends.',
    view: 'floorplan',
  },
];
