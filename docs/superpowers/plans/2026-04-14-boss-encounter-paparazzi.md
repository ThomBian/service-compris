# Boss Encounter — Paparazzi Flash (Influencer Megastar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** `2026-04-14-boss-encounters-foundation.md` must be complete and merged.

**Goal:** Implement the Influencer Megastar boss encounter — a whack-a-mole game where green viewfinders (good angles) and red viewfinders (bad angles) pop up at random positions. Click all greens, avoid reds, within 4 seconds.

**Architecture:** `PaparazziGame` uses `useEffect` + `setInterval` to spawn viewfinders at random positions every 600ms. Each viewfinder has an `id`, `x`, `y`, and `isGreen` flag. Clicking a red → instant `onLose()`. When all greens have been clicked before the timer ends → `onWin()`. Timer expiry or a missed green when the round ends → `onLose()`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, CSS keyframe animations

---

### Task 1: Add i18n keys for the Influencer Megastar

**Files:**
- Modify: `src/i18n/locales/en/game.json`
- Modify: `src/i18n/locales/fr/game.json`

- [ ] **Step 1: Add quote key inside the existing `"boss"` object**

`src/i18n/locales/en/game.json`:
```json
"boss": {
  "influencer": {
    "quote": "Only the good angles. I will know."
  },
  ...existing keys...
}
```

`src/i18n/locales/fr/game.json`:
```json
"boss": {
  "influencer": {
    "quote": "Uniquement les bons angles. Je saurai."
  },
  ...existing keys...
}
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/locales/en/game.json src/i18n/locales/fr/game.json
git commit -m "feat(i18n): add Influencer Megastar boss quote"
```

---

### Task 2: Write tests for `PaparazziGame` spawn logic

**Files:**
- Create: `src/components/boss/__tests__/PaparazziGame.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/components/boss/__tests__/PaparazziGame.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PaparazziGame } from '../PaparazziGame';

describe('PaparazziGame', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the game area', () => {
    render(<PaparazziGame onWin={vi.fn()} onLose={vi.fn()} durationMs={4000} />);
    expect(document.querySelector('[data-testid="paparazzi-arena"]')).toBeTruthy();
  });

  it('calls onLose when a red viewfinder is clicked', async () => {
    const onLose = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // isGreen = false when random > 0.6
    render(<PaparazziGame onWin={vi.fn()} onLose={onLose} durationMs={4000} />);
    act(() => { vi.advanceTimersByTime(700); }); // spawn first viewfinder
    const viewfinders = screen.queryAllByTestId('viewfinder');
    if (viewfinders.length > 0) {
      fireEvent.click(viewfinders[0]);
      expect(onLose).toHaveBeenCalledOnce();
    }
  });

  it('does not call onLose when a green viewfinder is clicked', () => {
    const onLose = vi.fn();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.3); // isGreen = true when random <= 0.6
    render(<PaparazziGame onWin={vi.fn()} onLose={onLose} durationMs={4000} />);
    act(() => { vi.advanceTimersByTime(700); });
    const greens = screen.queryAllByTestId('viewfinder-green');
    greens.forEach(v => fireEvent.click(v));
    expect(onLose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/components/boss/__tests__/PaparazziGame.test.tsx
```

---

### Task 3: Implement `PaparazziGame`

**Files:**
- Create: `src/components/boss/PaparazziGame.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/boss/PaparazziGame.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MiniGameProps } from './BossEncounterOverlay';

interface Viewfinder {
  id: string;
  x: number;    // % of container width
  y: number;    // % of container height
  isGreen: boolean;
}

const SPAWN_INTERVAL = 600;   // ms between spawns
const MAX_ALIVE = 6;          // max viewfinders on screen at once
const GREEN_RATIO = 0.6;      // 60% green, 40% red

function spawnViewfinder(): Viewfinder {
  return {
    id: Math.random().toString(36).slice(2),
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    isGreen: Math.random() <= GREEN_RATIO,
  };
}

export function PaparazziGame({ onWin, onLose }: MiniGameProps) {
  const [viewfinders, setViewfinders] = useState<Viewfinder[]>([]);
  const [clickedGreens, setClickedGreens] = useState(0);
  const [totalGreens, setTotalGreens] = useState(0);
  const resolvedRef = useRef(false);

  const resolve = useCallback((outcome: 'WIN' | 'LOSE') => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (outcome === 'WIN') onWin(); else onLose();
  }, [onWin, onLose]);

  // Spawn viewfinders on interval
  useEffect(() => {
    const interval = setInterval(() => {
      setViewfinders(prev => {
        if (prev.length >= MAX_ALIVE) return prev;
        const next = spawnViewfinder();
        if (next.isGreen) setTotalGreens(t => t + 1);
        return [...prev, next];
      });
    }, SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Remove viewfinder after 1.5s if not clicked (counts as missed green)
  useEffect(() => {
    if (viewfinders.length === 0) return;
    const timers = viewfinders.map(vf =>
      setTimeout(() => {
        setViewfinders(prev => {
          const removed = prev.find(v => v.id === vf.id);
          if (removed?.isGreen) resolve('LOSE'); // missed green
          return prev.filter(v => v.id !== vf.id);
        });
      }, 1500),
    );
    return () => timers.forEach(clearTimeout);
  }, [viewfinders, resolve]);

  const handleClick = (vf: Viewfinder) => {
    if (resolvedRef.current) return;
    setViewfinders(prev => prev.filter(v => v.id !== vf.id));
    if (!vf.isGreen) {
      resolve('LOSE');
      return;
    }
    const next = clickedGreens + 1;
    setClickedGreens(next);
    // Win condition: clicked 8 greens total without errors
    if (next >= 8) resolve('WIN');
  };

  return (
    <div
      data-testid="paparazzi-arena"
      className="relative w-full bg-black/60 rounded-xl overflow-hidden"
      style={{ height: 280 }}
    >
      <p className="absolute top-2 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-[3px] uppercase">
        Snap the good angles
      </p>

      {viewfinders.map(vf => (
        <button
          key={vf.id}
          data-testid={vf.isGreen ? 'viewfinder-green' : 'viewfinder'}
          onClick={() => handleClick(vf)}
          className={[
            'absolute w-12 h-12 rounded-full border-4 flex items-center justify-center',
            'text-xl transition-transform hover:scale-110 cursor-crosshair',
            'animate-[popIn_0.15s_ease-out]',
            vf.isGreen
              ? 'border-green-400 bg-green-400/10 text-green-400'
              : 'border-red-500  bg-red-500/10  text-red-500',
          ].join(' ')}
          style={{
            left: `calc(${vf.x}% - 24px)`,
            top:  `calc(${vf.y}% - 24px)`,
          }}
        >
          {vf.isGreen ? '📷' : '🚫'}
        </button>
      ))}

      <div className="absolute bottom-2 right-3 text-white/30 text-xs">
        {clickedGreens} / 8
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
npm run test -- src/components/boss/__tests__/PaparazziGame.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/PaparazziGame.tsx src/components/boss/__tests__/PaparazziGame.test.tsx
git commit -m "feat: implement PaparazziGame (whack-a-mole) for Influencer Megastar"
```

---

### Task 4: Register `PaparazziGame` in the overlay

**Files:**
- Modify: `src/components/boss/BossEncounterOverlay.tsx`

- [ ] **Step 1: Replace the `PAPARAZZI` placeholder**

```tsx
import { PaparazziGame } from './PaparazziGame';

const MINI_GAMES: Record<MiniGameId, React.FC<MiniGameProps>> = {
  HANDSHAKE:   HandshakeGame,
  WHITE_GLOVE: WhiteGloveGame,
  PAPARAZZI:   PaparazziGame,
  COAT_CHECK:  ({ onWin, onLose }) => ( /* placeholder */ ),
};
```

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Lower Influencer spawn condition to `(s) => true`. Verify:
- Influencer appears as VIP in queue
- Click SEAT → black overlay with "SEAT." and quote
- Green and red viewfinders pop up randomly
- Click red → lose immediately
- Miss a green → lose
- Hit 8 greens → win, proceed to seating

- [ ] **Step 4: Commit**

```bash
git add src/components/boss/BossEncounterOverlay.tsx
git commit -m "feat: register PaparazziGame in BossEncounterOverlay"
```
