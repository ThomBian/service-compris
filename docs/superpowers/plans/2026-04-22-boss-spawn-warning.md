# Boss Spawn Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a non-blocking dramatic toast (boss avatar + clue text) when a boss spawn condition is first met, delay the actual queue entry by 45 real seconds, and fire an ominous SFX sting.

**Architecture:** A new `onBossWarning` callback mirrors the existing `onShowDialogue` pattern — threaded from `App.tsx` → `GameProvider` → `useGameEngine` → `useClientSpawner`. `useClientSpawner` tracks warned bosses in a ref (no GameState changes), calls the callback, then schedules the spawn via `setTimeout`. `App.tsx` owns `bossWarning: BossDefinition | null` state and renders `BossWarningToast` as a portal.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, motion/react, Howler (via existing gameSfx.ts), react-i18next, Vitest

---

### Task 1: Foundation — constant, audio, z-index, i18n

**Files:**
- Modify: `src/constants.ts`
- Modify: `src/audio/gameSfx.ts`
- Modify: `src/zIndex.ts`
- Modify: `src/i18n/locales/en/ui.json`
- Modify: `src/i18n/locales/fr/ui.json`

- [ ] **Step 1: Add `BOSS_WARN_DELAY_MS` to constants.ts**

Find the block of timing constants near `TICK_RATE` and add:

```ts
/** Real-time ms between boss-warning toast and boss entering the queue. */
export const BOSS_WARN_DELAY_MS = 45_000;
```

- [ ] **Step 2: Add `playBossWarningSting()` to gameSfx.ts**

After the `playToastSound` function, add a lazy-loaded Howl for the warning sting (placeholder path reuses toast-warning.ogg until the real asset `/audio/boss/shared/boss-warning-sting.wav` is added):

```ts
let bossWarningSting: Howl | null = null;

function ensureBossWarningSting(): Howl {
  if (!bossWarningSting) {
    bossWarningSting = new Howl({
      src: ['/audio/boss/shared/boss-warning-sting.wav', '/audio/shared/toast/toast-warning.ogg'],
      volume: 0.65,
      preload: true,
      onloaderror: devLoadErr('boss-warning-sting'),
    });
  }
  return bossWarningSting;
}

/** Dramatic sting played when a boss spawn condition is first met. */
export function playBossWarningSting(): void {
  void Howler.ctx?.resume?.();
  const howl = ensureBossWarningSting();
  howl.stop();
  howl.play();
}
```

- [ ] **Step 3: Add `bossWarning` z-index to zIndex.ts**

Between `toast: 5000` and `devHud: 5900`, add:

```ts
/** Boss spawn warning toast — above regular toasts, below dev HUD. */
bossWarning: 5500,
```

- [ ] **Step 4: Add i18n keys**

In `src/i18n/locales/en/ui.json`, add a `boss` section at the top level:

```json
"boss": {
  "warningLabel": "Heads up"
}
```

In `src/i18n/locales/fr/ui.json`, add:

```json
"boss": {
  "warningLabel": "Attention"
}
```

- [ ] **Step 5: Commit**

```bash
git add src/constants.ts src/audio/gameSfx.ts src/zIndex.ts src/i18n/locales/en/ui.json src/i18n/locales/fr/ui.json
git commit -m "feat: add boss warning constant, SFX, z-index, and i18n keys"
```

---

### Task 2: BossWarningToast component

**Files:**
- Create: `src/components/boss/BossWarningToast.tsx`
- Create: `src/components/boss/__tests__/BossWarningToast.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/boss/__tests__/BossWarningToast.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
    render(<BossWarningToast boss={mockBoss} onDismiss={onDismiss} />);
    expect(screen.getByText('Watch out for the Pinstripes tonight.')).toBeTruthy();
  });

  it('calls onDismiss after 7000ms', () => {
    const onDismiss = vi.fn();
    render(<BossWarningToast boss={mockBoss} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(7000); });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not call onDismiss before 7000ms', () => {
    const onDismiss = vi.fn();
    render(<BossWarningToast boss={mockBoss} onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(6999); });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- BossWarningToast
```

Expected: FAIL — `BossWarningToast` not found.

- [ ] **Step 3: Implement `BossWarningToast`**

Create `src/components/boss/BossWarningToast.tsx`:

```tsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { BossDefinition } from '../../types';
import { PixelAvatar } from '../scene/PixelAvatar';
import { playBossWarningSting } from '../../audio/gameSfx';
import { Z_INDEX } from '../../zIndex';

const DISMISS_DELAY_MS = 7000;

interface BossWarningToastProps {
  boss: BossDefinition;
  onDismiss: () => void;
}

export const BossWarningToast: React.FC<BossWarningToastProps> = ({ boss, onDismiss }) => {
  const { t } = useTranslation('ui');

  useEffect(() => {
    playBossWarningSting();
    const timer = setTimeout(onDismiss, DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-20 left-4 flex items-center gap-3 rounded-xl border border-red-800 bg-[#1c0505] px-3 py-2.5 shadow-[0_4px_24px_rgba(220,38,38,0.35)] max-w-[260px]"
      style={{ zIndex: Z_INDEX.bossWarning }}
    >
      <div className="shrink-0">
        <PixelAvatar traits={boss.visualTraits} scale={3} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-red-500">
          {t('boss.warningLabel')}
        </span>
        <span className="text-[11px] text-red-200 leading-snug italic">
          {boss.clueText}
        </span>
      </div>
    </motion.div>,
    document.body,
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- BossWarningToast
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/boss/BossWarningToast.tsx src/components/boss/__tests__/BossWarningToast.test.tsx
git commit -m "feat: add BossWarningToast component"
```

---

### Task 3: Wire `onBossWarning` into `useClientSpawner`

**Files:**
- Modify: `src/hooks/useClientSpawner.ts`

- [ ] **Step 1: Add `onBossWarning` param and `warnedBossIdsRef`, replace immediate spawn with warn + delayed spawn**

At the top of `useClientSpawner`, add `useRef` to the React import and update the constants import:

```ts
import { useCallback, useEffect, useRef, Dispatch, SetStateAction } from 'react';
```

```ts
import { START_TIME, FIRST_NAMES, LAST_NAMES, DOORS_CLOSE_TIME, BOSS_WARN_DELAY_MS } from '../constants';
import type { BossDefinition } from '../types';
```

Change the function signature to accept the callback:

```ts
export function useClientSpawner(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  characters: React.RefObject<Map<string, SpecialCharacter>>,
  onBossWarning?: (boss: BossDefinition) => void,
)
```

Inside the function body, add the ref directly after the function signature opening:

```ts
const warnedBossIdsRef = useRef<Set<string>>(new Set());
```

Replace the BOSS CHARACTERS block at the bottom of the `useEffect`:

```ts
// BOSS CHARACTERS — warn first, spawn after delay
BOSS_ROSTER.forEach(boss => {
  const spawnKey = 'char-walkin-' + boss.id;
  if (gameState.spawnedReservationIds.includes(spawnKey)) return;
  if (warnedBossIdsRef.current.has(boss.id)) return;
  if (!boss.spawnCondition(gameState)) return;

  warnedBossIdsRef.current.add(boss.id);
  onBossWarning?.(boss);
  setTimeout(() => spawnCharacterWalkIn(boss), BOSS_WARN_DELAY_MS);
});
```

Also add `onBossWarning` to the `useEffect` dependency array at the bottom:

```ts
  ], [
    gameState.inGameMinutes,
    gameState.timeMultiplier,
    gameState.reservations,
    gameState.spawnedReservationIds,
    gameState.queue,
    gameState.queue.length,
    gameState.dailyCharacterIds,
    gameState.grid,
    gameState.cash,
    gameState.rating,
    gameState.shiftRevenue,
    gameState.morale,
    onBossWarning,
    spawnClient,
    spawnCharacterWalkIn,
    spawnBypassCharacter,
  ]);
```

- [ ] **Step 2: Run type-check to verify no errors**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useClientSpawner.ts
git commit -m "feat: warn before boss spawn via onBossWarning callback"
```

---

### Task 4: Thread `onBossWarning` through `useGameEngine` and `GameContext`

**Files:**
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Add `onBossWarning` to `useGameEngine`**

Add the import at the top of `useGameEngine.ts`:

```ts
import type { BossDefinition } from '../types';
```

Change the function signature (add `onBossWarning` after `onShowDialogue`):

```ts
export function useGameEngine(
  incrementPathScore?: (path: CampaignPath, delta: number) => void,
  pathScores?: PathScores,
  nightConfig?: NightConfig,
  onShowDialogue?: (lines: string[]) => void,
  onBossWarning?: (boss: BossDefinition) => void,
)
```

Pass it through to `useClientSpawner` — change the existing call:

```ts
const { spawnScriptedCharacter } = useClientSpawner(gameState, setGameState, characters, onBossWarning);
```

- [ ] **Step 2: Add `onBossWarning` to `GameContext`**

In `src/context/GameContext.tsx`, add the import:

```ts
import type { BossDefinition } from '../types';
```

Add to `GameProviderProps`:

```ts
interface GameProviderProps {
  children: ReactNode;
  incrementPathScore?: (path: CampaignPath, delta: number) => void;
  pathScores?: PathScores;
  nightConfig?: NightConfig;
  onShowDialogue?: (lines: string[]) => void;
  onBossWarning?: (boss: BossDefinition) => void;
}
```

Destructure and pass through in `GameProvider`:

```ts
export function GameProvider({
  children,
  incrementPathScore,
  pathScores,
  nightConfig,
  onShowDialogue,
  onBossWarning,
}: GameProviderProps) {
  const engine = useGameEngine(incrementPathScore, pathScores, nightConfig, onShowDialogue, onBossWarning);
  // ...
}
```

- [ ] **Step 3: Run type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGameEngine.ts src/context/GameContext.tsx
git commit -m "feat: thread onBossWarning callback through engine and context"
```

---

### Task 5: Wire `BossWarningToast` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports to App.tsx**

Add at the top with other imports:

```ts
import { BossWarningToast } from './components/boss/BossWarningToast';
import type { BossDefinition } from './types';
```

- [ ] **Step 2: Add `bossWarning` state and `onBossWarning` callback**

Inside the `App` component, near the `dialogueQueue` state, add:

```ts
const [bossWarning, setBossWarning] = React.useState<BossDefinition | null>(null);

const onBossWarning = React.useCallback((boss: BossDefinition) => {
  setBossWarning(boss);
}, []);

const onBossWarningDismiss = React.useCallback(() => {
  setBossWarning(null);
}, []);
```

Also clear the warning on phase change (next to the existing dialogue clear `useEffect`):

```ts
React.useEffect(() => {
  setBossWarning(null);
}, [phase]);
```

- [ ] **Step 3: Pass `onBossWarning` to `GameProvider`**

In the `<GameProvider>` JSX block, add the prop:

```tsx
<GameProvider
  incrementPathScore={campaign.incrementPathScore}
  pathScores={campaign.campaignState.pathScores}
  nightConfig={campaign.activeNightConfig}
  onShowDialogue={onShowDialogue}
  onBossWarning={onBossWarning}
>
```

- [ ] **Step 4: Render `BossWarningToast` inside the PLAYING phase block**

Add `AnimatePresence` to the imports from `motion/react` at the top of App.tsx:

```ts
import { AnimatePresence } from 'motion/react';
```

Inside the `{phase === 'PLAYING' && ( ... )}` block, after `</GameProvider>`, add:

```tsx
<AnimatePresence>
  {bossWarning && (
    <BossWarningToast key={bossWarning.id} boss={bossWarning} onDismiss={onBossWarningDismiss} />
  )}
</AnimatePresence>
```

The `key={bossWarning.id}` ensures AnimatePresence tracks the element correctly if two different bosses warn in the same shift.

- [ ] **Step 5: Run type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: render BossWarningToast on boss spawn condition met"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open the dev command palette (Cmd+Shift+K) and start a shift**

Use a night where at least one boss can spawn, or use the dev mini-game trigger buttons. To quickly trigger the Don (condition: `cash >= 600`), play until cash reaches 600.

Alternatively, temporarily lower the threshold in `bossRoster.ts` to `s.cash >= 0` for testing, then revert.

- [ ] **Step 3: Verify the following**

- [ ] Boss warning toast appears at bottom-left with boss avatar and clue text
- [ ] Toast auto-dismisses after ~7 seconds
- [ ] Boss enters the queue ~45 seconds after the toast appeared (not immediately)
- [ ] No second warning toast fires for the same boss after dismissal
- [ ] Regular gameplay continues uninterrupted while toast is visible
- [ ] `npm run lint` passes — revert any threshold changes

- [ ] **Step 4: Final commit (if any cleanup needed)**

```bash
git add -p
git commit -m "feat: boss spawn warning — smoke test cleanup"
```
