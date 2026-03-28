export type TourTarget =
  | 'topbar'
  | 'queue'
  | 'party-ticket'
  | 'booking-ledger'
  | 'clipboard'
  | 'seat-party'
  | 'floorplan';

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
    tooltip: "Guests line up here — each has a patience bar that ticks down while they wait. The front of the queue steps up to your desk automatically. Let someone storm out and you lose rating. Keep things moving.",
    view: 'desk',
  },
  {
    target: 'party-ticket',
    title: 'The Ticket',
    tooltip: 'Tap the blue fields to ask the guest their name and arrival time. Once filled, tap any field or their party to accuse them of lying. Use REFUSE to deny entry. Every unasked field is a risk — scammers rely on you skipping questions.',
    view: 'desk',
  },
  {
    target: 'booking-ledger',
    title: 'Booking List',
    tooltip: "Cross-check the guest's claimed name and time against tonight's reservations. A green row means they're on time. A red ⚠ row means someone by that name is already seated — classic scammer move.",
    view: 'desk',
  },
  {
    target: 'clipboard',
    title: 'VIPs & Intel',
    tooltip: 'Check VIPs before seating anyone — seat them correctly or the night ends. Check Banned guests — let one through and it\'s game over or a heavy fine. The Log tab records every call you\'ve made this shift.',
    view: 'desk',
  },
  {
    target: 'seat-party',
    title: 'Seat Party',
    tooltip: "When you're satisfied, click the door to seat the party. This is the most important action in the game — it takes you to the floorplan to pick tables. You can't undo a bad seating decision, so interrogate first.",
    view: 'desk',
  },
  {
    target: 'floorplan',
    title: 'The Floorplan',
    tooltip: 'Tap cells to build a contiguous table for the party. Seat everyone for full cash. Select fewer cells to crop the party — you take a rating hit but free up space. Tables stay occupied until the meal ends.',
    view: 'floorplan',
  },
];
