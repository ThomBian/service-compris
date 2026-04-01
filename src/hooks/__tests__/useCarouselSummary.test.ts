// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCarouselSummary } from '../useCarouselSummary';

vi.mock('@/src/audio/gameSfx', () => ({
  playOdometerClick: vi.fn(),
  playLedgerDing: vi.fn(),
  playPaperSwish: vi.fn(),
  playDialogueTypewriterClick: vi.fn(),
}));

describe('useCarouselSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on the newspaper step', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('HEADLINE', 'memo', 10),
    );
    expect(result.current.step).toBe('newspaper');
  });

  it('starts revealing (headline not done on mount)', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('HEADLINE', 'memo', 10),
    );
    expect(result.current.isRevealing).toBe(true);
    expect(result.current.canAdvance).toBe(false);
  });

  it('advance() while headline is typing skips to full headline without changing step', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('AB', 'memo', 10),
    );
    expect(result.current.isRevealing).toBe(true);
    act(() => {
      result.current.advance();
    });
    expect(result.current.headlineDisplayed).toBe('AB');
    expect(result.current.isRevealing).toBe(false);
    expect(result.current.canAdvance).toBe(true);
    expect(result.current.step).toBe('newspaper');
  });

  it('advance() when headline done moves to ledger', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('AB', 'memo', 10),
    );
    act(() => {
      result.current.advance();
    }); // skip
    act(() => {
      result.current.advance();
    }); // advance
    expect(result.current.step).toBe('ledger');
  });

  it('ledger reveals lines at 300ms intervals', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'memo', 3),
    );
    act(() => {
      result.current.advance();
    }); // skip newspaper
    act(() => {
      result.current.advance();
    }); // advance to ledger
    expect(result.current.step).toBe('ledger');
    expect(result.current.revealedLines).toBe(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.revealedLines).toBe(1);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.revealedLines).toBe(2);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.revealedLines).toBe(3);
    expect(result.current.isRevealing).toBe(false);
    expect(result.current.canAdvance).toBe(true);
  });

  it('advance() during ledger reveal skips all remaining lines', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'memo', 5),
    );
    act(() => {
      result.current.advance();
    });
    act(() => {
      result.current.advance();
    });
    act(() => {
      vi.advanceTimersByTime(300);
    }); // 1 line revealed
    expect(result.current.revealedLines).toBe(1);
    act(() => {
      result.current.advance();
    }); // skip remaining
    expect(result.current.revealedLines).toBe(5);
    expect(result.current.isRevealing).toBe(false);
  });

  it('advance() when ledger done moves to memo', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'memo', 2),
    );
    act(() => {
      result.current.advance();
    });
    act(() => {
      result.current.advance();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    }); // all ledger lines done
    expect(result.current.canAdvance).toBe(true);
    act(() => {
      result.current.advance();
    });
    expect(result.current.step).toBe('memo');
  });

  it('advance() while memo is typing skips to full memo without changing step', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'M', 2),
    );
    act(() => {
      result.current.advance();
    });
    act(() => {
      result.current.advance();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.advance();
    }); // advance to memo
    expect(result.current.step).toBe('memo');
    act(() => {
      result.current.advance();
    }); // skip memo
    expect(result.current.memoDisplayed).toBe('M');
    expect(result.current.step).toBe('memo');
  });

  it('advance() when memo done moves to final', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'M', 2),
    );
    act(() => {
      result.current.advance();
    });
    act(() => {
      result.current.advance();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.advance();
    }); // to memo
    act(() => {
      result.current.advance();
    }); // skip memo
    act(() => {
      result.current.advance();
    }); // to final
    expect(result.current.step).toBe('final');
  });

  it('advance() in final step does nothing', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'M', 2),
    );
    act(() => {
      result.current.advance();
    });
    act(() => {
      result.current.advance();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.advance();
    });
    act(() => {
      result.current.advance();
    });
    act(() => {
      result.current.advance();
    });
    expect(result.current.step).toBe('final');
    act(() => {
      result.current.advance();
    });
    expect(result.current.step).toBe('final');
  });
});
