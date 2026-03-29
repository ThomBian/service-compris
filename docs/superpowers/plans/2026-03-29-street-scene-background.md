# Street Scene Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blank DeskScene background with an Art Deco rainy-night city street panorama, fix queue visibility on the dark background, and compact the party display at the desk.

**Architecture:** A new `StreetSceneBackground` wrapper component renders the static PNG behind its children using three CSS layers (image, neon glow overlays, children). DeskScene wraps its content with it and drops its own `bg-stone-50`. Queue figures get real seed-based traits and higher opacity. The desk party collapses to lead avatar + count pill.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, CSS keyframe animations (no new dependencies)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/components/scene/StreetSceneBackground.tsx` | **Create** | Background image + neon overlays component |
| `src/components/ScenePanel.tsx` | **Modify** | `h-[25vh]` → `h-[35vh]`, verify overflow |
| `src/components/scene/DeskScene.tsx` | **Modify** | Wrap with background, fix queue, compact party |

---

## Task 1: Grow the scene panel to 35vh

**Files:**
- Modify: `src/components/ScenePanel.tsx:13`

- [ ] **Step 1: Change the height class**

In `ScenePanel.tsx` line 13, change:
```tsx
<div className="h-[25vh] shrink-0 overflow-hidden">
```
to:
```tsx
<div className="h-[35vh] shrink-0 overflow-x-hidden">
```

`overflow-x-hidden` (not `overflow-hidden`) keeps horizontal clipping while allowing speech bubbles to extend above the panel boundary. `DeskScene` already uses `overflow-visible`.

- [ ] **Step 2: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000. The scene panel should be noticeably taller. Speech bubbles from the maitre d' and current client should still appear above the scene. No visual regressions.

- [ ] **Step 3: Commit**

```bash
git add src/components/ScenePanel.tsx
git commit -m "feat: grow scene panel to 35vh for street background"
```

---

## Task 2: Create `StreetSceneBackground`

**Files:**
- Create: `src/components/scene/StreetSceneBackground.tsx`

This component renders the street image and neon overlays, with children on top.

- [ ] **Step 1: Create the component**

```tsx
// src/components/scene/StreetSceneBackground.tsx
import React from 'react';

interface StreetSceneBackgroundProps {
  children: React.ReactNode;
}

// Neon glow overlays tuned to sign positions in public/street-background.png.
// Each sign has a primary glow and a pavement reflection below it.
// Positions are % of the container — adjust if the image crops differently.
const NEONS = [
  // LE SOLSTICE — gold, far left
  { key: 'solstice',  left: '4%',  top: '10%', w: '14%', h: '50%', color: 'rgba(240,192,64,0.65)',  dur: '3.2s', delay: '0s',    reflectH: '18%' },
  // ART DECO — gold vertical, left-center
  { key: 'artdeco',   left: '22%', top: '5%',  w: '6%',  h: '65%', color: 'rgba(240,200,80,0.5)',   dur: '4.1s', delay: '0.8s',  reflectH: '15%' },
  // JAZZ CAFE — purple
  { key: 'jazz',      left: '47%', top: '8%',  w: '9%',  h: '55%', color: 'rgba(160,80,220,0.6)',   dur: '2.8s', delay: '1.4s',  reflectH: '16%' },
  // JAZZ CLUB — purple lower
  { key: 'jazzclub',  left: '54%', top: '45%', w: '10%', h: '25%', color: 'rgba(180,60,240,0.45)',  dur: '3.5s', delay: '0.3s',  reflectH: '10%' },
  // DRUGS — cyan, far right
  { key: 'drugs',     left: '91%', top: '10%', w: '7%',  h: '55%', color: 'rgba(0,200,255,0.6)',    dur: '2.5s', delay: '2.1s',  reflectH: '17%' },
] as const;

export const StreetSceneBackground: React.FC<StreetSceneBackgroundProps> = ({ children }) => {
  return (
    <div className="relative h-full w-full overflow-visible">
      {/* Layer 1 — background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/street-background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          imageRendering: 'pixelated',
        }}
      />

      {/* Layer 2 — neon glow overlays + pavement reflections */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <style>{`
          @keyframes neonPulse {
            0%, 100% { opacity: 0.5; filter: blur(8px); }
            50%       { opacity: 1;   filter: blur(13px); }
          }
        `}</style>
        {NEONS.map((n) => (
          <React.Fragment key={n.key}>
            {/* Sign glow */}
            <div
              style={{
                position: 'absolute',
                left: n.left,
                top: n.top,
                width: n.w,
                height: n.h,
                background: `radial-gradient(ellipse, ${n.color} 0%, transparent 70%)`,
                animation: `neonPulse ${n.dur} ease-in-out infinite`,
                animationDelay: n.delay,
              }}
            />
            {/* Pavement reflection */}
            <div
              style={{
                position: 'absolute',
                left: n.left,
                bottom: 0,
                width: n.w,
                height: n.reflectH,
                background: `linear-gradient(180deg, ${n.color.replace(/[\d.]+\)$/, '0.25)')} 0%, transparent 100%)`,
                filter: 'blur(4px)',
                animation: `neonPulse ${n.dur} ease-in-out infinite`,
                animationDelay: n.delay,
              }}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Layer 3 — children (DeskScene content) */}
      <div className="relative z-10 h-full overflow-visible">
        {children}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/StreetSceneBackground.tsx
git commit -m "feat: add StreetSceneBackground with neon pulse overlays"
```

---

## Task 3: Integrate background into DeskScene

**Files:**
- Modify: `src/components/scene/DeskScene.tsx:1,186`

- [ ] **Step 1: Import the component**

Add to the imports in `DeskScene.tsx` (after the existing local imports):
```tsx
import { StreetSceneBackground } from './StreetSceneBackground';
```

- [ ] **Step 2: Wrap the scene content**

At line 186, the outermost `<div>` currently is:
```tsx
<div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-visible" data-tour="queue">
```

Change it to remove `bg-stone-50` and wrap with the background:
```tsx
return (
  <StreetSceneBackground>
    <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] overflow-visible" data-tour="queue">
```

Close the extra wrapper before the final `</div>` that closes the outermost container (add `</StreetSceneBackground>` after the last `</div>` on line 383).

The full return structure becomes:
```tsx
return (
  <StreetSceneBackground>
    <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] overflow-visible" data-tour="queue">
      {/* ... all existing children unchanged ... */}
    </div>
  </StreetSceneBackground>
);
```

- [ ] **Step 3: Run dev server and verify**

```bash
npm run dev
```

The street background should now appear behind the scene. Characters and queue should be visible on top. Speech bubbles should still work. Check that the maitre d' speech bubble is not clipped.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: integrate street scene background into DeskScene"
```

---

## Task 4: Fix queue visibility on dark background

**Files:**
- Modify: `src/components/scene/DeskScene.tsx:337-361`

The current queue renders default flat traits with `opacity-40 grayscale` — invisible against the dark night background.

- [ ] **Step 1: Update the queue rendering**

Find the queue section (around line 337):
```tsx
{/* Queue */}
<div className="flex items-end gap-2 flex-1 overflow-x-auto pb-1">
  {queue.map((c) => (
    <div
      key={c.id}
      className="flex flex-col items-center gap-0.5 shrink-0 opacity-40 grayscale"
    >
      <div
        className="h-1 rounded-full bg-emerald-500"
        style={{ width: Math.max(2, (c.patience / 100) * 20) }}
      />
      <ClientAvatar
        traits={{
          skinTone: 2,
          hairStyle: 0,
          hairColor: 0,
          clothingStyle: 0,
          clothingColor: 2,
          height: 0,
        }}
      />
      {/* Spacer matching desk-character label height so items-end aligns avatar feet */}
      <span className="invisible text-[9px] font-bold uppercase tracking-widest leading-none">x</span>
    </div>
  ))}
</div>
```

Replace with:
```tsx
{/* Queue */}
<div className="flex items-end gap-2 flex-1 overflow-x-auto pb-1">
  {queue.map((c) => (
    <div
      key={c.id}
      className="flex flex-col items-center gap-0.5 shrink-0 opacity-70"
    >
      <div
        className="h-1 rounded-full bg-emerald-400"
        style={{ width: Math.max(2, (c.patience / 100) * 20) }}
      />
      <ClientAvatar traits={seedTraits(c.id, 0)} />
      <span className="invisible text-[9px] font-bold uppercase tracking-widest leading-none">x</span>
    </div>
  ))}
</div>
```

Key changes:
- Remove `grayscale` — figures get their own visual traits
- `opacity-40` → `opacity-70` — readable on dark background
- Default flat traits → `seedTraits(c.id, 0)` — each client gets their own consistent look (same import already used at line 6)
- `bg-emerald-500` → `bg-emerald-400` — slightly lighter for dark background contrast

- [ ] **Step 2: Verify**

```bash
npm run dev
```

Queue figures should be clearly visible against the dark street. Each figure has distinct coloring. The patience bar shows above each figure.

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "fix: make queue figures visible against dark street background"
```

---

## Task 5: Compact party display at desk

**Files:**
- Modify: `src/components/scene/DeskScene.tsx:288-305`

A party of 8 currently renders 8 full-size avatars side-by-side, taking up ~320px. Replace with: lead avatar + compact count pill.

- [ ] **Step 1: Update the party group rendering**

Find the party flex group (around line 288):
```tsx
<div className="flex gap-1 items-end">
  {Array.from({ length: currentClient.truePartySize }).map(
    (_, i) => (
      <ClientAvatar
        key={i}
        traits={
          i === 0
            ? currentClient.visualTraits
            : seedTraits(currentClient.id, i)
        }
        animState={i === 0 ? guestAnimState : null}
        onAnimationComplete={
          i === 0 ? () => setGuestAnimState(null) : undefined
        }
      />
    ),
  )}
</div>
```

Replace with:
```tsx
<div className="flex gap-2 items-end">
  {/* Lead avatar — the spokesperson */}
  <ClientAvatar
    traits={currentClient.visualTraits}
    animState={guestAnimState}
    onAnimationComplete={() => setGuestAnimState(null)}
  />
  {/* Count pill — shown only for parties larger than 1 */}
  {currentClient.truePartySize > 1 && (
    <div className="self-center mb-2 inline-flex items-center justify-center rounded-full border border-[#141414] bg-white px-2 py-0.5 text-[10px] font-bold leading-none shadow-[1px_1px_0px_0px_rgba(20,20,20,1)]">
      +{currentClient.truePartySize - 1}
    </div>
  )}
</div>
```

- [ ] **Step 2: Verify**

```bash
npm run dev
```

- Party of 1: single avatar, no pill.
- Party of 2: avatar + `+1` pill.
- Party of 4: avatar + `+3` pill.
- The "Wrong Party Size" badge on hover should still appear (it targets the parent `motion.div`, not the avatar children).
- Clicking the party group should still trigger the size accusation.

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: compact party display to lead avatar + count pill"
```

---

## Task 6: Tune neon positions and final check

This task is a visual tuning pass — the neon overlay positions in `StreetSceneBackground.tsx` are initial estimates. Verify and adjust them against the actual image.

- [ ] **Step 1: Open dev server and inspect**

```bash
npm run dev
```

Look at the scene panel. Each neon sign in the background image should have a soft glow halo over it that pulses. The pavement below each sign should show a faint colored reflection.

- [ ] **Step 2: Adjust positions if needed**

If any glow is misaligned, edit the `NEONS` array in `src/components/scene/StreetSceneBackground.tsx`. The values are CSS percentages relative to the container:
- `left` — horizontal position from left edge
- `top` — vertical position from top edge
- `w` / `h` — width and height of the radial gradient

The `radial-gradient` is centered in the div, so the div should be centered over the sign, not at its top-left corner.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit tuned positions**

```bash
git add src/components/scene/StreetSceneBackground.tsx
git commit -m "fix: tune neon overlay positions to match street background image"
```

---

## Task 7: Final integration check

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 2: Visual checklist**

- [ ] Scene panel is taller (35vh) — buildings and sky clearly visible
- [ ] City street background fills the scene, `bottom center` anchored
- [ ] Neon signs pulse with independent timing (LE SOLSTICE gold, JAZZ purple, DRUGS cyan)
- [ ] Pavement reflections are visible below each sign
- [ ] Queue figures are visible and distinct on the dark background
- [ ] Patience bars show above queue figures
- [ ] Maitre d' and current client render correctly over the background
- [ ] Speech bubbles appear above the scene (not clipped)
- [ ] Party of 1: single avatar, no pill
- [ ] Party > 1: lead avatar + `+N` pill, accusation click still works
- [ ] Storm-out message still appears
- [ ] Floorplan view unchanged

- [ ] **Step 3: Commit if any final tweaks were made**

```bash
git add -p
git commit -m "fix: final visual adjustments to street scene"
```
