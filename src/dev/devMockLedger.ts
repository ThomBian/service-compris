import type { LedgerData } from '../types/campaign';

/** Shared mock ledger for dev corkboard jumps (command palette + tests). */
export const DEV_MOCK_LEDGER: LedgerData = {
  cash: 1240,
  netProfit: 340,
  rating: 4.2,
  morale: 72,
  coversSeated: 18,
  shiftRevenue: 1440,
  salaryCost: 800,
  electricityCost: 200,
  foodCost: 100,
  logs: [
    'Party of 2 seated (reservation).',
    'Walk-in refused — no tables available.',
    'Scammer caught and removed.',
    'VIP Marcel Dupont seated.',
    'Last call — table cleared early.',
    'Party of 4 seated.',
    'Reservation no-show marked.',
    'Rush hour — 3 parties in queue.',
  ],
};
