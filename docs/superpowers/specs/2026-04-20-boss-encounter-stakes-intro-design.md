# Boss encounter stakes step — design spec

**Status:** Implemented (code 2026-04-20). Originally approved in brainstorming 2026-04-20.  
**Scope:** Replace the “Intercepted” + giant `SEAT.` / `REFUSE.` beat with a **character-first, consequence-forward** screen before the mini-game.

## Problem

The final intro step shows `interceptLabel` (“Intercepted”) and a large command word (`SEAT.` / `REFUSE.`). Players read **system state**, not **what they risk** by winning or losing the mini-game.

## Goals

1. **Clarity:** After the boss dialogue, the player understands **what happens if they win** vs **lose**, before tapping “Begin trial”.
2. **Tone:** Lead with **character**, not UI jargon. Reuse the **full boss quote** (`quoteKey`) as the headline for this step — intentional repetition after the typewriter sequence (user-approved).
3. **Truth:** Stake lines must match actual post-encounter behavior in `clearBossEncounter` (`src/hooks/useDecisionActions.ts`) for both `interceptedAction === 'SEAT'` and `'REFUSE'`.

## Non-goals

- New boss-specific stakes lines beyond the shared four templates (per-boss flavor stays in intro lines + quote).
- Changing mini-game mechanics or timers.
- Campaign / meta copy.

## User decisions (brainstorm)


| Topic                | Decision                               |
| -------------------- | -------------------------------------- |
| Hero emphasis        | Character first, then stakes           |
| Character line       | Reuse existing quote (`quoteKey` text) |
| Quote on stakes step | Repeat **full** quote again            |


## Content model

### Outcomes (source of truth)


| `interceptedAction` | WIN                                                               | LOSE                                                   |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| `SEAT`              | Player earns seating; `PhysicalState.SEATING` when client present | Refusal-style consequence; storm-out / `loseSeat` path |
| `REFUSE`            | BANNED refused path; client cleared                               | Client forced toward **seating** (`loseRefuse`)        |


Stake copy must paraphrase these outcomes in **player-facing** language (not internal state names).

### i18n

Add **four** strings in `game` namespace (EN + FR), parameterized with `{{name}}` where needed:

- `boss.stakesSeatWin`
- `boss.stakesSeatLose`
- `boss.stakesRefuseWin`
- `boss.stakesRefuseLose`

Selection in UI: branch on `interceptedAction`, then each line describes win vs lose for that branch.

Optional micro-line (small caps): `boss.stakesActionHintSeat` / `boss.stakesActionHintRefuse` — one short clause (“You were about to seat them”) if playtests still ask for grounding. **Default:** omit unless we add after QA.

## UI approach (approved: Approach A)

After typewriter lines complete (`showCommand === true`):

1. **Headline:** Full quote text = `t(boss.quoteKey)` (same string as final intro line — repetition is intentional).
2. **Eyebrow:** New key, e.g. `boss.stakesEyebrow` — “What’s at stake” (or equivalent EN/FR).
3. **Body:** Two short lines — **Succeed:** … / **Fail:** … using the four keys above (two visible per encounter, chosen by `interceptedAction`).
4. **Primary CTA:** Existing `boss.beginTrial` (unchanged behavior).
5. **Remove** the dominant visual for raw `SEAT.` / `REFUSE.`; remove or replace `boss.interceptLabel` + `commandWord` hero block.

**Layout:** Single column inside existing `MonsieurVDialogueBlock`; keep serif typography and existing animation hooks where possible.

## Component changes

- `**BossEncounterIntro`:** Accept `interceptedAction: 'SEAT' | 'REFUSE'`. Render stakes block instead of `interceptLabel` + `commandWord` megatype.
- `**BossEncounterOverlay`:** Pass `encounter.interceptedAction` into `BossEncounterIntro`; stop passing `commandWord` for display (or pass only if needed for a11y `aria-label`).

## Accessibility

- Ensure the stakes region is a single logical group: `aria-labelledby` pointing at quote or eyebrow, or a `section` with `aria-label` from `boss.stakesEyebrow`.
- “Succeed” / “Fail” lines should be plain text, not color-only distinction.

## Testing / QA

- Manual: trigger both VIP (SEAT) and BANNED (REFUSE) boss encounters; confirm copy matches expectations and FR strings fit without overflow.
- No new automated tests required unless we extract pure selection logic (`getStakeKeys(interceptedAction)`) for unit tests.

## Visual companion

Superpowers browser server script is **not** present in this repo. Optional follow-up: static HTML mock or screenshot for marketing/QA.

## Implementation follow-up

Use **writing-plans** skill to produce an implementation plan (files: `BossEncounterIntro.tsx`, `BossEncounterOverlay.tsx`, `en/game.json`, `fr/game.json`). Then implement.