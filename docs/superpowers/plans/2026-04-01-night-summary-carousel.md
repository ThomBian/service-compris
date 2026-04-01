# Night Summary Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the auto-timed corkboard with a player-driven sequential carousel (Newspaper → Ledger → Memo → Final state) with character-by-character text reveals, SFX, and a loss-variant rubber stamp.

**Architecture:** A `useCarouselSummary` hook owns all step state and text reveal progress, driving three focused reveal components (`NewspaperReveal`, `LedgerReveal`, `MemoReveal`). `CorkboardScreen` becomes a thin orchestrator that listens for ENTER/click and routes to the active component. The Activity Log paper is removed entirely.

**Tech Stack:** React 19, TypeScript, Framer Motion (`motion/react`), Howler.js (via existing `src/audio/gameSfx.ts`), existing `src/hooks/useTypewriter.ts`, Vitest + `@testing-library/react`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/hooks/useCarouselSummary.ts` | Step state machine + reveal progress |
| Create | `src/hooks/__tests__/useCarouselSummary.test.ts` | Unit tests for hook |
| Create | `src/components/corkboard/NewspaperReveal.tsx` | Newspaper paper, char reveal, corner dismiss |
| Create | `src/components/corkboard/LedgerReveal.tsx` | Ledger paper, line-by-line reveal, stamp |
| Create | `src/components/corkboard/MemoReveal.tsx` | Memo paper, char reveal, corner dismiss |
| Create | `public/audio/corkboard/README.md` | Placeholder asset instructions |
| Modify | `src/audio/gameSfx.ts` | Add 6 corkboard SFX functions |
| Modify | `src/i18n/locales/en/campaign.json` | Update stamp text, add pressEnter key |
| Modify | `src/i18n/locales/fr/campaign.json` | Same in French |
| Modify | `src/components/CorkboardScreen.tsx` | Full rewrite as orchestrator |

---

## Task 1: Add corkboard SFX stubs

**Files:**
- Create: `public/audio/corkboard/README.md`
- Modify: `src/audio/gameSfx.ts`

- [ ] **Step 1: Create audio placeholder README**

Create `public/audio/corkboard/README.md`:

```markdown
# Corkboard Audio Assets

Drop audio files here. All are referenced by `src/audio/gameSfx.ts`.

| File | Description |
|---|---|
| `telegraph-click.wav` | Per-character SFX for newspaper headline reveal |
| `odometer-click.wav` | Per-line SFX for ledger row reveal |
| `ledger-ding.wav` | Fires once when last ledger row appears |
| `paper-swish.wav` | Plays on carousel step transition (ENTER press) |
| `stamp-thwack.wav` | Bass-boosted stamp slam on the ledger |
| `stamp-crinkle.wav` | Paper crinkle after stamp settles (~200ms after thwack) |
```

- [ ] **Step 2: Append corkboard SFX to `src/audio/gameSfx.ts`**

Add after the closing brace of `playDialogueTypewriterClick`:

```typescript
// --- Corkboard carousel SFX ---

const CORKBOARD_PATH = {
  telegraph: '/audio/corkboard/telegraph-click.wav',
  odometer: '/audio/corkboard/odometer-click.wav',
  ledgerDing: '/audio/corkboard/ledger-ding.wav',
  swish: '/audio/corkboard/paper-swish.wav',
  stampThwack: '/audio/corkboard/stamp-thwack.wav',
  stampCrinkle: '/audio/corkboard/stamp-crinkle.wav',
} as const;

let corkboardSounds: Record<keyof typeof CORKBOARD_PATH, Howl> | null = null;

function ensureCorkboardSounds(): Record<keyof typeof CORKBOARD_PATH, Howl> {
  if (!corkboardSounds) {
    corkboardSounds = {
      telegraph: new Howl({ src: [CORKBOARD_PATH.telegraph], volume: 0.4, preload: true, onloaderror: devLoadErr('telegraph') }),
      odometer: new Howl({ src: [CORKBOARD_PATH.odometer], volume: 0.35, preload: true, onloaderror: devLoadErr('odometer') }),
      ledgerDing: new Howl({ src: [CORKBOARD_PATH.ledgerDing], volume: 0.5, preload: true, onloaderror: devLoadErr('ledger-ding') }),
      swish: new Howl({ src: [CORKBOARD_PATH.swish], volume: 0.45, preload: true, onloaderror: devLoadErr('swish') }),
      stampThwack: new Howl({ src: [CORKBOARD_PATH.stampThwack], volume: 0.7, preload: true, onloaderror: devLoadErr('stamp-thwack') }),
      stampCrinkle: new Howl({ src: [CORKBOARD_PATH.stampCrinkle], volume: 0.4, preload: true, onloaderror: devLoadErr('stamp-crinkle') }),
    };
  }
  return corkboardSounds;
}

const TELEGRAPH_MIN_MS = 30;
let telegraphLastMs = 0;

/** Per-character SFX for newspaper headline reveal. Throttled to avoid overlap. */
export function playTelegraphClick(): void {
  const now = performance.now();
  if (now - telegraphLastMs < TELEGRAPH_MIN_MS) return;
  telegraphLastMs = now;
  void Howler.ctx?.resume?.();
  const h = ensureCorkboardSounds().telegraph;
  h.stop();
  h.play();
}

/** Per-line SFX during ledger reveal (adding machine clack). */
export function playOdometerClick(): void {
  void Howler.ctx?.resume?.();
  const h = ensureCorkboardSounds().odometer;
  h.stop();
  h.play();
}

/** Fires once when the last ledger row is revealed. */
export function playLedgerDing(): void {
  void Howler.ctx?.resume?.();
  ensureCorkboardSounds().ledgerDing.play();
}

/** Paper swish sound on carousel step transition. */
export function playPaperSwish(): void {
  void Howler.ctx?.resume?.();
  const h = ensureCorkboardSounds().swish;
  h.stop();
  h.play();
}

/** Bass-boosted stamp impact on the ledger. */
export function playStampThwack(): void {
  void Howler.ctx?.resume?.();
  ensureCorkboardSounds().stampThwack.play();
}

/** Paper crinkle after stamp settles. */
export function playStampCrinkle(): void {
  void Howler.ctx?.resume?.();
  ensureCorkboardSounds().stampCrinkle.play();
}
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```
Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add public/audio/corkboard/README.md src/audio/gameSfx.ts
git commit -m "feat(corkboard): add SFX stubs for carousel (telegraph, odometer, swish, stamp)"
```

---

## Task 2: Update i18n keys

**Files:**
- Modify: `src/i18n/locales/en/campaign.json`
- Modify: `src/i18n/locales/fr/campaign.json`

- [ ] **Step 1: Update EN stamp values and add carousel key**

In `src/i18n/locales/en/campaign.json`:

1. Change `fired.MORALE.ledgerStamp` from `"Abandoned"` to `"DÉMISSIONNÉ"`
2. Change `fired.VIP.ledgerStamp` from `"Dismissed"` to `"SCANDALE"`
3. Change `fired.BANNED.ledgerStamp` from `"Compromised"` to `"COMPROMIS"`
4. Add under `"corkboard"` (alongside the existing `"ledger"`, `"newspaper"`, etc. keys):

```json
"carousel": {
  "pressEnter": "[ PRESS ENTER ]"
}
```

- [ ] **Step 2: Update FR stamp values and add carousel key**

In `src/i18n/locales/fr/campaign.json`:

1. Change `fired.MORALE.ledgerStamp` from `"Déserté"` to `"DÉMISSIONNÉ"`
2. Change `fired.VIP.ledgerStamp` (whatever current value is) to `"SCANDALE"`
3. Change `fired.BANNED.ledgerStamp` (whatever current value is) to `"COMPROMIS"`
4. Add under `"corkboard"`:

```json
"carousel": {
  "pressEnter": "[ APPUYEZ SUR ENTRÉE ]"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/en/campaign.json src/i18n/locales/fr/campaign.json
git commit -m "i18n(corkboard): update stamp variants; add carousel pressEnter key"
```

---

## Task 3: `useCarouselSummary` hook (TDD)

**Files:**
- Create: `src/hooks/__tests__/useCarouselSummary.test.ts`
- Create: `src/hooks/useCarouselSummary.ts`

The hook:
```typescript
export type CarouselStep = 'newspaper' | 'ledger' | 'memo' | 'final'

export function useCarouselSummary(
  headline: string,      // drives headline typewriter (newspaper step)
  memoText: string,      // drives memo typewriter (memo step)
  ledgerRowCount: number // total rows to reveal (ledger step)
): {
  step: CarouselStep
  isRevealing: boolean
  canAdvance: boolean
  headlineDisplayed: string  // partial headline during typewriter reveal
  memoDisplayed: string      // partial memo during typewriter reveal
  revealedLines: number      // 0..ledgerRowCount
  advance: () => void        // skip reveal if still typing, else move to next step
}
```

- [ ] **Step 1: Write failing tests**

Create `src/hooks/__tests__/useCarouselSummary.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCarouselSummary } from '../useCarouselSummary';

vi.mock('@/src/audio/gameSfx', () => ({
  playTelegraphClick: vi.fn(),
  playOdometerClick: vi.fn(),
  playLedgerDing: vi.fn(),
  playPaperSwish: vi.fn(),
  playDialogueTypewriterClick: vi.fn(),
}));

describe('useCarouselSummary', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

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
    act(() => { result.current.advance(); });
    expect(result.current.headlineDisplayed).toBe('AB');
    expect(result.current.isRevealing).toBe(false);
    expect(result.current.canAdvance).toBe(true);
    expect(result.current.step).toBe('newspaper');
  });

  it('advance() when headline done moves to ledger', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('AB', 'memo', 10),
    );
    act(() => { result.current.advance(); }); // skip
    act(() => { result.current.advance(); }); // advance
    expect(result.current.step).toBe('ledger');
  });

  it('ledger reveals lines at 300ms intervals', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'memo', 3),
    );
    act(() => { result.current.advance(); }); // skip newspaper
    act(() => { result.current.advance(); }); // advance to ledger
    expect(result.current.step).toBe('ledger');
    expect(result.current.revealedLines).toBe(0);

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.revealedLines).toBe(1);

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.revealedLines).toBe(2);

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.revealedLines).toBe(3);
    expect(result.current.isRevealing).toBe(false);
    expect(result.current.canAdvance).toBe(true);
  });

  it('advance() during ledger reveal skips all remaining lines', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'memo', 5),
    );
    act(() => { result.current.advance(); });
    act(() => { result.current.advance(); });
    act(() => { vi.advanceTimersByTime(300); }); // 1 line revealed
    expect(result.current.revealedLines).toBe(1);
    act(() => { result.current.advance(); }); // skip remaining
    expect(result.current.revealedLines).toBe(5);
    expect(result.current.isRevealing).toBe(false);
  });

  it('advance() when ledger done moves to memo', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'memo', 2),
    );
    act(() => { result.current.advance(); });
    act(() => { result.current.advance(); });
    act(() => { vi.advanceTimersByTime(600); }); // all ledger lines done
    expect(result.current.canAdvance).toBe(true);
    act(() => { result.current.advance(); });
    expect(result.current.step).toBe('memo');
  });

  it('advance() while memo is typing skips to full memo without changing step', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'M', 2),
    );
    act(() => { result.current.advance(); });
    act(() => { result.current.advance(); });
    act(() => { vi.advanceTimersByTime(600); });
    act(() => { result.current.advance(); }); // advance to memo
    expect(result.current.step).toBe('memo');
    act(() => { result.current.advance(); }); // skip memo
    expect(result.current.memoDisplayed).toBe('M');
    expect(result.current.step).toBe('memo');
  });

  it('advance() when memo done moves to final', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'M', 2),
    );
    act(() => { result.current.advance(); });
    act(() => { result.current.advance(); });
    act(() => { vi.advanceTimersByTime(600); });
    act(() => { result.current.advance(); }); // to memo
    act(() => { result.current.advance(); }); // skip memo
    act(() => { result.current.advance(); }); // to final
    expect(result.current.step).toBe('final');
  });

  it('advance() in final step does nothing', () => {
    const { result } = renderHook(() =>
      useCarouselSummary('X', 'M', 2),
    );
    act(() => { result.current.advance(); });
    act(() => { result.current.advance(); });
    act(() => { vi.advanceTimersByTime(600); });
    act(() => { result.current.advance(); });
    act(() => { result.current.advance(); });
    act(() => { result.current.advance(); });
    expect(result.current.step).toBe('final');
    act(() => { result.current.advance(); });
    expect(result.current.step).toBe('final');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- useCarouselSummary --run
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement `useCarouselSummary`**

Create `src/hooks/useCarouselSummary.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTypewriter } from './useTypewriter';
import {
  playTelegraphClick,
  playOdometerClick,
  playLedgerDing,
  playPaperSwish,
  playDialogueTypewriterClick,
} from '@/src/audio/gameSfx';

export type CarouselStep = 'newspaper' | 'ledger' | 'memo' | 'final';

export interface UseCarouselSummaryResult {
  step: CarouselStep;
  isRevealing: boolean;
  canAdvance: boolean;
  headlineDisplayed: string;
  memoDisplayed: string;
  revealedLines: number;
  advance: () => void;
}

export function useCarouselSummary(
  headline: string,
  memoText: string,
  ledgerRowCount: number,
): UseCarouselSummaryResult {
  const [step, setStep] = useState<CarouselStep>('newspaper');
  const [revealedLines, setRevealedLines] = useState(0);
  const revealedLinesRef = useRef(0);

  // Headline typewriter — active only during 'newspaper' step
  const headlineTw = useTypewriter(
    step === 'newspaper' ? headline : '',
    35,
    playTelegraphClick,
    8,
  );

  // Memo typewriter — active only during 'memo' step
  const memoTw = useTypewriter(
    step === 'memo' ? memoText : '',
    40,
    playDialogueTypewriterClick,
    8,
  );

  // Ledger line counter — 300ms per line, only during 'ledger' step
  useEffect(() => {
    if (step !== 'ledger') return;
    setRevealedLines(0);
    revealedLinesRef.current = 0;
    const interval = setInterval(() => {
      revealedLinesRef.current += 1;
      const next = revealedLinesRef.current;
      setRevealedLines(next);
      if (next < ledgerRowCount) {
        playOdometerClick();
      } else {
        playLedgerDing();
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [step, ledgerRowCount]);

  const isRevealing =
    (step === 'newspaper' && !headlineTw.done) ||
    (step === 'ledger' && revealedLines < ledgerRowCount) ||
    (step === 'memo' && !memoTw.done);

  const advance = useCallback(() => {
    // Skip current reveal if still animating
    if (step === 'newspaper' && !headlineTw.done) {
      headlineTw.skipToEnd();
      return;
    }
    if (step === 'ledger' && revealedLines < ledgerRowCount) {
      revealedLinesRef.current = ledgerRowCount;
      setRevealedLines(ledgerRowCount);
      return;
    }
    if (step === 'memo' && !memoTw.done) {
      memoTw.skipToEnd();
      return;
    }
    // Reveal done — move to next step
    if (step === 'final') return;
    playPaperSwish();
    setStep(s => {
      if (s === 'newspaper') return 'ledger';
      if (s === 'ledger') return 'memo';
      if (s === 'memo') return 'final';
      return s;
    });
  }, [step, headlineTw, memoTw, revealedLines, ledgerRowCount]);

  return {
    step,
    isRevealing,
    canAdvance: !isRevealing,
    headlineDisplayed: headlineTw.displayed,
    memoDisplayed: memoTw.displayed,
    revealedLines,
    advance,
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- useCarouselSummary --run
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCarouselSummary.ts src/hooks/__tests__/useCarouselSummary.test.ts
git commit -m "feat(corkboard): add useCarouselSummary hook with step machine and reveal logic"
```

---

## Task 4: `NewspaperReveal` component

**Files:**
- Create: `src/components/corkboard/NewspaperReveal.tsx`

Framer Motion positioning pattern used here and in all reveal components:
- Outer `div`: `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none`
- Inner `motion.div`: the paper itself, with `variants` controlling position offsets from center

`x` and `y` in Framer Motion variants accept CSS unit strings (`'-38vw'`, `'-30vh'`), so viewport-relative dismissed positions work correctly without JS math.

- [ ] **Step 1: Create `src/components/corkboard/NewspaperReveal.tsx`**

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface NewspaperRevealProps {
  headlineDisplayed: string;
  headlineFull: string;
  deck: string;
  bodyLeft: string;
  bodyRight: string;
  isActive: boolean;
  isDismissed: boolean;
  canAdvance: boolean;
}

const VARIANTS = {
  hidden: { opacity: 0, scale: 0.7, y: -60, x: 0 },
  active: { opacity: 1, scale: 1, y: 0, x: 0 },
  dismissed: { opacity: 0.7, scale: 0.28, x: '-38vw', y: '-30vh' },
} as const;

export function NewspaperReveal({
  headlineDisplayed,
  headlineFull,
  deck,
  bodyLeft,
  bodyRight,
  isActive,
  isDismissed,
  canAdvance,
}: NewspaperRevealProps) {
  const { t } = useTranslation('campaign');
  const headlineDone =
    headlineFull.length > 0 && headlineDisplayed === headlineFull;
  const animateKey = isDismissed ? 'dismissed' : isActive ? 'active' : 'hidden';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: isActive ? 20 : 5,
      }}
    >
      <motion.div
        variants={VARIANTS}
        animate={animateKey}
        initial="hidden"
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <div className="w-96 bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
          <div className="border-b-2 border-[#141414] px-5 py-3 text-center">
            <p
              className="text-2xl font-black uppercase tracking-[0.1em] text-[#141414]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {t('corkboard.newspaper.masthead')}
            </p>
            <div className="flex justify-between mt-1.5 border-t border-[#141414]/20 pt-1.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">
                {t('corkboard.newspaper.eveningEdition')}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">
                {t('corkboard.newspaper.free')}
              </span>
            </div>
          </div>

          <div className="px-5 pt-4 pb-0">
            <p
              className="text-base font-black uppercase leading-tight tracking-[0.02em] text-[#141414]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {headlineDisplayed}
              {!headlineDone && (
                <span className="animate-pulse opacity-60">|</span>
              )}
            </p>
            {headlineDone && deck && (
              <p className="text-xs text-[#141414]/60 italic mt-2 pt-2 border-t border-[#141414]/15 leading-relaxed">
                {deck}
              </p>
            )}
          </div>

          {headlineDone && (bodyLeft || bodyRight) && (
            <div className="grid grid-cols-2 px-5 pt-3 pb-4 mt-3 border-t border-[#141414]/15 gap-0">
              <div className="text-[10px] leading-relaxed text-[#141414]/70 pr-3 border-r border-[#141414]/15">
                {bodyLeft}
              </div>
              <div className="text-[10px] leading-relaxed text-[#141414]/70 pl-3">
                {bodyRight}
              </div>
            </div>
          )}

          {canAdvance && (
            <div className="px-5 pb-4 text-center">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#141414]/40 animate-pulse">
                {t('corkboard.carousel.pressEnter')}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/corkboard/NewspaperReveal.tsx
git commit -m "feat(corkboard): add NewspaperReveal carousel component"
```

---

## Task 5: `LedgerReveal` component

**Files:**
- Create: `src/components/corkboard/LedgerReveal.tsx`

The stamp renders inside this component, but only when `showStamp` is true (controlled by `CorkboardScreen` in the `final` step). The stamp animates with a spring slam effect.

- [ ] **Step 1: Create `src/components/corkboard/LedgerReveal.tsx`**

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { LedgerData } from '@/src/types/campaign';

interface LedgerRevealProps {
  ledger: LedgerData;
  revealedLines: number;
  isActive: boolean;
  isDismissed: boolean;
  canAdvance: boolean;
  stampText?: string;
  showStamp?: boolean;
}

const VARIANTS = {
  hidden: { opacity: 0, scale: 0.7, y: -60, x: 0 },
  active: { opacity: 1, scale: 1, y: 0, x: 0 },
  dismissed: { opacity: 0.7, scale: 0.28, x: '38vw', y: '-30vh' },
} as const;

export function LedgerReveal({
  ledger,
  revealedLines,
  isActive,
  isDismissed,
  canAdvance,
  stampText,
  showStamp = false,
}: LedgerRevealProps) {
  const { t } = useTranslation('campaign');
  const animateKey = isDismissed ? 'dismissed' : isActive ? 'active' : 'hidden';

  const rows = [
    { label: t('corkboard.ledger.revenue'), value: `€${Math.round(ledger.shiftRevenue)}`, type: 'income' as const },
    { label: t('corkboard.ledger.coversSeated'), value: String(ledger.coversSeated), type: 'info' as const },
    { label: null, value: null, type: 'divider' as const },
    { label: t('corkboard.ledger.salaries'), value: `-€${ledger.salaryCost}`, type: 'expense' as const },
    { label: t('corkboard.ledger.electricity'), value: `-€${ledger.electricityCost}`, type: 'expense' as const },
    { label: t('corkboard.ledger.foodWithCovers', { count: ledger.coversSeated }), value: `-€${Math.round(ledger.foodCost)}`, type: 'expense' as const },
    { label: null, value: null, type: 'divider' as const },
    { label: t('corkboard.ledger.netProfit'), value: `€${Math.round(ledger.netProfit)}`, type: 'total' as const },
    { label: t('corkboard.ledger.cashOnHand'), value: `€${Math.round(ledger.cash)}`, type: 'total' as const },
    { label: t('corkboard.ledger.ratingLabel'), value: t('corkboard.ledger.ratingStars', { value: ledger.rating.toFixed(1) }), type: 'info' as const },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: isActive ? 20 : 5,
      }}
    >
      <motion.div
        variants={VARIANTS}
        animate={animateKey}
        initial="hidden"
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <div className="w-72 bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
          <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
              {t('corkboard.ledger.venueName')}
            </p>
            <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">
              {t('corkboard.ledger.shiftReport')}
            </p>
          </div>

          <div className="p-4 relative font-sans" style={{ minHeight: 200 }}>
            {showStamp && stampText && (
              <motion.div
                initial={{ opacity: 0, scale: 2.5, rotate: -25 }}
                animate={{ opacity: 1, scale: 1, rotate: -15 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                style={{
                  position: 'absolute',
                  top: '45%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-15deg)',
                  border: '3px solid rgba(180,30,30,0.75)',
                  color: 'rgba(180,30,30,0.75)',
                  padding: '4px 14px',
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              >
                {stampText}
              </motion.div>
            )}

            {rows.map((row, i) => {
              if (i >= revealedLines) return null;
              if (row.type === 'divider') {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="border-t border-dashed border-[#141414]/20 my-2"
                  />
                );
              }
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex justify-between items-baseline py-1"
                >
                  <span className="text-[11px] text-[#141414]/50 uppercase tracking-wide">
                    {row.label}
                  </span>
                  <span
                    className={`text-sm font-mono ${
                      row.type === 'total'
                        ? 'font-black text-[#141414]'
                        : row.type === 'expense'
                          ? 'text-[#141414]/70'
                          : 'text-[#141414]'
                    }`}
                  >
                    {row.value}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {canAdvance && (
            <div className="px-4 pb-4 text-center">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#141414]/40 animate-pulse">
                {t('corkboard.carousel.pressEnter')}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/corkboard/LedgerReveal.tsx
git commit -m "feat(corkboard): add LedgerReveal carousel component with stamp support"
```

---

## Task 6: `MemoReveal` component

**Files:**
- Create: `src/components/corkboard/MemoReveal.tsx`

During the typewriter reveal the full memo content is shown as a plain `<pre>`-style block (character by character). Once typing is done (`memoDisplayed === memoFull`), the component switches to the fully-styled layout (blockquote, salutation, sign-off, etc.). This gives the typewriter feel during reveal and the polished final look once complete.

- [ ] **Step 1: Create `src/components/corkboard/MemoReveal.tsx`**

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface MemoRevealProps {
  memoDisplayed: string;
  memoFull: string;
  isLoss: boolean;
  firedReason: 'MORALE' | 'VIP' | 'BANNED';
  nightSegment: string;
  isActive: boolean;
  isDismissed: boolean;
  canAdvance: boolean;
}

const VARIANTS = {
  hidden: { opacity: 0, scale: 0.7, y: 60, x: 0 },
  active: { opacity: 1, scale: 1, y: 0, x: 0 },
  dismissed: { opacity: 0.7, scale: 0.28, x: 0, y: '32vh' },
} as const;

export function MemoReveal({
  memoDisplayed,
  memoFull,
  isLoss,
  firedReason,
  nightSegment,
  isActive,
  isDismissed,
  canAdvance,
}: MemoRevealProps) {
  const { t } = useTranslation('campaign');
  const nk = `nights.${nightSegment}`;
  const isTypingDone = memoFull.length > 0 && memoDisplayed === memoFull;
  const animateKey = isDismissed ? 'dismissed' : isActive ? 'active' : 'hidden';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: isActive ? 20 : 5,
      }}
    >
      <motion.div
        variants={VARIANTS}
        animate={animateKey}
        initial="hidden"
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <div className="w-80 bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden">
          <div className="bg-[#141414] text-[#E4E3E0] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
              {t('corkboard.letter.venueName')}
            </p>
            <p className="text-xs font-black uppercase tracking-[0.15em] mt-0.5">
              {t('corkboard.letter.internalMemo')}
            </p>
          </div>

          <div className="p-5 font-sans" style={{ minHeight: 120 }}>
            {!isTypingDone ? (
              // During reveal: plain typewriter text
              <p className="text-sm text-[#141414]/80 leading-relaxed whitespace-pre-wrap">
                {memoDisplayed}
                <span className="animate-pulse opacity-60">|</span>
              </p>
            ) : isLoss ? (
              // After reveal, loss variant: full styled layout
              <>
                <p className="text-xs text-[#141414]/50 mb-3">
                  {t(`fired.${firedReason}.letterSalutation`)}
                </p>
                <p className="text-sm text-[#141414]/80 leading-relaxed whitespace-pre-line mb-4">
                  {t(`fired.${firedReason}.letterBody`)}
                </p>
                <blockquote className="border-l-2 border-[#141414] pl-3 mb-4 text-sm italic text-[#141414]/60 leading-relaxed">
                  &ldquo;{t(`fired.${firedReason}.letterQuote`)}&rdquo;
                </blockquote>
                <p className="text-xs text-[#141414]/50">
                  {t(`fired.${firedReason}.letterSignOff`)}
                </p>
                <p className="text-sm font-black uppercase tracking-[0.1em] mt-1">
                  {t('corkboard.letter.signOffName')}
                </p>
                <p className="text-[10px] text-[#141414]/40 italic mt-3 pt-3 border-t border-[#141414]/10">
                  {t('corkboard.letter.psLine', {
                    text: t(`fired.${firedReason}.letterPS`),
                  })}
                </p>
              </>
            ) : (
              // After reveal, win variant: full styled layout
              <>
                {(() => {
                  const quote = t(`${nk}.quote`);
                  const show = quote.trim() !== '...' && quote.trim() !== '…';
                  return show ? (
                    <blockquote className="border-l-2 border-[#141414] pl-3 mb-4 text-sm italic text-[#141414]/60 leading-relaxed">
                      &ldquo;{quote}&rdquo;
                    </blockquote>
                  ) : null;
                })()}
                <p className="text-sm text-[#141414]/80 leading-relaxed">
                  {(() => {
                    const m = t(`${nk}.memo`);
                    return m === '...' || m === '…'
                      ? t('corkboard.letter.memoFallback')
                      : m;
                  })()}
                </p>
                <p className="text-xs text-[#141414]/40 mt-4 pt-3 border-t border-[#141414]/10 font-black uppercase tracking-[0.1em]">
                  {t('corkboard.letter.signatureV')}
                </p>
              </>
            )}

            {canAdvance && (
              <div className="pt-3 text-center">
                <span className="text-[10px] font-bold tracking-[0.3em] text-[#141414]/40 animate-pulse">
                  {t('corkboard.carousel.pressEnter')}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/corkboard/MemoReveal.tsx
git commit -m "feat(corkboard): add MemoReveal carousel component"
```

---

## Task 7: Rewrite `CorkboardScreen` as orchestrator

**Files:**
- Modify: `src/components/CorkboardScreen.tsx`

What changes:
- Remove auto-timers, drag scroll, `ActivityLogPaper`, `LedgerPaper`, `NewspaperPaper`, `LetterPaper`, `DocPin`
- Background becomes dark mahogany (`#1a1008`) — the papers float above it
- Dark overlay sits at `z-index: 10`, fades out in `final` step
- Reveal components are absolutely positioned; footer/CTAs are at `z-index: 30`
- ENTER key + screen click call `advance()` (click on CTA buttons is stopped from propagating)
- Stamp triggers via `setTimeout` in `final` step with `playStampThwack` + delayed `playStampCrinkle`
- Win shows both CTAs; loss shows only "Give Resignation"

Note: rename the local `setTimeout` variable to `timerId` to avoid shadowing the `t` translation function.

- [ ] **Step 1: Rewrite `src/components/CorkboardScreen.tsx`**

```tsx
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { LedgerData, CampaignPath } from '../types/campaign';
import { campaignNightsKeySegment } from '../i18n/campaignNightKey';
import { useCarouselSummary } from '../hooks/useCarouselSummary';
import { playStampThwack, playStampCrinkle } from '../audio/gameSfx';
import { NewspaperReveal } from './corkboard/NewspaperReveal';
import { LedgerReveal } from './corkboard/LedgerReveal';
import { MemoReveal } from './corkboard/MemoReveal';

const LEDGER_ROW_COUNT = 10;

interface CorkboardScreenProps {
  variant: 'next_night' | 'fired';
  nightNumber: number;
  activePath: CampaignPath;
  ledger: LedgerData;
  firedReason?: 'MORALE' | 'VIP' | 'BANNED';
  onOpenRestaurant: () => void;
  onLeave: () => void;
}

export function CorkboardScreen({
  variant,
  nightNumber,
  activePath,
  ledger,
  firedReason,
  onOpenRestaurant,
  onLeave,
}: CorkboardScreenProps) {
  const { t } = useTranslation('campaign');
  const isLoss = variant === 'fired';
  const lossReason = firedReason ?? 'MORALE';
  const nightSegment = campaignNightsKeySegment(nightNumber, activePath);
  const nk = `nights.${nightSegment}`;

  const headline = isLoss
    ? t(`fired.${lossReason}.newspaperHeadline`)
    : t(`${nk}.newspaper`);

  const memoText = React.useMemo(() => {
    if (isLoss) {
      return [
        t(`fired.${lossReason}.letterSalutation`),
        t(`fired.${lossReason}.letterBody`),
        `"${t(`fired.${lossReason}.letterQuote`)}"`,
        t(`fired.${lossReason}.letterSignOff`),
        t('corkboard.letter.signOffName'),
        `P.S. ${t(`fired.${lossReason}.letterPS`)}`,
      ].join('\n\n');
    }
    const quote = t(`${nk}.quote`);
    const memo = t(`${nk}.memo`);
    const showQuote = quote.trim() !== '...' && quote.trim() !== '…';
    return showQuote ? `"${quote}"\n\n${memo}` : memo;
  }, [isLoss, lossReason, nk, t]);

  const {
    step,
    canAdvance,
    headlineDisplayed,
    memoDisplayed,
    revealedLines,
    advance,
  } = useCarouselSummary(headline, memoText, LEDGER_ROW_COUNT);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && step !== 'final') advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, step]);

  const [showStamp, setShowStamp] = React.useState(false);
  const [ctaReady, setCtaReady] = React.useState(false);

  React.useEffect(() => {
    if (step !== 'final') return;
    if (isLoss) {
      const t1 = setTimeout(() => {
        setShowStamp(true);
        playStampThwack();
        setTimeout(playStampCrinkle, 200);
      }, 500);
      const t2 = setTimeout(() => setCtaReady(true), 1400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    const t1 = setTimeout(() => setCtaReady(true), 500);
    return () => clearTimeout(t1);
  }, [step, isLoss]);

  const deck = isLoss
    ? t(`fired.${lossReason}.newspaperDeck`)
    : t(`${nk}.newspaperDeck`);
  const bodyLeft = isLoss
    ? t(`fired.${lossReason}.newspaperBodyLeft`)
    : t(`${nk}.newspaperBodyLeft`);
  const bodyRight = isLoss
    ? t(`fired.${lossReason}.newspaperBodyRight`)
    : t(`${nk}.newspaperBodyRight`);
  const stampText = isLoss ? t(`fired.${lossReason}.ledgerStamp`) : undefined;

  return (
    <div
      className="h-screen relative flex flex-col bg-[#1a1008] overflow-hidden select-none font-sans"
      onClick={() => { if (step !== 'final') advance(); }}
      style={{ cursor: step !== 'final' ? 'pointer' : 'default' }}
    >
      {/* Dim overlay — fades out in final step */}
      <motion.div
        className="absolute inset-0 bg-black/70 pointer-events-none"
        animate={{ opacity: step === 'final' ? 0 : 1 }}
        transition={{ duration: 0.6 }}
        style={{ zIndex: 10 }}
      />

      <NewspaperReveal
        headlineDisplayed={headlineDisplayed}
        headlineFull={headline}
        deck={deck}
        bodyLeft={bodyLeft}
        bodyRight={bodyRight}
        isActive={step === 'newspaper'}
        isDismissed={step === 'ledger' || step === 'memo' || step === 'final'}
        canAdvance={canAdvance && step === 'newspaper'}
      />

      <LedgerReveal
        ledger={ledger}
        revealedLines={revealedLines}
        isActive={step === 'ledger'}
        isDismissed={step === 'memo' || step === 'final'}
        canAdvance={canAdvance && step === 'ledger'}
        stampText={stampText}
        showStamp={showStamp}
      />

      <MemoReveal
        memoDisplayed={memoDisplayed}
        memoFull={memoText}
        isLoss={isLoss}
        firedReason={lossReason}
        nightSegment={nightSegment}
        isActive={step === 'memo'}
        isDismissed={step === 'final'}
        canAdvance={canAdvance && step === 'memo'}
      />

      {/* Footer */}
      <div
        className="absolute bottom-0 left-0 right-0 border-t border-[#E4E3E0]/10 flex items-center justify-between px-8 py-4"
        style={{ zIndex: 30 }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/30">
          {isLoss
            ? t('corkboard.footer.nightGameOver', { n: nightNumber })
            : t('corkboard.footer.nightReady', { n: nightNumber })}
        </span>

        <AnimatePresence>
          {ctaReady && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3"
              onClick={e => e.stopPropagation()}
            >
              {!isLoss && (
                <button
                  type="button"
                  onClick={onOpenRestaurant}
                  className="rounded-xl border-2 border-[#E4E3E0] bg-[#E4E3E0] px-10 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#141414] transition-all hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]"
                >
                  {t('corkboard.cta.openRestaurant')}
                </button>
              )}
              <button
                type="button"
                onClick={onLeave}
                className="rounded-xl border-2 border-[#E4E3E0]/40 px-8 py-2.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#E4E3E0]/60 transition-all hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]"
              >
                {t('corkboard.cta.giveResignation')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/20">
          {step !== 'final' ? t('corkboard.carousel.pressEnter') : ''}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no type errors

- [ ] **Step 3: Run all tests**

```bash
npm run test -- --run
```
Expected: all tests PASS

- [ ] **Step 4: Smoke test in dev**

```bash
npm run dev
```

Open the game and verify:
1. **Win path** — press Shift+C: newspaper slides in center, headline types character-by-character, ENTER dismisses it to top-left, ledger slides in and reveals line-by-line at 300ms pace, ENTER dismisses to top-right, memo slides in and types, ENTER dismisses to bottom-center, overlay lifts, both CTA buttons appear
2. **Loss path** — press Shift+F: same sequence, final step shows stamp slamming onto ledger (only "Give Resignation" CTA visible)
3. **Skip test** — press ENTER while text is typing → text jumps to complete instantly
4. **Click test** — clicking anywhere on screen (not on CTA buttons) advances the carousel

- [ ] **Step 5: Commit**

```bash
git add src/components/CorkboardScreen.tsx
git commit -m "feat(corkboard): rewrite CorkboardScreen as carousel orchestrator; remove activity log"
```
