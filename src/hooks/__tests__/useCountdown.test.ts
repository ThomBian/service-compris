// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../useCountdown';

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts at progress 1', () => {
    const { result } = renderHook(() => useCountdown(1000));
    expect(result.current.progress).toBe(1);
  });

  it('decreases progress over time', () => {
    const { result } = renderHook(() => useCountdown(1000));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.progress).toBeGreaterThan(0);
    expect(result.current.progress).toBeLessThan(1);
  });

  it('reaches 0 after full duration', () => {
    const { result } = renderHook(() => useCountdown(1000));
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current.progress).toBe(0);
  });

  it('calls onExpire once after duration', () => {
    const onExpire = vi.fn();
    renderHook(() => useCountdown(1000, onExpire));
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('does not call onExpire twice on extra ticks', () => {
    const onExpire = vi.fn();
    renderHook(() => useCountdown(1000, onExpire));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });
});
