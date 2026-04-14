# Boss Encounter — Handshake (Syndicate Don) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** `2026-04-14-boss-encounters-foundation.md` must be complete and merged.

**Goal:** Implement the Syndicate Don boss encounter — a Simon Says sequence memory game where the player must repeat a 4-step sequence on desk objects, with sequences growing longer each loop until time (10s) runs out.

**Architecture:** `HandshakeGame` is a pure React component with `useState` for sequence and player input tracking. Phase 1 animates the sequence (highlight each item for 400ms). Phase 2 accepts clicks and compares to the sequence. On full match, the sequence grows by one item and Phase 1 replays. Wrong click → instant lose. The outer overlay timer drives the 10s window.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, CSS animations

---

### Task 1: Add i18n keys for the Syndicate Don

**Files:**
- Modify: `src/i18n/locales/en/game.json`
- Modify: `src/i18n/locales/fr/game.json`

- [ ] **Step 1: Add boss quote keys inside the existing `"boss"` object**

`src/i18n/locales/en/game.json`:
```json
"boss": {
  "syndicateDon": {
    "quote": "You know the moves, or you don't."
  },
  ...existing boss keys...
}
```

`src/i18n/locales/fr/game.json`:
```json
"boss": {
  "syndicateDon": {
    "quote": "On connaît les gestes, ou on ne les connaît pas."
  },
  ...existing boss keys...
}
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/locales/en/game.json src/i18n/locales/fr/game.json
git commit -m "feat(i18n): add Syndicate Don boss quote"
```

---

### Task 2: Write tests for `HandshakeGame` logic

**Files:**
- Create: `src/components/boss/__tests__/HandshakeGame.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/boss/__tests__/HandshakeGame.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HandshakeGame } from '../HandshakeGame';

// Seed Math.random for deterministic sequences
const mockRandom = vi.spyOn(Math, 'random');

describe('HandshakeGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Always pick index 0 → deterministic sequence: [0,0,0,0,...]
    mockRandom.mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    mockRandom.mockRestore();
  });

  it('renders 4 desk items', () => {
    render(<HandshakeGame onWin={vi.fn()} onLose={vi.fn()} durationMs={10000} />);
    // Items: LEDGER, BELL, INKWELL, LEDGER (repeatable)
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('calls onLose on wrong click during phase 2', async () => {
    const onLose = vi.fn();
    // Sequence is all index 0 (LEDGER). Click index 1 (BELL) = wrong.
    render(<HandshakeGame onWin={vi.fn()} onLose={onLose} durationMs={10000} />);
    // Skip phase 1 animation
    act(() => { vi.advanceTimersByTime(2000); }); // phase 1 completes
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // wrong item
    expect(onLose).toHaveBeenCalledOnce();
  });

  it('does not call onWin or onLose during phase 1', async () => {
    const onWin = vi.fn();
    const onLose = vi.fn();
    render(<HandshakeGame onWin={onWin} onLose={onLose} durationMs={10000} />);
    act(() => { vi.advanceTimersByTime(100); });
    expect(onWin).not.toHaveBeenCalled();
    expect(onLose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/components/boss/__tests__/HandshakeGame.test.tsx
```
Expected: FAIL — cannot find module `../HandshakeGame`

---

### Task 3: Implement `HandshakeGame`

**Files:**
- Create: `src/components/boss/HandshakeGame.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/boss/HandshakeGame.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { MiniGameProps } from './BossEncounterOverlay';

const ITEMS = [
  { id: 'LEDGER',  label: 'Ledger',  emoji: '📖' },
  { id: 'BELL',    label: 'Bell',    emoji: '🔔' },
  { id: 'INKWELL', label: 'Inkwell', emoji: '🖋️' },
  { id: 'STAMP',   label: 'Stamp',   emoji: '📮' },
] as const;

type ItemId = typeof ITEMS[number]['id'];

type Phase = 'SHOWING' | 'WAITING';

function generateSequence(length: number): ItemId[] {
  return Array.from({ length }, () => ITEMS[Math.floor(Math.random() * ITEMS.length)].id);
}

export function HandshakeGame({ onWin, onLose }: MiniGameProps) {
  const [sequence, setSequence] = useState<ItemId[]>(() => generateSequence(4));
  const [playerInput, setPlayerInput] = useState<ItemId[]>([]);
  const [phase, setPhase] = useState<Phase>('SHOWING');
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const resolvedRef = useRef(false);

  const resolve = (outcome: 'WIN' | 'LOSE') => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (outcome === 'WIN') onWin(); else onLose();
  };

  // Phase 1: show sequence
  useEffect(() => {
    if (phase !== 'SHOWING') return;
    let i = 0;
    const showNext = () => {
      if (i >= sequence.length) {
        setHighlightIndex(-1);
        setPhase('WAITING');
        return;
      }
      setHighlightIndex(i);
      i++;
      setTimeout(showNext, 600); // 400ms highlight + 200ms gap
    };
    const t = setTimeout(showNext, 400); // initial delay
    return () => clearTimeout(t);
  }, [phase, sequence]);

  const handleClick = (id: ItemId) => {
    if (phase !== 'WAITING') return;

    const nextInput = [...playerInput, id];
    const pos = nextInput.length - 1;

    if (id !== sequence[pos]) {
      resolve('LOSE');
      return;
    }

    if (nextInput.length === sequence.length) {
      // Full match — grow sequence and replay
      setPlayerInput([]);
      const longer = [...sequence, ITEMS[Math.floor(Math.random() * ITEMS.length)].id];
      setSequence(longer);
      setPhase('SHOWING');
    } else {
      setPlayerInput(nextInput);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-white/40 text-xs tracking-[3px] uppercase">
        {phase === 'SHOWING' ? 'Watch the sequence...' : `Repeat — ${sequence.length} steps`}
      </p>

      <div className="flex gap-4">
        {ITEMS.map((item, idx) => {
          const isHighlighted = phase === 'SHOWING' && highlightIndex === idx;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              disabled={phase === 'SHOWING'}
              className={[
                'w-16 h-16 rounded-xl text-2xl flex items-center justify-center',
                'border-2 transition-all duration-100 select-none',
                isHighlighted
                  ? 'border-[#e8c97a] bg-[#e8c97a22] scale-110 shadow-[0_0_20px_#e8c97a66]'
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10',
                phase === 'SHOWING' ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            >
              {item.emoji}
            </button>
          );
        })}
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {sequence.map((_, i) => (
          <div
            key={i}
            className={[
              'w-2 h-2 rounded-full transition-colors',
              i < playerInput.length ? 'bg-[#e8c97a]' : 'bg-white/20',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
npm run test -- src/components/boss/__tests__/HandshakeGame.test.tsx
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/HandshakeGame.tsx src/components/boss/__tests__/HandshakeGame.test.tsx
git commit -m "feat: implement HandshakeGame (Simon Says) for Syndicate Don"
```

---

### Task 4: Register `HandshakeGame` in the overlay

**Files:**
- Modify: `src/components/boss/BossEncounterOverlay.tsx`

- [ ] **Step 1: Replace the `HANDSHAKE` placeholder in `MINI_GAMES`**

```tsx
// Add import at the top:
import { HandshakeGame } from './HandshakeGame';

// Replace placeholder:
const MINI_GAMES: Record<MiniGameId, React.FC<MiniGameProps>> = {
  HANDSHAKE: HandshakeGame,
  WHITE_GLOVE: ({ onWin, onLose }) => ( /* existing placeholder */ ),
  PAPARAZZI:   ({ onWin, onLose }) => ( /* existing placeholder */ ),
  COAT_CHECK:  ({ onWin, onLose }) => ( /* existing placeholder */ ),
};
```

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Trigger Syndicate Don (lower cash threshold temporarily to 0 in bossRoster.ts). Verify:
- Black screen appears with "SEAT." and Don's quote
- 4 items highlight in sequence (one at a time)
- Player can click items to repeat sequence
- Wrong click → overlay closes with penalty toast
- Correct full sequence → sequence grows + replays
- Timer bar drains over 10s; if expired → penalty

- [ ] **Step 4: Commit**

```bash
git add src/components/boss/BossEncounterOverlay.tsx
git commit -m "feat: register HandshakeGame in BossEncounterOverlay"
```
