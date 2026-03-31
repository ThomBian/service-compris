# Night 1 — Scripted Tutorial Shift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the spotlight tour with a scripted Night 1 tutorial that progressively reveals desk tools via Monsieur V.'s diegetic instructions, and establishes a generic ScriptedEvent system for future commentary.

**Architecture:** A `ScriptedEvent[]` array on `NightConfig` is evaluated each tick by a new `useScriptedEvents` hook. Events fire `SHOW_DIALOGUE`, `REVEAL_TOOL`, and `SPAWN_CHARACTER` actions. Night 1 starts with an empty desk (`revealedTools: []`) and reveals tools one by one across 5 scripted customer encounters. The Monsieur V. dialogue reuses the existing `MonsieurVSpeech` component from the intro, wrapped in a new in-game portal. The existing spotlight tour system is deleted entirely.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Vitest (Node env, `npm run test`)

---

## File Map

```
DELETE:
  src/tour/tourSteps.ts
  src/tour/__tests__/tourSteps.test.ts
  src/components/TourOverlay.tsx
  src/hooks/useTour.ts

CREATE:
  src/hooks/useScriptedEvents.ts
  src/components/MrVDialogue.tsx
  src/data/night1Reservations.ts
  src/logic/__tests__/scriptedEvents.test.ts

MODIFY:
  src/types.ts                    — add ToolReveal, ScriptedTrigger, ScriptedAction,
                                    ScriptedEvent; add firedEventIds + revealedTools to GameState
  src/types/campaign.ts           — add scriptedEvents? to NightConfig
  src/logic/gameLogic.ts          — seed firedEventIds + revealedTools in buildInitialState;
                                    accept nightNumber for revealedTools seeding;
                                    use night1Reservations for Night 1
  src/logic/characterRoster.ts    — add n1-vip-actor + n1-phantom-eater-night1
  src/data/campaignConfig.ts      — populate Night 1 scriptedEvents, rules, characterIds
  src/hooks/useGameEngine.ts      — accept nightConfig + onShowDialogue; wire useScriptedEvents;
                                    use nightConfig.rules + characterIds in resetGame
  src/hooks/useClientSpawner.ts   — expose spawnScriptedCharacter for SPAWN_CHARACTER actions
  src/context/GameContext.tsx     — pass nightConfig + onShowDialogue into GameProvider
  src/components/desk/DeskTools.tsx      — gate panels on revealedTools
  src/components/desk/Clipboard.tsx      — gate VIP/Banned tabs on revealedTools
  src/components/TopBar.tsx              — remove onTourClick prop + ? button
  src/App.tsx                            — remove tour, add dialogue queue, pass nightConfig
  src/storageKeys.ts                     — remove tourSeen key
```

---

## Task 1: Delete the spotlight tour

**Files:**
- Delete: `src/tour/tourSteps.ts`
- Delete: `src/tour/__tests__/tourSteps.test.ts`
- Delete: `src/components/TourOverlay.tsx`
- Delete: `src/hooks/useTour.ts`

- [ ] **Step 1: Delete tour files**

```bash
rm src/tour/tourSteps.ts src/tour/__tests__/tourSteps.test.ts src/components/TourOverlay.tsx src/hooks/useTour.ts
rmdir src/tour
```

- [ ] **Step 2: Remove tour from `src/storageKeys.ts`**

Find the `tourSeen` entry and delete it:

```ts
// Before
export const STORAGE_KEYS = {
  lang: 'service-compris-lang',
  tourSeen: 'service-compris-tour-seen',
  introSeen: 'service-compris-intro-seen',
};

// After
export const STORAGE_KEYS = {
  lang: 'service-compris-lang',
  introSeen: 'service-compris-intro-seen',
};
```

- [ ] **Step 3: Remove onTourClick prop and ? button from `src/components/TopBar.tsx`**

Remove `onTourClick` from the `TopBarProps` interface and remove the `HelpCircle` button from the JSX. Also remove the `HelpCircle` import if no longer used.

```tsx
// Remove from TopBarProps interface:
onTourClick: () => void;

// Remove from component params:
onTourClick,

// Remove the HelpCircle button — find and delete this JSX block:
<button type="button" onClick={onTourClick} ...>
  <HelpCircle ... />
</button>

// Remove from imports if HelpCircle is no longer used:
import { ..., HelpCircle } from "lucide-react";
// → remove HelpCircle from the import
```

- [ ] **Step 4: Remove data-tour attribute from `src/components/desk/DeskTools.tsx`**

```tsx
// Before
<div className="..." data-tour="desk-tools">

// After
<div className="...">
```

- [ ] **Step 5: Strip tour wiring from `src/App.tsx`**

Remove these imports:
```ts
import { TourOverlay } from './components/TourOverlay';
import { useTour, TOUR_SEEN_KEY } from './hooks/useTour';
import { TOUR_STEPS, TOUR_STEP_INDEX_SEAT_PARTY } from './tour/tourSteps';
```

Remove `useTour` call in `App`:
```ts
// Delete this line:
const tour = useTour(TOUR_STEPS.length);
```

Remove tour props from `GameContentProps` interface:
```ts
// Delete these fields from GameContentProps:
isTourActive: boolean;
currentStep: number;
onTourNext: () => void;
onTourSkip: () => void;
startTour: () => void;
```

Remove tour usage inside `GameContent`:
- Delete `tourAutoStartedRef` and its `useEffect`
- Delete `tourWasActiveRef` and its `useEffect`
- Delete the `useEffect` that calls `setView(TOUR_STEPS[currentStep].view)`
- Delete `{isTourActive && <TourOverlay ... />}` from the JSX
- Remove `tourSeatPartySpotlight` from the `<ScenePanel>` prop
- Remove `isTourActive` from the `useGameAmbience` call

Update the `<GameContent>` element in `App` to remove tour props:
```tsx
// Before
<GameContent
  initialDifficulty={difficulty}
  persist={persist}
  onShiftEnd={handleShiftEnd}
  isTourActive={tour.isTourActive}
  currentStep={tour.currentStep}
  onTourNext={tour.nextStep}
  onTourSkip={tour.skipTour}
  startTour={tour.startTour}
  playerIdentity={playerIdentity}
/>

// After
<GameContent
  initialDifficulty={difficulty}
  persist={persist}
  onShiftEnd={handleShiftEnd}
  playerIdentity={playerIdentity}
/>
```

Update `onTourClick` in `<TopBar>` to remove the prop (TopBar no longer has it):
```tsx
// Remove this prop from TopBar usage:
onTourClick={startTour}
```

- [ ] **Step 6: Remove data-tour attributes from other components**

In `src/components/scene/DeskScene.tsx`: find and remove `data-tour="queue"` attribute.
In `src/components/floorplan/FloorplanGrid.tsx`: find and remove `data-tour="floorplan"` attribute.

- [ ] **Step 7: Verify build passes**

```bash
npm run lint
```

Expected: no TypeScript errors. Fix any remaining tour references.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: retire spotlight tour — Night 1 is the tutorial"
```

---

## Task 2: Add ScriptedEvent types

**Files:**
- Modify: `src/types.ts`
- Modify: `src/types/campaign.ts`

- [ ] **Step 1: Add ToolReveal + ScriptedEvent types to `src/types.ts`**

Add after the `GameOverReason` type (around line 137):

```ts
// --- Scripted Events ---

export type ToolReveal = 'LEDGER' | 'PARTY_TICKET' | 'CLIPBOARD_VIP' | 'CLIPBOARD_BANNED';

export type ScriptedTrigger =
  | { kind: 'TIME'; minute: number }
  | { kind: 'CHARACTER_AT_DESK'; characterId: string }
  | { kind: 'CHARACTER_TYPE_AT_DESK'; type: ClientType };

export type ScriptedAction =
  | { kind: 'SHOW_DIALOGUE'; lines: string[] }
  | { kind: 'REVEAL_TOOL'; tool: ToolReveal }
  | { kind: 'SPAWN_CHARACTER'; characterId: string; delayMinutes?: number };

export interface ScriptedEvent {
  id: string;
  trigger: ScriptedTrigger;
  actions: ScriptedAction[];
  /** Default true — fire once and record in firedEventIds. Set false for repeating commentary. */
  once?: boolean;
}
```

- [ ] **Step 2: Add firedEventIds + revealedTools to GameState in `src/types.ts`**

Add two new fields to the `GameState` interface:

```ts
export interface GameState {
  // ... existing fields ...
  firedEventIds: string[];
  revealedTools: ToolReveal[];
}
```

- [ ] **Step 3: Add scriptedEvents to NightConfig in `src/types/campaign.ts`**

```ts
import type { ScriptedEvent } from '../types';

export interface NightConfig {
  characterIds: string[];
  rules: ActiveRule[];
  scriptedEvents?: ScriptedEvent[];
}
```

- [ ] **Step 4: Write a type test to verify the structure compiles**

In `src/types/__tests__/campaign.test.ts`, add:

```ts
import type { NightConfig } from '../campaign';
import type { ScriptedEvent } from '../../types';
import { ClientType } from '../../types';

it('NightConfig accepts scriptedEvents', () => {
  const event: ScriptedEvent = {
    id: 'test-event',
    trigger: { kind: 'TIME', minute: 1172 },
    actions: [
      { kind: 'SHOW_DIALOGUE', lines: ['Hello.'] },
      { kind: 'REVEAL_TOOL', tool: 'LEDGER' },
    ],
  };
  const config: NightConfig = {
    characterIds: [],
    rules: [],
    scriptedEvents: [event],
  };
  expect(config.scriptedEvents).toHaveLength(1);
});

it('ScriptedEvent CHARACTER_AT_DESK trigger compiles', () => {
  const event: ScriptedEvent = {
    id: 'at-desk',
    trigger: { kind: 'CHARACTER_AT_DESK', characterId: 'the-phantom-eater' },
    actions: [{ kind: 'SHOW_DIALOGUE', lines: ['Check the list.'] }],
  };
  expect(event.trigger.kind).toBe('CHARACTER_AT_DESK');
});
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- src/types/__tests__/campaign.test.ts
```

Expected: all tests pass (new ones + existing).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/types/campaign.ts src/types/__tests__/campaign.test.ts
git commit -m "feat(types): add ScriptedEvent, ToolReveal, firedEventIds, revealedTools"
```

---

## Task 3: Seed new GameState fields in buildInitialState

**Files:**
- Create: `src/data/night1Reservations.ts`
- Modify: `src/logic/gameLogic.ts`
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write failing tests**

In `src/logic/__tests__/gameLogic.test.ts`, add:

```ts
import { buildInitialState } from '../gameLogic';

describe('buildInitialState — revealedTools', () => {
  it('seeds empty revealedTools for Night 1', () => {
    const state = buildInitialState(1);
    expect(state.revealedTools).toEqual([]);
  });

  it('seeds full revealedTools for Night 2', () => {
    const state = buildInitialState(1, { cash: 0, rating: 5, morale: 100, nightNumber: 2 });
    expect(state.revealedTools).toEqual(['LEDGER', 'PARTY_TICKET', 'CLIPBOARD_VIP', 'CLIPBOARD_BANNED']);
  });

  it('seeds empty firedEventIds on every night', () => {
    const state = buildInitialState(1);
    expect(state.firedEventIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to see them fail**

```bash
npm run test -- src/logic/__tests__/gameLogic.test.ts
```

Expected: FAIL — `state.revealedTools` is undefined, `state.firedEventIds` is undefined.

- [ ] **Step 3: Create Night 1 reservations data**

Create `src/data/night1Reservations.ts`:

```ts
import type { Reservation } from '../types';
import { START_TIME } from '../constants';

/**
 * Scripted reservations for Night 1 tutorial only.
 * Spawned on-demand by useScriptedEvents — NOT auto-spawned by useClientSpawner
 * (RESERVATIONS_DISABLED rule blocks auto-spawning).
 * IDs are prefixed 'n1-res-' so useScriptedEvents can identify them.
 */
export const NIGHT_1_RESERVATIONS: Reservation[] = [
  // Step 2 — legitimate businessman
  {
    id: 'n1-res-businessman',
    time: START_TIME + 8,   // 19:38
    firstName: 'Henri',
    lastName: 'Moreau',
    partySize: 2,
    arrived: false,
    partySeated: false,
  },
  // Step 3 — late group claiming party of 2 but arriving as 4
  // (spawner will create a SCAMMER client via normal SIZE-lie logic)
  {
    id: 'n1-res-late-group',
    time: START_TIME + 15,  // 19:45
    firstName: 'Dupont',
    lastName: 'Réservation',
    partySize: 2,
    arrived: false,
    partySeated: false,
  },
  // Step 5 — Phantom Eater alias reservation (valid name, on time)
  {
    id: 'n1-res-phantom',
    time: START_TIME + 29,  // 19:59
    firstName: 'Le',
    lastName: 'Fantôme',
    partySize: 1,
    arrived: false,
    partySeated: false,
  },
];
```

- [ ] **Step 4: Update `buildInitialState` in `src/logic/gameLogic.ts`**

Add import at top:
```ts
import { NIGHT_1_RESERVATIONS } from '../data/night1Reservations';
```

Update the import of `ToolReveal` from types:
```ts
import {
  // ... existing imports ...
  type ToolReveal,
} from '../types';
```

Inside `buildInitialState`, change the Night 1 reservation line and add the two new fields:

```ts
// Replace:
const baseReservations = nightNumber === 1
  ? INITIAL_RESERVATIONS
  : generateReservations({ nightNumber, rating });

// With:
const baseReservations = nightNumber === 1
  ? NIGHT_1_RESERVATIONS
  : generateReservations({ nightNumber, rating });
```

```ts
// In the returned object, add:
return {
  // ... existing fields ...
  firedEventIds: [],
  revealedTools: nightNumber === 1
    ? []
    : (['LEDGER', 'PARTY_TICKET', 'CLIPBOARD_VIP', 'CLIPBOARD_BANNED'] as ToolReveal[]),
};
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- src/logic/__tests__/gameLogic.test.ts
```

Expected: new tests PASS. Existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/data/night1Reservations.ts src/logic/gameLogic.ts src/logic/__tests__/gameLogic.test.ts
git commit -m "feat: seed revealedTools and firedEventIds; use Night 1 scripted reservations"
```

---

## Task 4: Add Night 1 characters to roster

**Files:**
- Modify: `src/logic/characterRoster.ts`
- Modify: `src/logic/__tests__/characterRoster.test.ts`

The Phantom Eater's existing entry has `arrivalMO: 'WALK_IN'`. For Night 1 step 5, he needs to arrive with a reservation alias. We add a Night 1-specific variant.

- [ ] **Step 1: Write a failing test**

In `src/logic/__tests__/characterRoster.test.ts`, add:

```ts
it('has n1-vip-actor in the roster', () => {
  const def = CHARACTER_ROSTER.find(c => c.id === 'n1-vip-actor');
  expect(def).toBeDefined();
  expect(def?.role).toBe('VIP');
});

it('has n1-phantom-eater-night1 in the roster', () => {
  const def = CHARACTER_ROSTER.find(c => c.id === 'n1-phantom-eater-night1');
  expect(def).toBeDefined();
  expect(def?.role).toBe('BANNED');
  expect(def?.arrivalMO).toBe('RESERVATION_ALIAS');
  expect(def?.aliasFirstName).toBe('Le');
  expect(def?.aliasLastName).toBe('Fantôme');
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test -- src/logic/__tests__/characterRoster.test.ts
```

Expected: FAIL — IDs not found in roster.

- [ ] **Step 3: Add the two new character definitions to `src/logic/characterRoster.ts`**

Add before the closing bracket of `CHARACTER_ROSTER`, in a clearly labelled Night 1 section:

```ts
// ── Night 1 Tutorial Characters ───────────────────────────────────────────────
{
  id: 'n1-vip-actor',
  name: 'Le Comédien',
  role: 'VIP',
  behaviorType: 'STANDARD_VIP',
  arrivalMO: 'WALK_IN',
  expectedPartySize: 1,
  clueText: 'Gold watch, velvet lapels. Known face from the boulevard.',
  // Gold watch → neckwear: 1 (gold cravat), clothingStyle: 0 (formal)
  visualTraits: { skinTone: 1, hairStyle: 2, hairColor: 1, clothingStyle: 0, clothingColor: 0, height: 2, neckwear: 1 },
  cashBonus: 80,
  consequenceDescription: 'The Comédien tweets a glowing review. Small cash bonus.',
  refusalDescription: 'The Comédien leaves in a huff. No viral moment.',
},
{
  id: 'n1-phantom-eater-night1',
  name: 'The Phantom Eater',
  role: 'BANNED',
  behaviorType: 'STANDARD_BANNED',
  arrivalMO: 'RESERVATION_ALIAS',
  aliasFirstName: 'Le',
  aliasLastName: 'Fantôme',
  expectedPartySize: 1,
  reservedPartySize: 1,
  clueText: 'Different disguise each time. Always the same chipped gold tooth.',
  // Chipped gold tooth → eyebrows: 0 (furrowed tells the stress), glasses: 0 (hiding in plain sight)
  visualTraits: { skinTone: 0, hairStyle: 3, hairColor: 2, clothingStyle: 1, clothingColor: 4, height: 1, glasses: 0 },
  cashPenalty: 120,
  consequenceDescription: 'The Phantom Eater finishes every course and leaves €0. −€120.',
  refusalDescription: 'Not tonight, Phantom. Night 1 is a clean sheet.',
  gameOver: false,
},
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/logic/__tests__/characterRoster.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/characterRoster.ts src/logic/__tests__/characterRoster.test.ts
git commit -m "feat(roster): add Night 1 tutorial characters (VIP actor, Phantom Eater alias)"
```

---

## Task 5: Create the `useScriptedEvents` hook

**Files:**
- Create: `src/hooks/useScriptedEvents.ts`
- Create: `src/logic/__tests__/scriptedEvents.test.ts`
- Modify: `src/hooks/useClientSpawner.ts`

The hook watches `gameState` for trigger conditions, and dispatches actions. For `SPAWN_CHARACTER`, it uses a dedicated function that handles the 3 client types needed for Night 1.

- [ ] **Step 1: Extract trigger evaluation as a pure function (testable)**

Create `src/logic/__tests__/scriptedEvents.test.ts`:

```ts
import { evaluateTimeTrigger, shouldFireEvent } from '../../hooks/useScriptedEvents';
import type { ScriptedEvent } from '../../types';

const baseEvent: ScriptedEvent = {
  id: 'test',
  trigger: { kind: 'TIME', minute: 1180 },
  actions: [],
};

describe('evaluateTimeTrigger', () => {
  it('returns true when currentTime >= trigger minute', () => {
    expect(evaluateTimeTrigger(1180, 1180)).toBe(true);
    expect(evaluateTimeTrigger(1181, 1180)).toBe(true);
  });

  it('returns false when currentTime < trigger minute', () => {
    expect(evaluateTimeTrigger(1179, 1180)).toBe(false);
  });
});

describe('shouldFireEvent', () => {
  it('returns false if event already in firedEventIds', () => {
    expect(shouldFireEvent(baseEvent, ['test'], 1180, null)).toBe(false);
  });

  it('returns true for TIME trigger when not yet fired', () => {
    expect(shouldFireEvent(baseEvent, [], 1180, null)).toBe(true);
  });

  it('returns false for TIME trigger when time not reached', () => {
    expect(shouldFireEvent(baseEvent, [], 1179, null)).toBe(false);
  });

  it('fires once=false events even if id is in firedEventIds', () => {
    const repeating: ScriptedEvent = { ...baseEvent, once: false };
    expect(shouldFireEvent(repeating, ['test'], 1180, null)).toBe(true);
  });

  it('returns true for CHARACTER_AT_DESK when characterId matches currentClient', () => {
    const event: ScriptedEvent = {
      id: 'char-event',
      trigger: { kind: 'CHARACTER_AT_DESK', characterId: 'the-phantom-eater' },
      actions: [],
    };
    expect(shouldFireEvent(event, [], 1200, 'the-phantom-eater')).toBe(true);
  });

  it('returns false for CHARACTER_AT_DESK when characterId does not match', () => {
    const event: ScriptedEvent = {
      id: 'char-event',
      trigger: { kind: 'CHARACTER_AT_DESK', characterId: 'the-phantom-eater' },
      actions: [],
    };
    expect(shouldFireEvent(event, [], 1200, 'someone-else')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test -- src/logic/__tests__/scriptedEvents.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/useScriptedEvents.ts`**

```ts
import { useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import type { GameState, ScriptedEvent, ToolReveal, PhysicalState } from '../types';
import { PhysicalState as PS } from '../types';
import type { NightConfig } from '../types/campaign';
import { CHARACTER_ROSTER } from '../logic/characterRoster';

// --- Pure helpers (exported for testing) ---

export function evaluateTimeTrigger(currentMinute: number, targetMinute: number): boolean {
  return currentMinute >= targetMinute;
}

/**
 * Returns true if this event should fire right now.
 * `currentCharacterId` is the characterId of the client currently AT_DESK (or null).
 */
export function shouldFireEvent(
  event: ScriptedEvent,
  firedEventIds: string[],
  currentMinute: number,
  currentCharacterId: string | null,
): boolean {
  const alreadyFired = firedEventIds.includes(event.id);
  if (alreadyFired && event.once !== false) return false;

  const { trigger } = event;

  if (trigger.kind === 'TIME') {
    return evaluateTimeTrigger(currentMinute, trigger.minute);
  }

  if (trigger.kind === 'CHARACTER_AT_DESK') {
    return currentCharacterId === trigger.characterId;
  }

  // CHARACTER_TYPE_AT_DESK — caller passes the type separately if needed
  return false;
}

// --- Hook ---

export function useScriptedEvents(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  nightConfig: NightConfig | undefined,
  onShowDialogue: (lines: string[]) => void,
  spawnScriptedCharacter: (characterId: string) => void,
): void {
  const events = nightConfig?.scriptedEvents ?? [];

  // Derive the current client's characterId for CHARACTER_AT_DESK matching
  const atDeskCharacterId =
    gameState.currentClient?.physicalState === PS.AT_DESK
      ? (gameState.currentClient.characterId ?? null)
      : null;

  const dispatchActions = useCallback((event: ScriptedEvent) => {
    for (const action of event.actions) {
      if (action.kind === 'SHOW_DIALOGUE') {
        onShowDialogue(action.lines);
      } else if (action.kind === 'REVEAL_TOOL') {
        setGameState(prev => {
          if (prev.revealedTools.includes(action.tool)) return prev;
          return { ...prev, revealedTools: [...prev.revealedTools, action.tool] };
        });
      } else if (action.kind === 'SPAWN_CHARACTER') {
        const delay = action.delayMinutes ?? 0;
        if (delay === 0) {
          spawnScriptedCharacter(action.characterId);
        } else {
          setTimeout(() => spawnScriptedCharacter(action.characterId), delay * 60 * 1000 / gameState.timeMultiplier);
        }
      }
    }
  }, [onShowDialogue, setGameState, spawnScriptedCharacter, gameState.timeMultiplier]);

  // TIME triggers — evaluated on every minute tick
  useEffect(() => {
    if (events.length === 0) return;

    for (const event of events) {
      if (event.trigger.kind !== 'TIME') continue;
      if (!shouldFireEvent(event, gameState.firedEventIds, gameState.inGameMinutes, null)) continue;

      if (event.once !== false) {
        setGameState(prev => ({
          ...prev,
          firedEventIds: prev.firedEventIds.includes(event.id)
            ? prev.firedEventIds
            : [...prev.firedEventIds, event.id],
        }));
      }
      dispatchActions(event);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.inGameMinutes]);

  // CHARACTER_AT_DESK triggers — evaluated when current client changes
  useEffect(() => {
    if (events.length === 0 || atDeskCharacterId === null) return;

    for (const event of events) {
      if (event.trigger.kind !== 'CHARACTER_AT_DESK') continue;
      if (!shouldFireEvent(event, gameState.firedEventIds, gameState.inGameMinutes, atDeskCharacterId)) continue;

      if (event.once !== false) {
        setGameState(prev => ({
          ...prev,
          firedEventIds: prev.firedEventIds.includes(event.id)
            ? prev.firedEventIds
            : [...prev.firedEventIds, event.id],
        }));
      }
      dispatchActions(event);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentClient?.id, atDeskCharacterId]);
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/logic/__tests__/scriptedEvents.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Add `spawnScriptedCharacter` to `useClientSpawner`**

In `src/hooks/useClientSpawner.ts`, add a new callback after `spawnBypassCharacter`:

```ts
/**
 * Spawns a scripted Night 1 character by ID.
 * Looks up CHARACTER_ROSTER for VIP/BANNED characters.
 * For 'n1-walkIn-couple': spawns a plain walk-in (party of 2, no lies).
 * For 'n1-res-*' IDs: finds the matching reservation in gameState.reservations and spawns it.
 */
const spawnScriptedCharacter = useCallback((characterId: string) => {
  // VIP/BANNED character from roster
  const charDef = CHARACTER_ROSTER.find(c => c.id === characterId);
  if (charDef) {
    spawnCharacterWalkIn(charDef);
    return;
  }

  // Generic walk-in (e.g. 'n1-walkIn-couple')
  if (characterId === 'n1-walkIn-couple') {
    setGameState(prev => {
      const spawnKey = 'scripted-' + characterId;
      if (prev.spawnedReservationIds.includes(spawnKey)) return prev;
      const newClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        type: ClientType.WALK_IN,
        patience: 100,
        physicalState: PhysicalState.IN_QUEUE,
        dialogueState: DialogueState.AWAITING_GREETING,
        spawnTime: prev.inGameMinutes,
        trueFirstName: 'Marie',
        trueLastName: 'Leblanc',
        truePartySize: 2,
        isLate: false,
        lieType: LieType.NONE,
        hasLied: false,
        visualTraits: { skinTone: 2, hairStyle: 1, hairColor: 2, clothingStyle: 2, clothingColor: 0, height: 1 },
        isCaught: false,
        lastMessage: tGame('waitingInLine'),
        chatHistory: [],
      };
      return {
        ...prev,
        queue: [...prev.queue, newClient],
        spawnedReservationIds: [...prev.spawnedReservationIds, spawnKey],
      };
    });
    return;
  }

  // Reservation-based scripted spawn (n1-res-businessman, n1-res-late-group, n1-res-phantom)
  if (characterId.startsWith('n1-res-')) {
    setGameState(prev => {
      const res = prev.reservations.find(r => r.id === characterId);
      if (!res || prev.spawnedReservationIds.includes(res.id)) return prev;
      // For n1-res-late-group: override to create a scammer with SIZE lie
      if (characterId === 'n1-res-late-group') {
        const scammer: Client = {
          id: Math.random().toString(36).substr(2, 9),
          type: ClientType.SCAMMER,
          patience: 100,
          physicalState: PhysicalState.IN_QUEUE,
          dialogueState: DialogueState.AWAITING_GREETING,
          spawnTime: prev.inGameMinutes,
          trueFirstName: res.firstName,
          trueLastName: res.lastName,
          truePartySize: 4,            // true party is 4
          trueReservationId: res.id,
          isLate: true,                // 30 min late
          lieType: LieType.SIZE,       // lies about size (claims 2, brings 4)
          hasLied: false,
          visualTraits: { skinTone: 3, hairStyle: 0, hairColor: 3, clothingStyle: 1, clothingColor: 2, height: 1 },
          isCaught: false,
          lastMessage: tGame('waitingInLine'),
          chatHistory: [],
        };
        return {
          ...prev,
          queue: [...prev.queue, scammer],
          spawnedReservationIds: [...prev.spawnedReservationIds, res.id],
        };
      }
      // For n1-res-phantom: spawn with the Phantom Eater character linked
      if (characterId === 'n1-res-phantom') {
        const phantomDef = CHARACTER_ROSTER.find(c => c.id === 'n1-phantom-eater-night1');
        const newClient: Client = {
          id: Math.random().toString(36).substr(2, 9),
          type: ClientType.SCAMMER,
          patience: 100,
          physicalState: PhysicalState.IN_QUEUE,
          dialogueState: DialogueState.AWAITING_GREETING,
          spawnTime: prev.inGameMinutes,
          trueFirstName: 'Fantôme',
          trueLastName: 'Inconnu',
          truePartySize: 1,
          trueReservationId: res.id,
          isLate: false,
          lieType: LieType.IDENTITY,
          hasLied: false,
          visualTraits: phantomDef?.visualTraits ?? { skinTone: 0, hairStyle: 3, hairColor: 2, clothingStyle: 1, clothingColor: 4, height: 1, glasses: 0 },
          isCaught: false,
          characterId: 'n1-phantom-eater-night1',
          lastMessage: tGame('waitingInLine'),
          chatHistory: [],
        };
        return {
          ...prev,
          queue: [...prev.queue, newClient],
          spawnedReservationIds: [...prev.spawnedReservationIds, res.id],
        };
      }
      // Default: legitimate reservation holder (n1-res-businessman)
      spawnClient(res);
      return prev; // spawnClient handles its own setGameState
    });
  }
}, [setGameState, spawnCharacterWalkIn, spawnClient]);
```

Update the return value of `useClientSpawner`:
```ts
return { spawnClient, spawnCharacterWalkIn, spawnScriptedCharacter };
```

- [ ] **Step 6: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useScriptedEvents.ts src/hooks/useClientSpawner.ts src/logic/__tests__/scriptedEvents.test.ts
git commit -m "feat: add useScriptedEvents hook + spawnScriptedCharacter"
```

---

## Task 6: Update Night 1 campaign config

**Files:**
- Modify: `src/data/campaignConfig.ts`

- [ ] **Step 1: Replace NIGHT_1_DEFAULT with scripted version**

Update `src/data/campaignConfig.ts`:

```ts
import type { NightConfig, CampaignPath } from '../types/campaign';
import { START_TIME } from '../constants';

const NIGHT_1_DEFAULT: NightConfig = {
  characterIds: ['n1-vip-actor', 'n1-phantom-eater-night1'],
  rules: [
    { key: 'RESERVATIONS_DISABLED', value: true },
    { key: 'COVERS_TARGET', value: 5 },
  ],
  scriptedEvents: [
    // Step 1 — Walk-in couple, desk completely empty
    {
      id: 'n1-step1-intro',
      trigger: { kind: 'TIME', minute: START_TIME + 2 },   // 19:32
      actions: [
        { kind: 'SHOW_DIALOGUE', lines: [
          'We are opening the doors.',
          'Seat these nobodies. Try not to trip over your own feet.',
        ]},
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-walkIn-couple', delayMinutes: 1 },
      ],
    },
    // Step 2 — Ledger drops; businessman with reservation
    {
      id: 'n1-step2-ledger',
      trigger: { kind: 'TIME', minute: START_TIME + 8 },   // 19:38
      actions: [
        { kind: 'REVEAL_TOOL', tool: 'LEDGER' },
        { kind: 'SHOW_DIALOGUE', lines: [
          'From now on, we respect the book.',
          'If they claim a reservation, their name better be in there.',
        ]},
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-res-businessman', delayMinutes: 1 },
      ],
    },
    // Step 3 — Printer clatters; late group of 4
    {
      id: 'n1-step3-ticket',
      trigger: { kind: 'TIME', minute: START_TIME + 15 },  // 19:45
      actions: [
        { kind: 'REVEAL_TOOL', tool: 'PARTY_TICKET' },
        { kind: 'SHOW_DIALOGUE', lines: [
          'Read the ticket carefully.',
          'If they are late, or brought extra friends, they are dead to us.',
        ]},
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-res-late-group', delayMinutes: 1 },
      ],
    },
    // Step 4 — Clipboard (VIP tab); minor VIP actor
    {
      id: 'n1-step4-vip',
      trigger: { kind: 'TIME', minute: START_TIME + 22 },  // 19:52
      actions: [
        { kind: 'REVEAL_TOOL', tool: 'CLIPBOARD_VIP' },
        { kind: 'SHOW_DIALOGUE', lines: [
          'Look at that obnoxious gold watch. That is a VIP.',
          'The rules do not apply to money. Check your VIP list.',
        ]},
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-vip-actor', delayMinutes: 1 },
      ],
    },
    // Step 5 — BANNED tab; Phantom Eater in disguise
    {
      id: 'n1-step5-banned',
      trigger: { kind: 'TIME', minute: START_TIME + 29 },  // 19:59
      actions: [
        { kind: 'REVEAL_TOOL', tool: 'CLIPBOARD_BANNED' },
        { kind: 'SHOW_DIALOGUE', lines: [
          'Look at that chipped gold tooth.',
          'That rat has been eating here for free all month. Check the Banned list.',
        ]},
        { kind: 'SPAWN_CHARACTER', characterId: 'n1-res-phantom', delayMinutes: 1 },
      ],
    },
  ],
};
```

Keep all other nights unchanged. Update the `CAMPAIGN_CONFIG` export so Night 1 uses the new `NIGHT_1_DEFAULT`.

- [ ] **Step 2: Verify type-check**

```bash
npm run lint
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/campaignConfig.ts
git commit -m "feat(campaign): populate Night 1 scripted tutorial events"
```

---

## Task 7: Gate DeskTools and Clipboard on revealedTools

**Files:**
- Modify: `src/components/desk/DeskTools.tsx`
- Modify: `src/components/desk/Clipboard.tsx`

- [ ] **Step 1: Gate tool panels in `src/components/desk/DeskTools.tsx`**

`DeskTools` reads `gameState` from `useGame()`:

```tsx
import React from 'react';
import { useGame } from '../../context/GameContext';
import { BookingLedger } from './BookingLedger';
import { Clipboard } from './Clipboard';
import { PartyTicket } from './PartyTicket';
import { MiniGrid } from './MiniGrid';

export const DeskTools: React.FC = () => {
  const { gameState } = useGame();
  const { revealedTools } = gameState;

  const showLedger = revealedTools.includes('LEDGER');
  const showTicket = revealedTools.includes('PARTY_TICKET');
  const showClipboard = revealedTools.includes('CLIPBOARD_VIP') || revealedTools.includes('CLIPBOARD_BANNED');

  return (
    <div className="h-full bg-[#E4E3E0] grid grid-cols-[auto_1.5fr_1fr_1fr] gap-4 p-4 overflow-hidden">
      <MiniGrid />
      {showTicket ? <PartyTicket /> : <div />}
      {showLedger ? <BookingLedger /> : <div />}
      {showClipboard ? <Clipboard /> : <div />}
    </div>
  );
};
```

Note: `MiniGrid` (the floorplan mini-view) is always visible. Empty `<div />` placeholders preserve the grid layout so the desk doesn't reflow.

- [ ] **Step 2: Gate VIP and Banned tabs in `src/components/desk/Clipboard.tsx`**

Find the `TABS` constant and read `revealedTools` to filter the visible tabs:

```tsx
const { gameState } = useGame();
const { revealedTools } = gameState;

const VISIBLE_TABS = TABS.filter(tab => {
  if (tab === 'VIPs') return revealedTools.includes('CLIPBOARD_VIP');
  if (tab === 'Banned') return revealedTools.includes('CLIPBOARD_BANNED');
  return true; // Factions, Log always visible
});
```

Then use `VISIBLE_TABS` instead of `TABS` when rendering tab buttons and content. Ensure the selected tab state falls back to the first visible tab if the current tab becomes hidden.

- [ ] **Step 3: Verify type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/DeskTools.tsx src/components/desk/Clipboard.tsx
git commit -m "feat(desk): gate tool panels and clipboard tabs on revealedTools"
```

---

## Task 8: Create in-game MrVDialogue portal

**Files:**
- Create: `src/components/MrVDialogue.tsx`

- [ ] **Step 1: Create `src/components/MrVDialogue.tsx`**

This component renders a partial overlay portal using the existing `MonsieurVSpeech` and `MonsieurVDialogueBlock` from the intro:

```tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTypewriter } from '@/src/hooks/useTypewriter';
import {
  MonsieurVSpeech,
  MonsieurVDialogueBlock,
} from '@/src/components/intro/MonsieurVDialogue';
import { Z_INDEX } from '@/src/zIndex';
import {
  INTRO_CHAR_DELAY_MS,
  INTRO_JITTER_MS,
} from '@/src/components/intro/introConstants';

interface MrVDialogueProps {
  lines: string[];           // lines to display sequentially
  onDismiss: () => void;     // called when player clicks to continue
}

/**
 * In-game Monsieur V. aside. Renders as a partial overlay (40% scrim) so the
 * game remains visible behind it. Reuses MonsieurVSpeech from the intro for
 * identical look and feel.
 */
export const MrVDialogue: React.FC<MrVDialogueProps> = ({ lines, onDismiss }) => {
  const { t } = useTranslation('intro');
  const [lineIndex, setLineIndex] = useState(0);
  const currentLine = lines[lineIndex] ?? '';

  const { displayed, done, skipToEnd } = useTypewriter(
    currentLine,
    INTRO_CHAR_DELAY_MS,
    undefined,
    INTRO_JITTER_MS,
  );

  const handleClick = () => {
    if (!done) {
      skipToEnd();
      return;
    }
    if (lineIndex < lines.length - 1) {
      setLineIndex(i => i + 1);
    } else {
      onDismiss();
    }
  };

  return createPortal(
    <button
      type="button"
      className="fixed inset-0 flex items-end justify-center pb-24 px-4"
      style={{ zIndex: Z_INDEX.tour, background: 'rgba(0,0,0,0.40)' }}
      onClick={handleClick}
      aria-label="Monsieur V. — click to continue"
    >
      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <MonsieurVDialogueBlock>
          <MonsieurVSpeech variant="dark" speakerName="Monsieur V." speakerRole="Propriétaire — Le Solstice">
            {displayed}
            {done && lineIndex === lines.length - 1 && (
              <span className="ml-1 animate-pulse text-[#c8a84b]/60 text-sm">
                {' '}▸ {t('screen0.clickToContinue')}
              </span>
            )}
          </MonsieurVSpeech>
        </MonsieurVDialogueBlock>
      </div>
    </button>,
    document.body,
  );
};
```

- [ ] **Step 2: Verify type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MrVDialogue.tsx
git commit -m "feat: add MrVDialogue in-game portal (reuses intro MonsieurVSpeech)"
```

---

## Task 9: Thread nightConfig + onShowDialogue through the engine

**Files:**
- Modify: `src/context/GameContext.tsx`
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/App.tsx`

This task wires the `NightConfig` (for scripted events + rules/characterIds) and the `onShowDialogue` callback through `GameProvider` → `useGameEngine` → `useScriptedEvents`. It also fixes the existing gap where `resetGame` ignores the campaign config.

- [ ] **Step 1: Update `GameProvider` props in `src/context/GameContext.tsx`**

```tsx
import type { NightConfig } from '../types/campaign';

interface GameProviderProps {
  children: ReactNode;
  incrementPathScore?: (path: CampaignPath, delta: number) => void;
  pathScores?: PathScores;
  nightConfig?: NightConfig;
  onShowDialogue?: (lines: string[]) => void;
}

export function GameProvider({
  children,
  incrementPathScore,
  pathScores,
  nightConfig,
  onShowDialogue,
}: GameProviderProps) {
  const engine = useGameEngine(incrementPathScore, pathScores, nightConfig, onShowDialogue);

  return (
    <GameContext.Provider value={engine}>
      {children}
    </GameContext.Provider>
  );
}
```

- [ ] **Step 2: Update `useGameEngine` signature and wire `useScriptedEvents`**

In `src/hooks/useGameEngine.ts`:

```ts
import { useScriptedEvents } from './useScriptedEvents';
import type { NightConfig } from '../types/campaign';

export function useGameEngine(
  incrementPathScore?: (path: CampaignPath, delta: number) => void,
  pathScores?: PathScores,
  nightConfig?: NightConfig,
  onShowDialogue?: (lines: string[]) => void,
) {
  const [gameState, setGameState] = useState<GameState>(() => buildInitialState(0));

  const resetGame = useCallback((difficulty: number, persist?: PersistState) => {
    setGameState(buildInitialState(
      difficulty,
      persist,
      nightConfig?.rules ?? [],
      nightConfig?.characterIds,
      pathScores,
    ));
  }, [pathScores, nightConfig]);

  // ... existing hook compositions ...

  const { spawnClient, spawnCharacterWalkIn, spawnScriptedCharacter } =
    useClientSpawner(gameState, setGameState, characters);

  // ... other hooks ...

  useScriptedEvents(
    gameState,
    setGameState,
    nightConfig,
    onShowDialogue ?? (() => {}),
    spawnScriptedCharacter,
  );

  return { /* existing return */ };
}
```

- [ ] **Step 3: Add dialogue queue state and MrVDialogue to `GameContent` in `src/App.tsx`**

In the `GameContent` component, add:

```tsx
import { MrVDialogue } from './components/MrVDialogue';

interface GameContentProps {
  initialDifficulty: number;
  persist?: { cash: number; rating: number; morale: number; nightNumber: number };
  onShiftEnd: (ledger: LedgerData, lossReason: 'MORALE' | 'VIP' | 'BANNED' | null) => void;
  playerIdentity: { name: string; traits: VisualTraits } | null;
  onShowDialogue: (lines: string[]) => void;   // ← new
  activeDialogue: string[] | null;              // ← new
  onDialogueDismiss: () => void;               // ← new
}
```

Inside `GameContent`, render the portal:

```tsx
{activeDialogue && (
  <MrVDialogue lines={activeDialogue} onDismiss={onDialogueDismiss} />
)}
```

- [ ] **Step 4: Add dialogue queue management to `App` and pass nightConfig to GameProvider**

In the `App` component:

```tsx
// Dialogue queue
const [dialogueQueue, setDialogueQueue] = React.useState<string[][]>([]);
const [activeDialogue, setActiveDialogue] = React.useState<string[] | null>(null);

const onShowDialogue = React.useCallback((lines: string[]) => {
  setDialogueQueue(prev => [...prev, lines]);
}, []);

const onDialogueDismiss = React.useCallback(() => {
  setActiveDialogue(null);
}, []);

// Pop from queue when active clears
React.useEffect(() => {
  if (activeDialogue !== null) return;
  if (dialogueQueue.length === 0) return;
  const [next, ...rest] = dialogueQueue;
  setActiveDialogue(next ?? null);
  setDialogueQueue(rest);
}, [activeDialogue, dialogueQueue]);

// Reset dialogue when phase changes
React.useEffect(() => {
  setDialogueQueue([]);
  setActiveDialogue(null);
}, [phase]);
```

Update the `<GameProvider>` and `<GameContent>` elements:

```tsx
{phase === 'PLAYING' && (
  <GameProvider
    incrementPathScore={campaign.incrementPathScore}
    pathScores={campaign.campaignState.pathScores}
    nightConfig={campaign.activeNightConfig}
    onShowDialogue={onShowDialogue}
  >
    <GameContent
      initialDifficulty={difficulty}
      persist={persist}
      onShiftEnd={handleShiftEnd}
      playerIdentity={playerIdentity}
      onShowDialogue={onShowDialogue}
      activeDialogue={activeDialogue}
      onDialogueDismiss={onDialogueDismiss}
    />
  </GameProvider>
)}
```

- [ ] **Step 5: Verify type-check**

```bash
npm run lint
```

Expected: no TypeScript errors.

- [ ] **Step 6: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Manual smoke test in the browser**

```bash
npm run dev
```

Start a new game. On Night 1:
- At 19:32 (in-game): Monsieur V. dialogue appears → walk-in couple spawns 1 minute later
- At 19:38: Ledger appears on desk + new dialogue + businessman spawns
- At 19:45: Party Ticket appears + new dialogue + late group spawns
- At 19:52: Clipboard (VIP tab only) + new dialogue + VIP actor spawns
- At 19:59: Banned tab added to clipboard + new dialogue + Phantom Eater spawns
- Click MrVDialogue overlay to dismiss each time
- Typewriter animates lines correctly

- [ ] **Step 8: Commit**

```bash
git add src/context/GameContext.tsx src/hooks/useGameEngine.ts src/App.tsx
git commit -m "feat: wire nightConfig + dialogue queue through GameProvider to useScriptedEvents"
```

---

## Task 10: Final integration — verify Night 2+ unaffected

- [ ] **Step 1: Confirm Night 2+ has full revealedTools**

In the browser (or using dev shortcuts), advance to Night 2 (use Shift+C shortcut to jump to corkboard, then open restaurant). Verify:
- All desk tools (Ledger, Party Ticket, Clipboard with VIP + Banned tabs) are visible from the start
- No scripted events fire (Night 2+ has no `scriptedEvents` in campaign config)
- The `?` button is gone from TopBar
- No tour-related console errors

- [ ] **Step 2: Run full suite**

```bash
npm run test
npm run lint
```

Expected: all tests pass, no type errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(night1): scripted tutorial shift complete — progressive desk reveals + Monsieur V. commentary"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Tour retired entirely | Task 1 |
| `ScriptedEvent` typed trigger/action | Task 2 |
| `firedEventIds` + `revealedTools` on GameState | Task 2–3 |
| Night 1 starts with empty desk | Task 3 (`revealedTools: []`) |
| Night 2+ has full tool set | Task 3 |
| Night 1 reservations (businessman, late group, phantom) | Task 3 |
| VIP actor + Phantom Eater Night 1 character definitions | Task 4 |
| `useScriptedEvents` — TIME trigger | Task 5 |
| `useScriptedEvents` — CHARACTER_AT_DESK trigger | Task 5 |
| `REVEAL_TOOL` action appends to revealedTools | Task 5 |
| `SPAWN_CHARACTER` — walk-in, reservation-based, VIP/BANNED | Task 5 |
| Night 1 campaign config with 5 scripted steps | Task 6 |
| `RESERVATIONS_DISABLED` + `COVERS_TARGET: 5` rules | Task 6 |
| DeskTools gates on revealedTools | Task 7 |
| Clipboard VIP/Banned tabs gate separately | Task 7 |
| In-game MrVDialogue portal with typewriter | Task 8 |
| Reuses MonsieurVSpeech from intro | Task 8 |
| nightConfig rules/characterIds applied in resetGame | Task 9 |
| Dialogue queue (multiple events don't drop lines) | Task 9 |
| Clock doesn't pause during dialogue | Task 9 (overlay is non-blocking) |

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `ToolReveal` defined in Task 2, used in Tasks 3, 5, 6, 7 — consistent.
- `ScriptedEvent` defined in Task 2, used in Tasks 5, 6 — consistent.
- `spawnScriptedCharacter` defined and exported in Task 5, consumed in Task 9 — consistent.
- `nightConfig` prop: `NightConfig | undefined` in GameProvider, `NightConfig | undefined` in useGameEngine — consistent.
