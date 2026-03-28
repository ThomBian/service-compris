// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCampaign } from '../useCampaign';

describe('useCampaign', () => {
  it('initialises with nightNumber 1 and zero scores', () => {
    const { result } = renderHook(() => useCampaign());
    expect(result.current.campaignState.nightNumber).toBe(1);
    expect(result.current.campaignState.pathScores).toEqual({ underworld: 0, michelin: 0, viral: 0 });
    expect(result.current.campaignState.lastNightLedger).toBeNull();
    expect(result.current.campaignState.lossReason).toBeNull();
  });

  it('incrementPathScore accumulates correctly', () => {
    const { result } = renderHook(() => useCampaign());
    act(() => { result.current.incrementPathScore('underworld', 15); });
    act(() => { result.current.incrementPathScore('underworld', 5); });
    act(() => { result.current.incrementPathScore('michelin', 10); });
    expect(result.current.campaignState.pathScores.underworld).toBe(20);
    expect(result.current.campaignState.pathScores.michelin).toBe(10);
  });

  it('activePath returns dominant path', () => {
    const { result } = renderHook(() => useCampaign());
    act(() => { result.current.incrementPathScore('viral', 20); });
    expect(result.current.activePath).toBe('viral');
  });

  it('activePath falls back to default on tie', () => {
    const { result } = renderHook(() => useCampaign());
    expect(result.current.activePath).toBe('default');
  });

  it('advanceNight increments nightNumber and stores ledger', () => {
    const { result } = renderHook(() => useCampaign());
    const ledger = { cash: 500, netProfit: 200, rating: 4.0, morale: 80, coversSeated: 20, shiftRevenue: 700, salaryCost: 200, electricityCost: 40, foodCost: 460, logs: [] };
    act(() => { result.current.advanceNight(ledger); });
    expect(result.current.campaignState.nightNumber).toBe(2);
    expect(result.current.campaignState.lastNightLedger).toEqual(ledger);
  });

  it('fireCorkboard sets lossReason and stores ledger', () => {
    const { result } = renderHook(() => useCampaign());
    const ledger = { cash: 100, netProfit: -50, rating: 2.0, morale: 0, coversSeated: 5, shiftRevenue: 200, salaryCost: 200, electricityCost: 40, foodCost: 115, logs: [] };
    act(() => { result.current.fireCorkboard('MORALE', ledger); });
    expect(result.current.campaignState.lossReason).toBe('MORALE');
    expect(result.current.campaignState.lastNightLedger).toEqual(ledger);
  });

  it('resetCampaign clears all state', () => {
    const { result } = renderHook(() => useCampaign());
    act(() => { result.current.incrementPathScore('underworld', 30); });
    act(() => { result.current.advanceNight({ cash: 400, netProfit: 100, rating: 4.0, morale: 70, coversSeated: 15, shiftRevenue: 600, salaryCost: 200, electricityCost: 40, foodCost: 345, logs: [] }); });
    act(() => { result.current.resetCampaign(); });
    expect(result.current.campaignState.nightNumber).toBe(1);
    expect(result.current.campaignState.pathScores).toEqual({ underworld: 0, michelin: 0, viral: 0 });
    expect(result.current.campaignState.lastNightLedger).toBeNull();
  });

  it('activeNightConfig resolves correct path config', () => {
    const { result } = renderHook(() => useCampaign());
    expect(result.current.activeNightConfig).toBeDefined();
    expect(Array.isArray(result.current.activeNightConfig.characterIds)).toBe(true);
  });
});
