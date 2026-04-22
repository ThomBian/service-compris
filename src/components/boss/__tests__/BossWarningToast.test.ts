// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { BossWarningToast } from '../BossWarningToast';
import type { BossDefinition } from '../../../types';

vi.mock('../../../audio/gameSfx', () => ({
  playBossWarningSting: vi.fn(),
}));

const mockBoss: BossDefinition = {
  id: 'syndicate-don',
  name: 'The Syndicate Don',
  role: 'VIP',
  behaviorType: 'STANDARD_VIP',
  miniGame: 'HANDSHAKE',
  quoteKey: 'boss.syndicateDon.quote',
  introLineKeys: [],
  arrivalMO: 'WALK_IN',
  expectedPartySize: 4,
  clueText: 'Watch out for the Pinstripes tonight.',
  visualTraits: { skinTone: 1, hairStyle: 1, hairColor: 1, clothingStyle: 3, clothingColor: 4, height: 2, facialHair: 1, neckwear: 0 },
  cashBonus: 1000,
  moralePenalty: 25,
  ratingPenalty: 1.0,
  consequenceDescription: '',
  refusalDescription: '',
  vipRefusalWrongPolicy: { ratingLoss: 2.75, moraleLoss: 55, cashLoss: 450 },
  spawnCondition: () => true,
};

describe('BossWarningToast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the boss clue text', () => {
    const onDismiss = vi.fn();
    render(React.createElement(BossWarningToast, { boss: mockBoss, onDismiss }));
    expect(screen.getByText('Watch out for the Pinstripes tonight.')).toBeTruthy();
  });

  it('calls onDismiss after 7000ms', () => {
    const onDismiss = vi.fn();
    render(React.createElement(BossWarningToast, { boss: mockBoss, onDismiss }));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(7000); });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not call onDismiss before 7000ms', () => {
    const onDismiss = vi.fn();
    render(React.createElement(BossWarningToast, { boss: mockBoss, onDismiss }));
    act(() => { vi.advanceTimersByTime(6999); });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
