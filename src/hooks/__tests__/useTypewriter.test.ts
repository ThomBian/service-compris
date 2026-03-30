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

  it('invokes onChar once per revealed character', () => {
    const onChar = vi.fn();
    const { result } = renderHook(() => useTypewriter('ab', 10, onChar));

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(onChar).toHaveBeenCalledTimes(1);
    expect(result.current.displayed).toBe('a');

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(onChar).toHaveBeenCalledTimes(2);
    expect(result.current.done).toBe(true);
  });

  it('invokes onTypingStart once per typing run, not for empty text', () => {
    const onTypingStart = vi.fn();
    const { rerender } = renderHook(
      ({ text }) => useTypewriter(text, 10, undefined, 0, onTypingStart),
      { initialProps: { text: '' as string } },
    );
    expect(onTypingStart).not.toHaveBeenCalled();

    rerender({ text: 'ab' });
    expect(onTypingStart).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(onTypingStart).toHaveBeenCalledTimes(1);

    rerender({ text: 'xy' });
    expect(onTypingStart).toHaveBeenCalledTimes(2);
  });

  it('skipToEnd reveals full text immediately and marks done', () => {
    const { result } = renderHook(() => useTypewriter('abc', 100));

    act(() => {
      result.current.skipToEnd();
    });
    expect(result.current.displayed).toBe('abc');
    expect(result.current.done).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.displayed).toBe('abc');
  });

  it('skipToEnd is a no-op for empty text', () => {
    const { result } = renderHook(() => useTypewriter('', 10));
    expect(result.current.done).toBe(true);
    act(() => {
      result.current.skipToEnd();
    });
    expect(result.current.displayed).toBe('');
    expect(result.current.done).toBe(true);
  });
});
