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
    tooltip: "Survive from 19:30 to 23:30. Keep your star rating up and don't go broke.",
    view: 'desk',
  },
  {
    target: 'queue',
    title: 'The Queue',
    tooltip: 'Customers wait outside. Too slow and they storm out — tanking your rating.',
    view: 'desk',
  },
  {
    target: 'desk-tools',
    title: 'The Desk',
    tooltip: 'Ask questions (blue). Call out lies (orange). Accept, refuse, or seat the party.',
    view: 'desk',
  },
  {
    target: 'floorplan',
    title: 'The Floorplan',
    tooltip: 'Select cells to assign a table. Fit the whole party, or crop them smaller for a penalty.',
    view: 'floorplan',
  },
];
