import type { ScriptedEvent } from '../types';

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
  characterIds: string[];
  rules: ActiveRule[];
  scriptedEvents?: ScriptedEvent[];
}

export interface LedgerData {
  cash: number;
  netProfit: number;
  rating: number;
  morale: number;
  coversSeated: number;
  // Fee breakdown
  shiftRevenue: number;
  salaryCost: number;
  electricityCost: number;
  foodCost: number;
  // Activity log
  logs: string[];
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


