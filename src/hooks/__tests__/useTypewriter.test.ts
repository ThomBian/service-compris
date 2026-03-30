// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from '../useTypewriter';

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reveals characters over time and sets done when complete', () => {
    const { result } = renderHook(() => useTypewriter('ab', 10));

    expect(result.current.displayed).toBe('');
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.displayed).toBe('a');
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.displayed).toBe('ab');
    expect(result.current.done).toBe(true);
  });

  it('resets when text changes and types the new string from scratch', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriter(text, 10),
      { initialProps: { text: 'ab' } },
    );

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.displayed).toBe('a');

    act(() => {
      rerender({ text: 'xy' });
    });
    expect(result.current.displayed).toBe('');
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.displayed).toBe('x');
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.displayed).toBe('xy');
    expect(result.current.done).toBe(true);
  });
});
