import React from 'react';
import type { CampaignState, CampaignPath, LedgerData, NightConfig } from '../types/campaign';
import { CAMPAIGN_CONFIG } from '../data/campaignConfig';

function derivePath(scores: CampaignState['pathScores']): CampaignPath {
  const max = Math.max(scores.underworld, scores.michelin, scores.viral);
  if (max === 0) return 'default';
  if (scores.underworld === max) return 'underworld';
  if (scores.michelin === max) return 'michelin';
  if (scores.viral === max) return 'viral';
  return 'default';
}

const INITIAL_STATE: CampaignState = {
  nightNumber: 1,
  pathScores: { underworld: 0, michelin: 0, viral: 0 },
  lastNightLedger: null,
  lossReason: null,
};

export interface UseCampaignReturn {
  campaignState: CampaignState;
  activePath: CampaignPath;
  activeNightConfig: NightConfig;
  incrementPathScore: (path: CampaignPath, delta: number) => void;
  advanceNight: (ledger: LedgerData) => void;
  fireCorkboard: (reason: 'MORALE' | 'VIP' | 'BANNED', ledger: LedgerData) => void;
  resetCampaign: () => void;
  /** Dev only: reset path scores and jump campaign meta to this night (no-op in production). */
  setDevCampaignNight: (nightNumber: number) => void;
}

export function useCampaign(): UseCampaignReturn {
  const [state, setState] = React.useState<CampaignState>(INITIAL_STATE);

  const activePath = derivePath(state.pathScores);

  const activeNightConfig: NightConfig =
    CAMPAIGN_CONFIG[state.nightNumber]?.[activePath] ??
    CAMPAIGN_CONFIG[state.nightNumber]?.['default'];

  const incrementPathScore = React.useCallback((path: CampaignPath, delta: number) => {
    if (path === 'default') return;
    setState(prev => ({
      ...prev,
      pathScores: { ...prev.pathScores, [path]: prev.pathScores[path] + delta },
    }));
  }, []);

  const advanceNight = React.useCallback((ledger: LedgerData) => {
    setState(prev => ({
      ...prev,
      nightNumber: prev.nightNumber + 1,
      lastNightLedger: ledger,
      lossReason: null,
    }));
  }, []);

  const fireCorkboard = React.useCallback((reason: 'MORALE' | 'VIP' | 'BANNED', ledger: LedgerData) => {
    setState(prev => ({ ...prev, lossReason: reason, lastNightLedger: ledger }));
  }, []);

  const resetCampaign = React.useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const setDevCampaignNight = React.useCallback((nightNumber: number) => {
    if (!import.meta.env.DEV) return;
    setState({ ...INITIAL_STATE, nightNumber });
  }, []);

  return {
    campaignState: state,
    activePath,
    activeNightConfig,
    incrementPathScore,
    advanceNight,
    fireCorkboard,
    resetCampaign,
    setDevCampaignNight,
  };
}
