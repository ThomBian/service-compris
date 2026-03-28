import type { CampaignPath } from '../types/campaign';

export interface PathScoreEvent {
  path: CampaignPath;
  delta: number;
}

// Keyed by character ID + action, e.g. 'the-syndicate:seated'
export const PATH_SCORE_WEIGHTS: Record<string, PathScoreEvent> = {
  'the-syndicate:seated':      { path: 'underworld', delta: 15 },
  'the-syndicate:refused':     { path: 'michelin',   delta: 10 },
  'mr-feast:seated':           { path: 'viral',      delta: 15 },
  'donny-tromp:seated':        { path: 'viral',      delta: 10 },
  'manu-macaroon:seated':      { path: 'michelin',   delta: 10 },
  'gordon-angry:refused':      { path: 'michelin',   delta: 10 },
  'time-crime:correct-refuse': { path: 'michelin',   delta: 5  },
  'tight-grid-seat':           { path: 'underworld', delta: 5  },
  'fast-queue-clear':          { path: 'viral',      delta: 5  },
};
