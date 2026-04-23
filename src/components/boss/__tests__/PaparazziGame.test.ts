// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaparazziGame } from '../PaparazziGame';

describe('PaparazziGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders the game arena', () => {
    render(React.createElement(PaparazziGame, { onWin: vi.fn(), onLose: vi.fn(), durationMs: 20_000 }));
    expect(screen.getByTestId('paparazzi-arena')).toBeTruthy();
  });

  it('calls onLose when a red viewfinder is clicked', () => {
    const onLose = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    render(React.createElement(PaparazziGame, { onWin: vi.fn(), onLose, durationMs: 20_000 }));

    act(() => {
      vi.advanceTimersByTime(700);
    });

    const redTargets = screen.queryAllByTestId('viewfinder');
    expect(redTargets.length).toBeGreaterThan(0);
    fireEvent.click(redTargets[0]);
    expect(onLose).toHaveBeenCalledOnce();
  });

  it('does not call onLose when a green viewfinder is clicked', () => {
    const onLose = vi.fn();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.3)
      .mockReturnValue(0.3);

    render(React.createElement(PaparazziGame, { onWin: vi.fn(), onLose, durationMs: 20_000 }));

    act(() => {
      vi.advanceTimersByTime(700);
    });

    const greenTargets = screen.queryAllByTestId('viewfinder-green');
    expect(greenTargets.length).toBeGreaterThan(0);
    fireEvent.click(greenTargets[0]);
    expect(onLose).not.toHaveBeenCalled();
  });

  it('calls onLose when a green viewfinder expires', () => {
    const onLose = vi.fn();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.2)
      .mockReturnValue(0.2);

    render(React.createElement(PaparazziGame, { onWin: vi.fn(), onLose, durationMs: 20_000 }));

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryAllByTestId('viewfinder-green').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.queryAllByTestId('viewfinder-green').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onLose).toHaveBeenCalledOnce();
  });

});

