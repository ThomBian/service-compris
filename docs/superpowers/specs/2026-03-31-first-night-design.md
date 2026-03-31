# Night 1 — Scripted Tutorial Shift

**Date:** 2026-03-31
**Status:** Approved

---

## Overview

Night 1 is a scripted, diegetic tutorial shift. The desk starts completely empty — no ledger, no clipboard, no party ticket panel. Mechanics are revealed one by one as specific scripted customers arrive. Monsieur V. provides cynical real-time instructions via the same typewriter dialogue UI used in the intro sequence. The spotlight tour is retired entirely; Night 1 is the tutorial.

---

## Key Design Decisions

| Question | Decision |
|---|---|
| Spawning | Hybrid — scripted characters at fixed in-game minutes with 5–6 min gaps |
| Monsieur V. delivery | Intro mechanics: typewriter, click to dismiss, non-blocking (clock keeps running) |
| Tool reveals | Gated — tools are hidden until the scripted reveal moment |
| Director architecture | Generic `ScriptedEvent[]` in `NightConfig` — works for Night 1 tutorial and future commentary |
| Tour | Fully retired — deleted |

---

## 1. Data Structures

### `ScriptedEvent`

Added to `src/types.ts`:

```ts
type ScriptedTrigger =
  | { kind: 'TIME'; minute: number }
  | { kind: 'CHARACTER_AT_DESK'; characterId: string }
  | { kind: 'CHARACTER_TYPE_AT_DESK'; type: ClientType }

type ScriptedAction =
  | { kind: 'SHOW_DIALOGUE'; lines: string[] }
  | { kind: 'REVEAL_TOOL'; tool: ToolReveal }
  | { kind: 'SPAWN_CHARACTER'; characterId: string; delayMinutes?: number }

type ToolReveal = 'LEDGER' | 'PARTY_TICKET' | 'CLIPBOARD_VIP' | 'CLIPBOARD_BANNED'

interface ScriptedEvent {
  id: string;            // stable key for "already fired" deduplication
  trigger: ScriptedTrigger;
  actions: ScriptedAction[];   // executed in order when trigger fires
  once?: boolean;        // default true; false = fires every time (commentary)
}
```

### `NightConfig` extension

```ts
interface NightConfig {
  // ...existing fields...
  scriptedEvents?: ScriptedEvent[];
}
```

### `GameState` new fields

```ts
firedEventIds: string[]    // IDs of once=true events that have already fired
revealedTools: ToolReveal[] // tools currently visible on the desk
```

`revealedTools` is seeded by `buildInitialState`:
- Night 1: `[]` (empty desk)
- All other nights: `['LEDGER', 'PARTY_TICKET', 'CLIPBOARD_VIP', 'CLIPBOARD_BANNED']`

---

## 2. `useScriptedEvents` Hook

**File:** `src/hooks/useScriptedEvents.ts`

```ts
function useScriptedEvents(
  gameState: GameState,
  setGameState: SetGameState,
  nightConfig: NightConfig,
  onShowDialogue: (lines: string[]) => void
): void
```

**Trigger evaluation:**

| Trigger kind | When it fires |
|---|---|
| `TIME` | `gameState.currentTime >= event.minute` and event not yet fired |
| `CHARACTER_AT_DESK` | Client with matching `characterId` transitions to `AT_DESK` |
| `CHARACTER_TYPE_AT_DESK` | Any client of matching `ClientType` transitions to `AT_DESK` |

`TIME` triggers are evaluated in the tick loop. `CHARACTER_AT_DESK` / `CHARACTER_TYPE_AT_DESK` triggers are evaluated in a `useEffect` watching `gameState.currentClient` — fires immediately on state change, not one tick late.

**Action dispatch (in order):**
- `SHOW_DIALOGUE` → calls `onShowDialogue(lines)` — queued in `GameContent`
- `REVEAL_TOOL` → appends tool to `gameState.revealedTools`
- `SPAWN_CHARACTER` → injects character into spawner queue after `delayMinutes` (default 0)

Once a `once: true` event fires, its `id` is pushed to `firedEventIds` and it is never re-evaluated.

Composed into `useGameEngine` alongside the existing subsystem hooks.

---

## 3. Monsieur V. Dialogue System

### Shared component: `MonsieurVSpeech`

**File:** `src/components/shared/MonsieurVSpeech.tsx`

Used by both `IntroSequence` and the in-game dialogue portal. Keeps identical look and feel across contexts.

```ts
interface MonsieurVSpeechProps {
  lines: string[]
  onDismiss: () => void
  overlay?: 'full' | 'partial'   // 'full' for intro, 'partial' (40% bg) in-game
  showAttribution?: boolean       // "Monsieur V." label — true by default
}
```

Internally uses `useTypewriter` (existing hook from intro). Lines typewrite sequentially. "▸ click to continue" hint appears after the final line completes. Click anywhere on the overlay dismisses.

`IntroSequence` screens 0, 2, and 3 switch from their inline dialogue rendering to `<MonsieurVSpeech overlay="full" />`.

### In-game portal: `MrVDialogue`

**File:** `src/components/MrVDialogue.tsx`

Renders in a React portal on `document.body`. Wraps `MonsieurVSpeech` with `overlay="partial"`.

**Dialogue queue in `GameContent`:**

```ts
const [dialogueQueue, setDialogueQueue] = useState<string[][]>([])
const [activeDialogue, setActiveDialogue] = useState<string[] | null>(null)
```

`onShowDialogue(lines)` pushes to `dialogueQueue`. A `useEffect` pops the next item into `activeDialogue` when the current one is dismissed. Multiple events firing close together queue correctly without dropping lines.

**Clock does not pause** during dialogue. The 5–6 minute gaps between Night 1 scripted arrivals ensure no time pressure while reading.

---

## 4. Night 1 Campaign Config

**In `CAMPAIGN_CONFIG[1]['default']`** (`src/data/campaignConfig.ts`):

```ts
rules: [
  { key: 'RESERVATIONS_DISABLED', value: true },  // no random walk-ins
  { key: 'COVERS_TARGET', value: 5 }              // shift ends after 5 covers resolved
],

scriptedEvents: [
  // Step 1 — Walk-In couple, desk completely empty
  {
    id: 'n1-step1-intro',
    trigger: { kind: 'TIME', minute: 1172 },  // 19:32
    actions: [
      { kind: 'SHOW_DIALOGUE', lines: [
        "We are opening the doors. Seat these nobodies. Try not to trip over your own feet."
      ]},
      { kind: 'SPAWN_CHARACTER', characterId: 'n1-walkIn-couple', delayMinutes: 1 }
    ]
  },

  // Step 2 — Ledger drops, businessman with reservation
  {
    id: 'n1-step2-ledger',
    trigger: { kind: 'TIME', minute: 1178 },  // 19:38
    actions: [
      { kind: 'REVEAL_TOOL', tool: 'LEDGER' },
      { kind: 'SHOW_DIALOGUE', lines: [
        "From now on, we respect the book.",
        "If they claim a reservation, their name better be in there."
      ]},
      { kind: 'SPAWN_CHARACTER', characterId: 'n1-reservation-businessman', delayMinutes: 1 }
    ]
  },

  // Step 3 — Printer clatters, late group of 4
  {
    id: 'n1-step3-ticket',
    trigger: { kind: 'TIME', minute: 1185 },  // 19:45
    actions: [
      { kind: 'REVEAL_TOOL', tool: 'PARTY_TICKET' },
      { kind: 'SHOW_DIALOGUE', lines: [
        "Read the ticket carefully.",
        "If they are late, or brought extra friends, they are dead to us."
      ]},
      { kind: 'SPAWN_CHARACTER', characterId: 'n1-late-group', delayMinutes: 1 }
    ]
  },

  // Step 4 — Clipboard (VIP tab only), minor VIP actor
  {
    id: 'n1-step4-vip',
    trigger: { kind: 'TIME', minute: 1192 },  // 19:52
    actions: [
      { kind: 'REVEAL_TOOL', tool: 'CLIPBOARD_VIP' },
      { kind: 'SHOW_DIALOGUE', lines: [
        "Look at that obnoxious gold watch. That is a VIP.",
        "The rules do not apply to money. Check your VIP list."
      ]},
      { kind: 'SPAWN_CHARACTER', characterId: 'n1-vip-actor', delayMinutes: 1 }
    ]
  },

  // Step 5 — BANNED tab stapled, Phantom Eater in disguise
  {
    id: 'n1-step5-banned',
    trigger: { kind: 'TIME', minute: 1199 },  // 19:59
    actions: [
      { kind: 'REVEAL_TOOL', tool: 'CLIPBOARD_BANNED' },
      { kind: 'SHOW_DIALOGUE', lines: [
        "Look at that chipped gold tooth.",
        "That rat has been eating here for free all month. Check the Banned list."
      ]},
      { kind: 'SPAWN_CHARACTER', characterId: 'n1-phantom-eater-disguise', delayMinutes: 1 }
    ]
  }
]
```

**Night 1 characters** (defined in the characters/factions data, not in this spec):
- `n1-walkIn-couple` — polite WALK_IN couple, no lies
- `n1-reservation-businessman` — LEGITIMATE, valid reservation
- `n1-late-group` — SCAMMER, claims party of 2 at 20:00 but arrives as party of 4 at 20:30
- `n1-vip-actor` — minor VIP (local actor), no reservation, gold watch visual trait
- `n1-phantom-eater-disguise` — SCAMMER, valid reservation name, chipped gold tooth visual trait, on Banned list

---

## 5. Desk Tool Gating

`DeskTools.tsx` reads `gameState.revealedTools` and conditionally renders each tool panel:

- Ledger panel: visible if `revealedTools.includes('LEDGER')`
- Party ticket panel: visible if `revealedTools.includes('PARTY_TICKET')`
- `ClipboardPanel` VIP tab: visible if `revealedTools.includes('CLIPBOARD_VIP')`
- `ClipboardPanel` BANNED tab: visible if `revealedTools.includes('CLIPBOARD_BANNED')`

On all nights except Night 1, `buildInitialState` seeds the full set so all tools are visible from the start. No change to gameplay on nights 2–7.

---

## 6. Tour Retirement

The spotlight tour is fully removed:

- `src/hooks/useTour.ts` — deleted
- `src/components/TourOverlay.tsx` — deleted
- `src/tour/tourSteps.ts` — deleted
- `service-compris-tour-seen` localStorage key — no longer written or read
- `?` button in `TopBar` — removed
- `data-tour="…"` attributes on `TopBar`, `DeskScene`, `DeskTools`, `FloorplanGrid` — removed

---

## 7. Night 1 Summary Copy

**Content TODO (writing pass, not architectural):**

- Night 1 wins skip the corkboard (existing behaviour). The transition to Night 2 should carry a brief Monsieur V. aside acknowledging a first night survived — grudgingly. Exact copy TBD.
- `CAMPAIGN_CONFIG[2]['default'].quote` and `memo` (the first corkboard the player sees) should reference Night 1 as context — framing Night 2 as the real thing now that the player knows the rules.
- Night 1 losses show the fired corkboard as normal. The `FiredConfig` entries for applicable loss reasons should acknowledge it was a first night (lighter tone than later dismissals).

---

## 8. File Map

```
src/
  components/
    shared/
      MonsieurVSpeech.tsx         — new: shared typewriter dialogue UI
    MrVDialogue.tsx               — new: in-game portal (partial overlay)
    intro/
      IntroSequence.tsx           — update: screens 0/2/3 use MonsieurVSpeech
    tour/                         — DELETED
      TourOverlay.tsx
      tourSteps.ts
  hooks/
    useScriptedEvents.ts          — new: trigger evaluation + action dispatch
    useTour.ts                    — DELETED
    useTypewriter.ts              — existing, unchanged
  data/
    campaignConfig.ts             — update: Night 1 scriptedEvents[], rules, character IDs
  types.ts                        — update: ScriptedEvent, ScriptedTrigger, ScriptedAction,
                                            ToolReveal, firedEventIds + revealedTools on GameState
  logic/
    gameLogic.ts                  — update: buildInitialState seeds revealedTools
  context/
    GameContext.tsx               — update: thread useScriptedEvents + onShowDialogue
  components/
    GameContent.tsx               — update: dialogueQueue state, MrVDialogue portal
    TopBar.tsx                    — update: remove ? button + data-tour attr
    scene/DeskScene.tsx           — update: remove data-tour attr
    desk/DeskTools.tsx            — update: gate render on revealedTools, remove data-tour attr
    desk/ClipboardPanel.tsx       — update: gate VIP/BANNED tabs on revealedTools separately
```

---

## Out of Scope

- Night 1 character definitions (`n1-*` IDs) — authored in the characters/factions data pass
- Night 1 and Night 2 corkboard copy — writing pass
- `once: false` commentary events for Nights 2–7 — populated per night in a content pass
- Tool reveal animations (drop/thud, printer clatter) — visual polish pass
- Mobile layout adjustments for `MonsieurVSpeech` partial overlay
