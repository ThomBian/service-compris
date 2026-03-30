# Intro Sequence — "The Interview"

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Replace the `LandingPage` with a 4-screen cinematic intro sequence that runs every time the player starts a new game. The intro establishes the world, collects the player's name, avatar, and difficulty, delivers Monsieur V.'s briefing, and transitions into Night 1. A skip button appears after the first playthrough.

---

## Phase Flow

`LANDING` is removed from `GamePhase`. The new flow:

```
App start              → INTRO
INTRO complete         → PLAYING  (carries difficulty, playerName, avatarIndex)
Shift ends             → CORKBOARD
Corkboard "Next night" → PLAYING  (skips INTRO)
Corkboard "Leave"      → INTRO    (fresh start)
```

`GamePhase` in `src/App.tsx`:
```ts
type GamePhase = 'INTRO' | 'CORKBOARD' | 'PLAYING';
```

`LandingPage.tsx` is deleted. `IntroSequence` is the new entry point.

---

## New File: `src/components/intro/IntroSequence.tsx`

Single component managing all 4 screens. Props:

```ts
interface IntroSequenceProps {
  onComplete: (difficulty: number, playerName: string, avatarIndex: number) => void;
}
```

Internal state:
```ts
screen: 0 | 1 | 2 | 3        // current screen index
playerName: string             // default: i18n 'The Rookie' / 'La Recrue'
avatarIndex: number            // 0–4
difficulty: number             // 0–3, default 1
```

A skip button (top-right, small) is rendered on all screens if `localStorage.getItem('service-compris-intro-seen')` is truthy. Clicking it calls `onComplete(difficulty, playerName, avatarIndex)` immediately. The key is written to localStorage when Screen 3's "CLOCK IN" is clicked.

---

## Screen 0 — The World (Cinematic)

- **Background:** Pure black (`#000`).
- **Audio:** On the user's first click anywhere on Screen 0 (during typewriter or on the advance click), `rain-loop.mp3` starts and `jazz-loop.mp3` fades in over 2s. Audio does not autoplay on mount — browser autoplay policy requires a prior user interaction.
- **Text:** Five paragraphs from the script, typewriter-animated letter by letter (`~40ms` per character). Each paragraph waits for the previous to finish.
- **Advance:** A `▸ click to continue` hint fades in after the final paragraph completes. Clicking anywhere on the screen advances to Screen 1.
- **Font:** Monospace, off-white on black, centered, max-width ~600px.

### Copy (EN)
```
> Nouveau Paris. 192X.

In this city, cooking at home is a crime against high society.
Your worth is measured by where you eat, who you eat with, and who you are seen ignoring.

At the center of it all is LE SOLSTICE.
The most exclusive, impossible-to-book restaurant in the world.

Last night, the Maître D' seated a Duke next to the kitchen doors.
He has not been seen since.

Today, they are interviewing his replacement.
```

---

## Screen 1 — The Bureaucracy (Character Creation)

- **Background:** Desk scene (dark mahogany texture from `DeskScene` background, dimmed). Flickering lamp glow at top (CSS animation).
- **Layout:** Monsieur V. dialogue bubble above; ID card below.

### Monsieur V. Dialogue
Pre-rendered (no typewriter on this screen). Attributed label "Monsieur V." above the italic text.

> "Ah. The new applicant. You look entirely unqualified. Perfect. Fill out the paperwork before I change my mind."

### ID Card
Parchment-colored card (`#f5f0e4`), gold border (`#c8a84b`). Header: "LE SOLSTICE — Employee Identification Card".

**Left column — Avatar picker:**
- `PixelAvatar` rendered at `scale=3` (72×144px), but cropped to show head+torso only (top 72px via CSS `overflow:hidden` or canvas clip).
- Left/right arrow buttons cycle `avatarIndex` through 5 presets. Counter shows `n / 5`.

**Right column — Fields:**
- `NAME:` — text input, placeholder "The Rookie", maxlength 24. If left blank on submit, defaults to locale-appropriate placeholder value.
- `DIFFICULTY:` — 4-button toggle (Casual / Normal / Hard / Hell), styled like the existing landing page selector.
- `POSITION:` — static read-only: "Maître D' — Le Solstice".

**Bottom — Sign Contract button:**
Full-width, burgundy (`#7b1c2e`), monospace caps `[ SIGN CONTRACT ]`. Rubber-stamp press animation (translate + shadow collapse). Advances to Screen 2.

---

## Screen 2 — The Stakes (Warning)

- **Background:** Same desk scene.
- **On enter:** ID card plays `translateX(-110%)` slide-off (300ms ease-in). After exit, the clipboard drops in from top (`translateY(-120%) → 0`) with a spring bounce (400ms), triggering `clipboard-thud.mp3`.
- **Text:** Three Monsieur V. dialogue blocks, typewriter-animated, displayed sequentially. Brief 600ms pause between blocks.
- **Advance:** A `▸ click to continue` hint appears after the third block finishes. Click anywhere to advance.

### Copy (EN)
> "Listen closely, [playerName]. Running the door at Le Solstice is not about hospitality. It is about survival."

> "Outside that door is a city of vipers. Politicians, Influencers, and the Syndicate. They all want a table, and none of them care about our rules. But I care about the rules."

> "If you let a scoundrel in, we lose our reputation. If you insult a VIP, we lose our windows. Protect the Michelin Stars, keep the cash flowing, and for the love of God, enforce the dress code."

---

## Screen 3 — The Transition (Night 1)

- **On enter:** CSS `translateY` on the background shifts from desk perspective upward, suggesting a camera pan through the restaurant to the front doors. Duration: 1.2s, ease-in-out.
- **UI boot sequence:** After pan completes, three UI elements appear one by one with a flicker animation (opacity 0→1 with 2–3 rapid flickers, 200ms each):
  1. Clock (showing `19:30`)
  2. Star rating (showing current/initial rating)
  3. Cash counter (showing starting cash)
- **Monsieur V. final line** (typewriter, after boot sequence):
  > "The queue is forming. Unlock the doors. Do not disappoint me."
- **CLOCK IN button:** Appears after the line completes. Full-width, pulsing outline animation. Monospace caps `[ CLOCK IN ]`.
- **On click:** Plays `door-open.mp3`. Both audio loops fade out over 1.5s. Calls `onComplete(difficulty, playerName, avatarIndex)`. Writes `service-compris-intro-seen = "true"` to localStorage.

---

## New File: `src/components/intro/introAvatars.ts`

Five `VisualTraits` constant presets:

```ts
export const INTRO_AVATARS: VisualTraits[] = [
  // 0 — Slicked-back undercut
  { skinTone: 0, hairStyle: 0, hairColor: 0, clothingStyle: 0, clothingColor: 0, height: 1 },
  // 1 — Sharp bob
  { skinTone: 2, hairStyle: 1, hairColor: 2, clothingStyle: 2, clothingColor: 1, height: 1 },
  // 2 — Elegant moustache
  { skinTone: 1, hairStyle: 0, hairColor: 1, clothingStyle: 0, clothingColor: 2, height: 2, facialHair: 0 },
  // 3 — Monocle
  { skinTone: 0, hairStyle: 0, hairColor: 3, clothingStyle: 0, clothingColor: 0, height: 1, glasses: 0 },
  // 4 — Tired bags
  { skinTone: 4, hairStyle: 2, hairColor: 4, clothingStyle: 1, clothingColor: 3, height: 0, eyebrows: 0 },
];
```

---

## Audio System

**Library:** Howler.js (`howler` npm package).

**New file:** `src/audio/introAudio.ts` — module that initialises and exports Howler instances:

```ts
export const rainLoop: Howl      // loops, volume 0.4
export const jazzLoop: Howl      // loops, volume 0.2, fades in over 2s
export const typewriterClick: Howl // one-shot, volume 0.6
export const clipboardThud: Howl   // one-shot, volume 0.8
export const doorOpen: Howl        // one-shot, volume 0.7
```

All instances are lazy-loaded on first use (created inside the intro component, not at module level) to respect browser autoplay policies — audio only starts after the first user interaction (click to advance from Screen 0).

**Asset paths:** `public/audio/intro/rain-loop.mp3`, `jazz-loop.mp3`, `typewriter-click.mp3`, `clipboard-thud.mp3`, `door-open.mp3`. Assets to be sourced separately (e.g. freesound.org).

---

## Typewriter Hook

**New file:** `src/hooks/useTypewriter.ts`

```ts
function useTypewriter(text: string, charDelay = 40): { displayed: string; done: boolean }
```

Used on Screens 0, 2, 3. Plays `typewriterClick` Howl on each character append (throttled to max 1 play per `charDelay`ms to avoid overlapping sounds).

---

## i18n

New `intro` namespace in `src/i18n/locales/{en,fr}/intro.json`. Keys:

| Key | EN | FR |
|---|---|---|
| `screen0.p1` | `> Nouveau Paris. 192X.` | `> Nouveau Paris. 192X.` |
| `screen0.p2` | "In this city, cooking at home is a crime against high society. Your worth is measured by where you eat, who you eat with, and who you are seen ignoring." | FR equivalent |
| `screen0.p3` | "At the center of it all is LE SOLSTICE. The most exclusive, impossible-to-book restaurant in the world." | FR equivalent |
| `screen0.p4` | "Last night, the Maître D' seated a Duke next to the kitchen doors. He has not been seen since." | FR equivalent |
| `screen0.p5` | "Today, they are interviewing his replacement." | FR equivalent |
| `screen0.clickToContinue` | "▸ click to continue" | "▸ cliquez pour continuer" |
| `screen1.monsieurV` | "Ah. The new applicant. You look entirely unqualified. Perfect. Fill out the paperwork before I change my mind." | FR equivalent |
| `screen1.namePlaceholder` | "The Rookie" | "La Recrue" |
| `screen1.nameLabel` | "Name" | "Nom" |
| `screen1.difficultyLabel` | "Difficulty" | "Difficulté" |
| `screen1.position` | "Maître D' — Le Solstice" | "Maître D' — Le Solstice" |
| `screen1.positionLabel` | "Position" | "Poste" |
| `screen1.signContract` | "[ Sign Contract ]" | "[ Signer le Contrat ]" |
| `screen2.p1` | "Listen closely, {{name}}. Running the door at Le Solstice is not about hospitality. It is about survival." | FR equivalent |
| `screen2.p2` | "Outside that door is a city of vipers. Politicians, Influencers, and the Syndicate. They all want a table, and none of them care about our rules. But I care about the rules." | FR equivalent |
| `screen2.p3` | "If you let a scoundrel in, we lose our reputation. If you insult a VIP, we lose our windows. Protect the Michelin Stars, keep the cash flowing, and for the love of God, enforce the dress code." | FR equivalent |
| `screen3.monsieurV` | "The queue is forming. Unlock the doors. Do not disappoint me." | FR equivalent |
| `screen3.clockIn` | "[ Clock In ]" | "[ Prendre son Poste ]" |
| `skip` | "Skip intro" | "Passer l'intro" |

---

## Modified Files

### `src/App.tsx`
- Remove `LANDING` from `GamePhase`; add `INTRO`
- Initial phase: `'INTRO'`
- Replace `LandingPage` render block with `<IntroSequence onComplete={handleIntroComplete} />`
- Add `handleIntroComplete(difficulty, playerName, avatarIndex)`: sets state, transitions to `'PLAYING'`
- Corkboard "Leave" handler: `setPhase('INTRO')` (already calls `campaign.resetCampaign()`)
- `playerName` and `avatarIndex` stored in `App` state only — not passed to `GameProvider` (cosmetic, no engine impact for now)

### `src/components/LandingPage.tsx`
- Deleted.

---

## localStorage Keys

| Key | Value | Purpose |
|---|---|---|
| `service-compris-intro-seen` | `"true"` | Show skip button on subsequent playthroughs |

---

## Out of Scope

- Name/avatar displayed during gameplay (TopBar, podium, corkboard) — cosmetic only for now
- Per-character voice lines or lip sync
- Animated props on the desk (ashtray, cigar smoke particle effects)
- Mobile-specific layout adjustments for the ID card
- Saving the chosen name/avatar between sessions
