// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HandshakeGame } from '../HandshakeGame';

describe('HandshakeGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders 4 interaction controls', () => {
    render(React.createElement(HandshakeGame, { onWin: vi.fn(), onLose: vi.fn(), durationMs: 10000 }));
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('calls onLose on wrong click during input phase', async () => {
    const onLose = vi.fn();
    render(React.createElement(HandshakeGame, { onWin: vi.fn(), onLose, durationMs: 10000 }));

    for (let i = 0; i < 60; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      const label = screen.queryByText(/repeat|boss\.handshake\.repeatsteps/i);
      if (label) break;
    }

    const wrongButtons = screen.getAllByRole('button', {
      name: /bell|boss\.handshake\.items\.bell/i,
    });
    fireEvent.click(wrongButtons[wrongButtons.length - 1]!);
    const ledgerButtons = screen.getAllByRole('button', {
      name: /ledger|boss\.handshake\.items\.ledger/i,
    });
    expect(ledgerButtons[ledgerButtons.length - 1]!.className).toContain('border-emerald-400');
    expect(wrongButtons[wrongButtons.length - 1]!.className).toContain('border-red-400');
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(onLose).toHaveBeenCalledTimes(1);
  });

  it('wins after completing an 8-step sequence', async () => {
    const onWin = vi.fn();
    render(React.createElement(HandshakeGame, { onWin, onLose: vi.fn(), durationMs: 0 }));

    for (let round = 0; round < 5; round += 1) {
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      const ledgerButtons = screen.getAllByRole('button', {
        name: /ledger|boss\.handshake\.items\.ledger/i,
      });
      const activeLedger = ledgerButtons[ledgerButtons.length - 1]!;
      const sequenceLength = 4 + round;
      for (let i = 0; i < sequenceLength; i += 1) {
        fireEvent.click(activeLedger);
        await act(async () => {
          vi.advanceTimersByTime(200);
        });
      }
      if (onWin.mock.calls.length > 0) break;
    }

    expect(onWin).toHaveBeenCalledTimes(1);
  });

  it('does not call onWin or onLose during showing phase', () => {
    const onWin = vi.fn();
    const onLose = vi.fn();

    render(React.createElement(HandshakeGame, { onWin, onLose, durationMs: 10000 }));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onWin).not.toHaveBeenCalled();
    expect(onLose).not.toHaveBeenCalled();
  });
});
