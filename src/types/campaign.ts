export type CampaignPath = 'default' | 'underworld' | 'michelin' | 'viral';
export type CorkboardVariant = 'next_night' | 'fired';

export type RuleKey =
  | 'CLOCK_SPEED'
  | 'PAUSE_DISABLED'
  | 'RESERVATIONS_DISABLED'
  | 'BLOCKED_GRID_CELLS'
  | 'QUEUE_SPAWN_RATE'
  | 'COVERS_TARGET'
  | 'STRICT_FALSE_ACCUSATION';

export interface ActiveRule {
  key: RuleKey;
  value: number | boolean | [number, number][];
}

export interface NightConfig {
  newspaper: string;
  quote: string;
  memo: string;
  characterIds: string[];
  rules: ActiveRule[];
}

export interface LedgerData {
  cash: number;
  netProfit: number;
  rating: number;
  coversSeated: number;
}

export interface PathScores {
  underworld: number;
  michelin: number;
  viral: number;
}

export interface CampaignState {
  nightNumber: number;
  pathScores: PathScores;
  lastNightLedger: LedgerData | null;
  lossReason: 'MORALE' | 'VIP' | 'BANNED' | null;
}

export interface FiredConfig {
  ledgerStamp: string;
  newspaperHeadline: string;
  newspaperDeck: string;
  newspaperBodyLeft: string;
  newspaperBodyRight: string;
  letterSalutation: string;
  letterBody: string;
  letterQuote: string;
  letterSignOff: string;
  letterPS: string;
}
