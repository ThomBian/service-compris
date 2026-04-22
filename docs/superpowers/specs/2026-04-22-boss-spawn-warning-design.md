# Boss Spawn Warning Design

**Date:** 2026-04-22
**Status:** Approved

## Problem

Boss spawn conditions are checked every game tick. When a condition is met the boss enters the queue immediately — the player gets no advance notice and the arrival feels random rather than ominous.

## Goal

Warn the player dramatically (but non-blockingly) when a boss's spawn condition first becomes true, then delay the actual queue entry by ~45 real-time seconds to give reaction time.

## Decisions

| Question | Decision |
|---|---|
| Medium | Non-blocking toast-style overlay |
| Timing | Warn on condition met, spawn 45s later |
| Content | Boss `PixelAvatar` + `clueText` (cryptic in-world hint) |
| Sound | Distinct ominous sting (new SFX asset) |
| Duration | Auto-dismiss after 7s |
| Implementation | Callback pattern (mirrors `onShowDialogue`) |

## Architecture

### Callback chain

```
App.tsx
  └── GameProvider (onBossWarning prop)
        └── useGameEngine (threads through)
              └── useClientSpawner (calls it + schedules spawn)
```

`App.tsx` owns local `bossWarning: BossDefinition | null` state. It passes `onBossWarning` down the same way it passes `onShowDialogue`. The callback sets `bossWarning`; clearing it is handled internally by `BossWarningToast` after 7s.

### Spawn tracking

`useClientSpawner` gains a `warnedBossIdsRef = useRef<Set<string>>(new Set())`. When a boss condition is first met:

1. Add boss id to `warnedBossIdsRef` (prevents re-warning on subsequent ticks)
2. Call `onBossWarning?.(boss)`
3. `setTimeout(() => spawnCharacterWalkIn(boss), BOSS_WARN_DELAY_MS)` — 45 000 ms

The existing `spawnedReservationIds` check (`char-walkin-${boss.id}`) still guards against double-spawn.

### New constant

```ts
// src/constants.ts
export const BOSS_WARN_DELAY_MS = 45_000;
```

## Component: `BossWarningToast`

`src/components/boss/BossWarningToast.tsx`

- Rendered from `App.tsx` (or `GameContent`) when `bossWarning !== null`
- Portal into `document.body`, `z-index` above toasts, below boss encounter overlay
- On mount: call `playBossWarningSting()`; set internal 7s timer to call `onDismiss`
- Layout: dark red card, boss `PixelAvatar` left, clue text right
- Animates in (slide-up + fade) using existing `motion/react` pattern

```
┌─────────────────────────────────┐
│ ⚠ HEADS UP          [auto-close]│
│ ┌──────┐                        │
│ │ 🧑   │  "Watch out for the   │
│ │avatar│   Pinstripes tonight." │
│ └──────┘                        │
└─────────────────────────────────┘
```

## Audio

New SFX function `playBossWarningSting()` in `src/audio/gameSfx.ts`.

Asset path: `/audio/boss/shared/boss-warning-sting.wav` (to be added — placeholder can reuse `/audio/shared/toast/toast-warning.ogg` during dev).

## i18n

Add to both `en` and `fr` `ui.json`:

```json
"boss": {
  "warningLabel": "Heads up"   // EN
  "warningLabel": "Attention"  // FR
}
```

The `clueText` field on `BossDefinition` is already a plain English string in the roster. If it needs to be localized later, it becomes a key; for now it renders as-is.

## What does NOT change

- `GameState` — no new fields
- `BOSS_ROSTER` — `clueText` already present on every boss
- Boss encounter overlay, mini-game flow — unaffected
- Clipboard "looming" detection — still uses `spawnCondition` + `spawnedReservationIds`, unaffected
