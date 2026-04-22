# Boss Encounters & Mini-Games — Design Spec

**Date:** 2026-04-13  
**Status:** approved  
**Source:** 2026-03-30-boss-encounters-and-micro-games (Obsidian)

---

## Overview

Boss Encounters are full-screen, time-limited mini-games (10-20 seconds) that intercept a player action when a Boss-tier character is at the desk. They gate the key action behind an arcade challenge:

- **VIP boss** — intercepts `SEAT`. Win → seated + buff. Lose → penalty.
- **BANNED boss** — intercepts `REFUSE`. Win → refused + outcome. Lose → forced to seat.

Four bosses, four mini-games, each delivered as a separate implementation plan.

---

## Data Model

### New types (`src/types.ts`)

```ts
type MiniGameId = 'HANDSHAKE' | 'WHITE_GLOVE' | 'PAPARAZZI' | 'COAT_CHECK';

interface BossDefinition extends CharacterDefinition {
  miniGame: MiniGameId;
  spawnCondition: (state: GameState) => boolean;
  quoteKey: string; // i18n key resolved at render time — the boss's taunt during intro
}

interface ActiveBossEncounter {
  bossId: string;
  interceptedAction: 'SEAT' | 'REFUSE';
  miniGame: MiniGameId;
}

// Added to GameState:
activeBossEncounter: ActiveBossEncounter | null;
```

### Static boss roster (`src/data/bossRoster.ts`)

One `BossDefinition` per boss. Definitions are static (not procedural). Each boss spawns at most once per shift — tracked via a Set of spawned IDs in `useClientSpawner`.

Indicative spawn conditions (tuned per campaign balance):


| Boss                | MiniGame      | Role   | Spawn Condition                        |
| ------------------- | ------------- | ------ | -------------------------------------- |
| Syndicate Don       | `HANDSHAKE`   | VIP    | `pathScores.underworld > 3`            |
| Grand Inquisitor    | `WHITE_GLOVE` | BANNED | inspector faction score threshold      |
| Influencer Megastar | `PAPARAZZI`   | VIP    | cash > threshold OR viral path score   |
| Aristocrat          | `COAT_CHECK`  | BANNED | late-seating misuse or old-money score |


Exact thresholds defined per implementation plan.

---

## Spawn Logic

In `useClientSpawner`, each tick:

1. Iterate `BOSS_ROSTER` entries not yet spawned this shift.
2. Evaluate `boss.spawnCondition(state)`.
3. If true → inject boss into queue + mark ID as spawned.

Boss then travels the normal queue → desk flow (patience, dialogue unchanged).

---

## Action Interception

In `useDecisionActions`:

- When player triggers **SEAT** or **REFUSE** on a client whose `characterId` matches a `BossDefinition`:
  - Do **not** execute the action.
  - Dispatch `SET_BOSS_ENCOUNTER` → sets `activeBossEncounter` in `GameState`.

`activeBossEncounter !== null` is the single signal that:

- Pauses the game clock (time multiplier → 0).
- Freezes all patience drain (queue included) — fair to the player.
- Renders `<BossEncounterOverlay>` full-screen in `GameContent`.

---

## Overlay UX

**Layout A — cinematic intro then game:**

1. Black screen fades in (~200ms).
2. Boss pixel avatar + name slam in with CSS animation (~600ms).
3. Command word appears in large caps (e.g. `REPLY.`).
4. Boss taunt line appears in smaller text below the command word (from `quoteKey`, resolved via `i18n.t()`). Typewriter effect, ~0.5s.
5. Mini-game UI fades in below (~300ms).
6. Timer starts when game is fully visible.
7. Timer bar anchored at bottom of screen, drains left-to-right.

On **win** or **lose** — brief result flash (green/red), then overlay fades out.

---

## Mini-Game Architecture

### Shared interface

```ts
interface MiniGameProps {
  onWin: () => void;
  onLose: () => void;
  durationMs: number;
  bossVisualTraits?: VisualTraits; // optional — e.g. Coat Check shows the boss
}
```

### Shell component (`BossEncounterOverlay.tsx`)

Selects the correct game component via a map:

```ts
const MINI_GAMES: Record<MiniGameId, React.FC<MiniGameProps>> = {
  HANDSHAKE: HandshakeGame,
  WHITE_GLOVE: WhiteGloveGame,
  PAPARAZZI: PaparazziGame,
  COAT_CHECK: CoatCheckGame,
};
```

Timer bar lives in the shell via a shared `useCountdown(durationMs)` hook. When countdown hits 0, shell calls `onLose()` unless game already resolved.

### Resolution

```ts
// Win path
onWin() → dispatch CLEAR_BOSS_ENCOUNTER → execute intercepted action → apply buff

// Lose path
onLose() → dispatch CLEAR_BOSS_ENCOUNTER → execute penalty (morale hit / forced seat / game over)
```

Clock resumes in both cases (timeMultiplier restored to previous value).

---

## The Four Mini-Games

### 1. Handshake — `HandshakeGame` (Syndicate Don, VIP)

- **Quote (EN):** *"You know the moves, or you don't."*
- **Mechanic:** Simon Says / sequence memory
- **Duration:** **No shell countdown** (`DURATIONS.HANDSHAKE === 0`; no `TimerBar`). Loss comes only from wrong inputs during the repeat phase.
- **Phase 1 (~1.5s):** Animate a 4-item sequence on desk objects (ledger, bell, coin, whiskey). Items highlight in order.
- **Phase 2:** Player clicks items to replay sequence. Wrong click → instant `onLose()`. Correct full match → sequence extends until **8** items, then `onWin()`.
- **Loop:** Repeat with longer sequences up to target length 8 (`TARGET_SEQUENCE_LENGTH`).
- **Implementation:** `useState` for sequence + playerInput. No animation frame needed.

### 2. White Glove — `WhiteGloveGame` (Grand Inquisitor, BANNED)

- **Quote (EN):** *"Mediocrity is an insult to the craft."*
- **Mechanic:** Precision **keyboard** placement (WASD / arrows translate, Q/E rotate, Tab cycles fork/knife, 1–5 jump tables) across **five** simultaneous place settings.
- **Duration:** **20s** shell (`DURATIONS.WHITE_GLOVE`); `TimerBar` expiry → `onLose` if not already resolved.
- **Setup:** Five plate centers scale with measured arena (`ResizeObserver`); fork and knife per table at imperfect positions; dashed outlines show targets.
- **Snap tolerance:** ±8px position, ±5° rotation (`isSnapped` helper).
- **Win:** All **5** tables have **both** fork and knife snapped before time runs out.
- **Lose:** Timer expires before 5/5 complete.
- **Implementation:** React state + `useLayoutEffect` for bounds; no pointer drag in shipped build.

### 3. Paparazzi Flash — `PaparazziGame` (Influencer Megastar, VIP)

- **Quote (EN):** *"Only the good angles. I will know."*
- **Mechanic:** Whack-a-mole / target identification
- **Duration:** **20s** (`DURATIONS.PAPARAZZI`); `TimerBar` expiry → `onLose` if not already resolved.
- **Full game design setup (tuning, fantasy, UX, constants):** [Paparazzi Flash — Game Design Setup](./2026-04-22-paparazzi-flash-game-design.md)
- **Setup:** Green (good angle) and red (bad angle) viewfinder buttons spawn at random positions on an interval.
- **Click red → instant `onLose()`.** Miss **a** green (lifetime expires before tap) **or** timer ends → `onLose()`. **8** successful green taps, no reds → `onWin()`.
- **Implementation:** `setInterval` spawn cadence + per-target timeouts; `resolvedRef` single resolution.

### 4. Coat Check — `CoatCheckGame` (Aristocrat, BANNED)

- **Quote (EN):** *"If Duchess touches the floor, you are finished."*
- **Mechanic:** Catching / horizontal tracking
- **Duration:** **20s** play window from `DURATIONS.COAT_CHECK` (items spawn until elapsed ≥ `durationMs`; **timer bar hitting zero counts as WIN** for this mini-game — see `BossEncounterOverlay` `onTimerExpire` routing).
- **Setup:** Basket at bottom tracks `pointermove` X position. 4 items fall from top in sequence (mink coat, diamond cane, top hat, neon poodle).
- **Collision:** Item bottom Y overlaps basket top Y within ±basket half-width.
- **Any item missed → `onLose()` (poodle miss = game over flag passed to penalty).** All 4 caught → `onWin()`.
- **Implementation:** `useAnimationFrame` for basket position + collision. CSS animation for falling items.

---

## File Structure

```
src/
  data/
    bossRoster.ts              # BossDefinition[] — static, one per boss
  components/
    boss/
      BossEncounterOverlay.tsx # shell: intro animation + game selector + timer bar
      HandshakeGame.tsx
      WhiteGloveGame.tsx
      PaparazziGame.tsx
      CoatCheckGame.tsx
  hooks/
    useCountdown.ts            # shared timer hook
```

---

## Implementation Plans

Four separate plans, one per mini-game, all share the same foundation plan:

1. **Foundation** — types, `bossRoster.ts`, `SET/CLEAR_BOSS_ENCOUNTER` reducer actions, interception in `useDecisionActions`, clock pause, overlay shell with intro animation + timer bar, `useCountdown`.
2. **Handshake** — `HandshakeGame` + Syndicate Don definition + spawn condition.
3. **White Glove** — `WhiteGloveGame` + Grand Inquisitor definition.
4. **Paparazzi Flash** — `PaparazziGame` + Influencer Megastar definition.
5. **Coat Check** — `CoatCheckGame` + Aristocrat definition.

