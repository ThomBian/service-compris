# Intro Sequence ("The Interview") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `LandingPage` with a four-screen intro (`IntroSequence`), wire `App` phases to `INTRO | CORKBOARD | PLAYING`, add Howler-based intro audio, typewriter hook, i18n `intro` namespace, and avatar presets per [spec](../specs/2026-03-30-intro-sequence-design.md).

### Implementation status (in repo)

- **Shipped:** Full intro flow; `LANDING` kept as entry; difficulty on ID card only; Enter between text blocks; skip-to-paperwork on screen 0 only; sign-contract card removal + no duplicate card on screen 2; tour when first guest reaches **AT_DESK**; tour `localStorage` on skip/complete; **TopBar** shows maître d’ name + `PixelAvatar` from intro.
- **Optional next:** Corkboard identity line, persist name/avatar across sessions, replace placeholder MP3s under `public/audio/intro/`.

**Architecture:** `IntroSequence` owns screen index and form state; calls `onComplete(difficulty, playerName, avatarIndex)` on CLOCK IN or skip. Audio is lazy-instantiated Howl instances after first user gesture (Screen 0). Pure preset data in `introAvatars.ts`; `useTypewriter` is a small state machine hook testable in isolation. `App` keeps `playerName` / `avatarIndex` in React state only (cosmetic, not passed to `GameProvider`).

**Tech Stack:** React 19, Vite, Tailwind 4, i18next, Howler.js (`howler`), existing `PixelAvatar` + `VisualTraits`, `StreetSceneBackground` (same shell as `DeskScene`).

**Spec reference:** `docs/superpowers/specs/2026-03-30-intro-sequence-design.md`

**Product note:** Today `LandingPage` hosts the EN/FR toggle. After deletion, add the same language control to intro UI (e.g. top-left on all screens, or Screen 1 header) so bilingual behavior is preserved.

**Screen 3 HUD values (Night 1, no persist):** Mirror `buildInitialState` in `src/logic/gameLogic.ts`: time label from `formatTime(START_TIME)` / `START_TIME` from `src/constants.ts` (19:30), rating **5.0**, cash **0**, morale not required for the three boot elements in the spec.

---

## File map

| Path | Action |
|------|--------|
| `src/components/intro/IntroSequence.tsx` | Create — orchestrates 4 screens + skip |
| `src/components/intro/introAvatars.ts` | Create — `INTRO_AVATARS` presets |
| `src/components/intro/introAudio.ts` | Create — factory returning Howl instances (lazy) |
| `src/hooks/useTypewriter.ts` | Create |
| `src/hooks/__tests__/useTypewriter.test.ts` | Create |
| `src/audio/` | Create folder if missing (or colocate `introAudio` under `src/components/intro/` per team preference; spec says `src/audio/introAudio.ts`) |
| `src/i18n/locales/en/intro.json`, `fr/intro.json` | Create |
| `src/i18n/index.ts` | Modify — register `intro` namespace |
| `src/App.tsx` | Modify — phase type, initial `INTRO`, handlers, render |
| `src/components/LandingPage.tsx` | Delete |
| `public/audio/intro/*.mp3` | Add placeholder assets or README (spec: source separately) |
| `package.json` | Add `howler` dependency |
| `CLAUDE.md` | Optional small update: LANDING → INTRO (only if you maintain docs with app phases) |

---

### Task 1: Dependency and audio placeholders

**Files:**
- Modify: `package.json`
- Create: `public/audio/intro/README.md` (or add minimal silent/placeholder MP3s if CI/build must not 404)

- [ ] **Step 1:** Install Howler.

```bash
npm install howler
```

- [ ] **Step 2:** Add `@types/howler` if TypeScript complains (often bundled in `howler` v2; verify with `npm run lint`).

- [ ] **Step 3:** Add `public/audio/intro/` with the five filenames from the spec (`rain-loop.mp3`, `jazz-loop.mp3`, `typewriter-click.mp3`, `clipboard-thud.mp3`, `door-open.mp3`). Until real assets exist, use short silent clips or document in README that missing files will error at runtime when those sounds play.

- [ ] **Step 4:** Commit.

```bash
git add package.json package-lock.json public/audio/intro/
git commit -m "chore: add howler and intro audio asset placeholders"
```

---

### Task 2: Intro avatar presets

**Files:**
- Create: `src/components/intro/introAvatars.ts`
- Test: `src/components/intro/__tests__/introAvatars.test.ts` (optional but quick)

- [ ] **Step 1:** Export `INTRO_AVATARS` exactly as in the spec (five `VisualTraits` objects). Import `VisualTraits` from `@/src/types`.

- [ ] **Step 2:** Add a test that each entry has required keys and numeric enums in range (e.g. `skinTone` 0–4, `hairColor` 0–5, optional `facialHair` / `glasses` / `eyebrows` only where set).

Run: `npm run test -- src/components/intro/__tests__/introAvatars.test.ts`
Expected: PASS

- [ ] **Step 3:** Commit.

```bash
git add src/components/intro/introAvatars.ts src/components/intro/__tests__/introAvatars.test.ts
git commit -m "feat(intro): add INTRO_AVATARS presets"
```

---

### Task 3: `useTypewriter` hook (TDD)

**Files:**
- Create: `src/hooks/useTypewriter.ts`
- Create: `src/hooks/__tests__/useTypewriter.test.ts`

- [ ] **Step 1:** Write failing test — given `text = "ab"`, `charDelay` mocked/small, after ticks `displayed` grows `"a"` → `"ab"` and `done` is true at end.

Use `@testing-library/react` `renderHook` + `act` + fake timers (`vi.useFakeTimers()`).

- [ ] **Step 2:** Run test — expect FAIL.

```bash
npm run test -- src/hooks/__tests__/useTypewriter.test.ts
```

- [ ] **Step 3:** Implement `useTypewriter(text, charDelay = 40)` returning `{ displayed, done }`. Reset when `text` changes.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/hooks/useTypewriter.ts src/hooks/__tests__/useTypewriter.test.ts
git commit -m "feat(hooks): add useTypewriter for intro copy"
```

---

### Task 4: Intro audio module

**Files:**
- Create: `src/audio/introAudio.ts`

- [ ] **Step 1:** Export a function e.g. `createIntroSounds()` that returns object `{ rainLoop, jazzLoop, typewriterClick, clipboardThud, doorOpen }` as Howl instances with volumes from spec (`0.4`, `0.2`, `0.6`, `0.8`, `0.7`). Use paths `/audio/intro/....mp3`. Loops: rain + jazz.

- [ ] **Step 2:** Export helpers or document in JSDoc: jazz fade-in 2s on first start; rain starts on first user interaction (caller responsibility).

- [ ] **Step 3:** `npm run lint` — no errors.

- [ ] **Step 4:** Commit.

```bash
git add src/audio/introAudio.ts
git commit -m "feat(audio): add intro Howler factory"
```

---

### Task 5: i18n `intro` namespace

**Files:**
- Create: `src/i18n/locales/en/intro.json`, `src/i18n/locales/fr/intro.json`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1:** Add all keys from spec table (screen0 p1–p5, clickToContinue, screen1 fields, screen2 p1–p3 with `{{name}}` for p1, screen3, skip). French strings: faithful equivalents (not literal English).

- [ ] **Step 2:** Import JSON in `index.ts`, add to `resources.en` / `resources.fr`, append `'intro'` to `ns` array.

- [ ] **Step 3:** Commit.

```bash
git add src/i18n/
git commit -m "feat(i18n): add intro namespace (en/fr)"
```

---

### Task 6: `IntroSequence` — structure and Screen 0

**Files:**
- Create: `src/components/intro/IntroSequence.tsx` (grow incrementally; may split subcomponents in same folder if file exceeds ~400 lines)

- [ ] **Step 1:** Scaffold props `onComplete: (difficulty, playerName, avatarIndex) => void`. State: `screen`, `playerName` default `''` (on submit use `t('screen1.namePlaceholder')` if blank), `avatarIndex` 0–4, `difficulty` default `1`. Constant `INTRO_SEEN_KEY = 'service-compris-intro-seen'`.

- [ ] **Step 2:** Skip control: if `localStorage.getItem(INTRO_SEEN_KEY)`, show small top-right `"intro:skip"` button calling `onComplete(...)` with current state.

- [ ] **Step 3:** Screen 0: black `#000`, monospace off-white, max-w ~600px centered. Chain five paragraphs with `useTypewriter` per paragraph (sequential: next paragraph only after previous `done`). On first click anywhere: create sounds once (ref), start `rainLoop`, fade in `jazzLoop` over 2s. After last paragraph completes, show fade-in `intro:screen0.clickToContinue`; click advances to screen 1.

- [ ] **Step 4:** Language toggle: copy pattern from `LandingPage` (`useTranslation`, `i18n.changeLanguage`, `common:language.en` / `fr`).

- [ ] **Step 5:** Manual: `npm run dev`, verify Screen 0 flow and skip (set localStorage key manually).

- [ ] **Step 6:** Commit partial.

```bash
git add src/components/intro/IntroSequence.tsx
git commit -m "feat(intro): IntroSequence screen 0 and skip"
```

---

### Task 7: Screen 1 — ID card and character creation

**Files:**
- Modify: `src/components/intro/IntroSequence.tsx`
- Use: `StreetSceneBackground`, `PixelAvatar`, `INTRO_AVATARS`

- [ ] **Step 1:** Background: wrap content in `StreetSceneBackground` with dim overlay (e.g. `bg-black/50` or similar). CSS lamp flicker at top (keyframes).

- [ ] **Step 2:** Monsieur V. block: label + italic dialogue from `intro:screen1.monsieurV` (no typewriter).

- [ ] **Step 3:** ID card: parchment `#f5f0e4`, border `#c8a84b`, header i18n key (add `screen1.cardHeader` if not in spec table — align copy with spec: "LE SOLSTICE — Employee Identification Card" in both locales).

- [ ] **Step 4:** Avatar: `PixelAvatar traits={INTRO_AVATARS[avatarIndex]} scale={3}` inside a container `h-[72px] overflow-hidden` to crop torso. Arrows cycle index; show `(avatarIndex+1) / 5`.

- [ ] **Step 5:** Name input, difficulty four buttons (reuse classes from deleted `LandingPage` or extract shared `DifficultyToggle` — YAGNI: inline copy is OK if small).

- [ ] **Step 6:** `[ SIGN CONTRACT ]` full width `#7b1c2e`, monospace; press animation; go to screen 2.

- [ ] **Step 7:** Commit.

```bash
git add src/components/intro/IntroSequence.tsx src/i18n/locales/en/intro.json src/i18n/locales/fr/intro.json
git commit -m "feat(intro): screen 1 ID card and character creation"
```

---

### Task 8: Screen 2 — stakes (clipboard + typewriter)

**Files:**
- Modify: `src/components/intro/IntroSequence.tsx`

- [ ] **Step 1:** On enter screen 2: animate ID card `translateX(-110%)` 300ms ease-in; then clipboard enters `translateY(-120%) → 0` 400ms with spring/bounce; on clipboard land play `clipboardThud`.

- [ ] **Step 2:** Three dialogue blocks sequential typewriter with 600ms pause between blocks; interpolate `{{name}}` in first block via i18n (`screen2.p1`).

- [ ] **Step 3:** After third block, show click to continue; click → screen 3.

- [ ] **Step 4:** Commit.

```bash
git add src/components/intro/IntroSequence.tsx
git commit -m "feat(intro): screen 2 stakes and clipboard animation"
```

---

### Task 9: Screen 3 — pan, boot HUD, CLOCK IN

**Files:**
- Modify: `src/components/intro/IntroSequence.tsx`
- Use: `START_TIME` from `@/src/constants`, `formatTime` from `@/src/utils`

- [ ] **Step 1:** On enter: CSS `translateY` on background layer 1.2s ease-in-out (camera pan feel).

- [ ] **Step 2:** After pan: stagger three elements with flicker (opacity 0→1, 2–3 quick flickers ~200ms): clock `formatTime(START_TIME)`, stars **5.0** (or one decimal per `TopBar` convention), cash **0**.

- [ ] **Step 3:** Typewriter final Monsieur V. line; then `[ CLOCK IN ]` with pulsing outline.

- [ ] **Step 4:** On CLOCK IN: `doorOpen` play; fade out rain + jazz over 1.5s; `localStorage.setItem(INTRO_SEEN_KEY, 'true')`; `onComplete(difficulty, trimmedNameOrDefault, avatarIndex)`.

- [ ] **Step 5:** Commit.

```bash
git add src/components/intro/IntroSequence.tsx
git commit -m "feat(intro): screen 3 transition and clock in"
```

---

### Task 10: Wire `App.tsx` and remove landing

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/LandingPage.tsx`

- [ ] **Step 1:** `type GamePhase = 'INTRO' | 'CORKBOARD' | 'PLAYING'`.

- [ ] **Step 2:** `useState<GamePhase>('INTRO')`.

- [ ] **Step 3:** State: `playerName: string`, `avatarIndex: number` (initial e.g. `''` and `0`).

- [ ] **Step 4:** `handleIntroComplete(d, name, avatar)`: `campaign.resetCampaign()`, `setPersist(undefined)`, `setDifficulty(d)`, `setPlayerName(name)`, `setAvatarIndex(avatar)`, `setPhase('PLAYING')`.

- [ ] **Step 5:** Replace `LandingPage` block with `<IntroSequence onComplete={handleIntroComplete} />`.

- [ ] **Step 6:** `handleLeave`: `setPhase('INTRO')` (keep `campaign.resetCampaign()` and `setPersist(undefined)` as today).

- [ ] **Step 7:** Delete `LandingPage.tsx`; remove import.

- [ ] **Step 8:** Run `npm run lint` and `npm run test`.

- [ ] **Step 9:** Commit.

```bash
git add src/App.tsx && git rm src/components/LandingPage.tsx
git commit -m "feat(app): INTRO phase replaces landing page"
```

---

### Task 11: Typewriter + sound integration polish

**Files:**
- Modify: `src/hooks/useTypewriter.ts`, `src/components/intro/IntroSequence.tsx`

- [ ] **Step 1:** Pass optional `onChar` callback or accept `sounds` ref: on each character append, play `typewriterClick` throttled to once per `charDelay` ms (spec).

- [ ] **Step 2:** Ensure cleanup: stop Howl instances / unload on unmount if `IntroSequence` unmounts mid-intro (avoid leaks).

- [ ] **Step 3:** `npm run test && npm run lint`.

- [ ] **Step 4:** Commit.

```bash
git add src/hooks/useTypewriter.ts src/components/intro/IntroSequence.tsx
git commit -m "fix(intro): typewriter click throttle and audio cleanup"
```

---

## Verification (before claiming done)

```bash
npm run lint
npm run test
npm run build
```

Manual smoke:

1. Fresh localStorage: full intro, no skip; complete → Night 1; reload app → skip visible.
2. Corkboard → Next night → **no** intro (stays `PLAYING` path).
3. Corkboard → Leave → intro again from Screen 0.
4. EN/FR toggle updates intro strings.

---

## Execution handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-03-30-intro-sequence.md`.

**1. Subagent-driven (recommended)** — Use superpowers:subagent-driven-development: one subagent per task, review between tasks.

**2. Inline execution** — Use superpowers:executing-plans in this session with checkpoints.

**Which approach do you want?**

Optional: run the plan-document reviewer loop from the writing-plans skill (dispatch reviewer with paths to this plan + the spec) before implementation.
