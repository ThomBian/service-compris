# Street Scene Background — Design Spec

**Date:** 2026-03-29
**Status:** Partial — remaining items cancelled 2026-03-29

> The `StreetSceneBackground` component and neon overlays are implemented. The `h-[35vh]` scene height change and queue/party width adjustments are cancelled — not needed given the current layout.

## Summary

Replace the blank `DeskScene` background with an Art Deco rainy-night city street panorama. The scene panel grows to 35vh and gains a static pixel-art background image with CSS neon glow pulse overlays. Queue, characters, and all existing gameplay elements remain visually unchanged — the background is purely atmospheric.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Layout | Street Panorama | City street fills the scene, characters stand on sidewalk |
| Scene height | 35vh (from 25vh) | Enough room for buildings + characters to read clearly |
| Background | Static PNG + animated CSS overlays | Pixel-art image quality; no runtime generation cost |
| Queue composition | Flat horizontal strip (unchanged) | Avoids gameplay complexity; background is decorative |
| Animation | Neon glow pulse only | Rain strips consume too much CPU |
| Architecture | New `StreetSceneBackground` component | Clean separation; image is independently swappable |

## Files

### New
- `src/components/scene/StreetSceneBackground.tsx` — background image + neon overlay component

### Modified
- `src/components/ScenePanel.tsx` — `h-[25vh]` → `h-[35vh]`
- `src/components/scene/DeskScene.tsx` — wrap content with `StreetSceneBackground`

### Asset
- `public/street-background.png` — pixel art city scene (already in place)

## Component: `StreetSceneBackground`

```tsx
// Renders two layers inside a relative container filling its parent.
// Children are rendered above both layers.
<StreetSceneBackground>
  {/* existing DeskScene content */}
</StreetSceneBackground>
```

### Layer 1 — Background image
- `position: absolute; inset: 0`
- `background-image: url('/street-background.png')`
- `background-size: cover; background-position: bottom center; image-rendering: pixelated`
- `z-index: 0`

### Layer 2 — Neon glow overlays
- Absolutely positioned `<div>`s placed over the sign areas in the image
- Each has a radial gradient in the sign's color (gold, purple, cyan)
- CSS `@keyframes neonPulse` animates `opacity` between ~0.5 and 1.0 and `filter: blur` between 6px and 12px
- Each overlay has a distinct `animation-duration` (2.5s–4s) and `animation-delay` so signs pulse independently
- Signs covered: LE SOLSTICE (gold), ART DECO (gold), JAZZ CAFE/CLUB (purple), DRUGS (cyan)
- Pavement reflection strips below each sign (same animation, lower opacity, vertical gradient fading to transparent)
- `z-index: 1; pointer-events: none`

### Layer 3 — Children (characters)
- `z-index: 10` — existing DeskScene content renders above both background layers
- No changes to character rendering, queue logic, or interaction

## DeskScene changes

- Import and wrap the outermost container with `<StreetSceneBackground>`
- The existing `bg-stone-50` background class is removed from the scene container (background comes from the image)
- Existing `border-b border-[#141414]` border is preserved

## Neon overlay positions

Positions are percentages relative to the scene container, tuned to the `street-background.png` image:

| Sign | left | top | width | height | color |
|---|---|---|---|---|---|
| LE SOLSTICE | ~4% | ~10% | ~14% | ~50% | rgba(240,192,64,…) |
| ART DECO | ~22% | ~5% | ~6% | ~65% | rgba(240,200,80,…) |
| JAZZ CAFE | ~47% | ~8% | ~9% | ~55% | rgba(160,80,220,…) |
| JAZZ CLUB | ~54% | ~45% | ~10% | ~25% | rgba(180,60,240,…) |
| DRUGS | ~91% | ~10% | ~7% | ~55% | rgba(0,200,255,…) |

Positions will need minor tuning after visual review in-browser.

## Queue visibility

The current queue uses `opacity-40 grayscale` — designed for a light (stone-50) background. Against the dark night street, this renders the figures nearly invisible.

**Change:** Remove `grayscale`. Replace default flat traits with `seedTraits(c.id, 0)` so each figure has its own consistent look. Keep the patience bar above. Set opacity to `opacity-70` rather than `opacity-40` — enough to distinguish them from the foreground client while still reading as "waiting."

The queue figures should read legibly as human silhouettes against the dark background.

## Party width at desk

The current party renders one full `ClientAvatar` per member side-by-side (`flex gap-1`), which sprawls for parties of 4–8.

**Change:** Show the **lead avatar** (index 0) at full size only. For parties larger than 1, add a compact count pill `+N` beside or below the lead avatar (e.g. `+3` for a party of 4). The pill preserves the size-accusation mechanic while keeping the desk area compact.

The count pill uses the same styling as existing badges: small, bold, uppercase, rounded-full, with a subtle border.

## ScenePanel overflow note

`ScenePanel` has `overflow-hidden`. `DeskScene` is already `overflow-visible` for speech bubbles that extend above. Verify speech bubbles are not clipped at 35vh. If needed, change `ScenePanel` to `overflow-x-hidden` only.

## Out of scope

- Rain animation
- Queue depth/perspective effects
- Velvet rope UI element
- FloorplanScene background (unchanged)
- Character redesign
