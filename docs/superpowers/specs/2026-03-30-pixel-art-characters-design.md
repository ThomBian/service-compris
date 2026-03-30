# Pixel Art Character Renderer

**Date:** 2026-03-30
**Status:** Approved

## Overview

Replace the current SVG-based character rendering system with a pixel art canvas renderer. All characters — random customers, VIPs, banned guests, and the maître d' — are redrawn as 24×48 pixel art sprites that match the game's Art Deco / brass-and-glass aesthetic. Characters appear in three contexts: the desk scene, the street queue, and the Clipboard dossier panel.

## Reference

The target visual style is detailed pixel art with an Art Deco restaurant setting: warm browns, gold (#d4af37) and burgundy (#7b1c2e) accents, expressive faces, and clearly readable accessories (hats, ties, glasses) at small display sizes.

## Sprite Specification

- **Native size:** 24px wide × 48px tall
- **Coordinate system:** x=0 left, y=0 top
- **Rendering:** `<canvas>` element drawn at native size, CSS-scaled up with `image-rendering: pixelated`
- **Scale by context:**
  - Desk scene: `scale=3` → 72×144px
  - Queue: `scale=1.5` → 36×72px
  - Clipboard dossier: `scale=1` → 24×48px

## Layer System

Layers composite bottom-to-top in this order:

1. Shadow (semi-transparent ellipse at feet)
2. Shoes
3. Legs
4. Torso / clothing
5. Neck
6. Head (skin, eyes, nose, mouth)
7. Hair
8. Accessories (hat, glasses, facial hair, neckwear)

Each layer is a `PixelLayer`: an array of `PixelRect` objects — `{ x, y, w, h, color }` — drawn with `fillRect` calls on the canvas context.

## Visual Traits → Layers

All existing `VisualTraits` fields map to pixel art layers:

| Trait | Values | Pixel art treatment |
|---|---|---|
| `skinTone` | 0–4 | Head + neck fill color |
| `hairStyle` | 0–4 | Short, long, curly, bald, bun — each a distinct rect pattern |
| `hairColor` | 0–5 | Fill color on hair layer |
| `clothingStyle` | 0–3 | Jacket, casual, dress, smart-casual — distinct torso shapes |
| `clothingColor` | 0–4 | Fill color on torso layer |
| `height` | 0–2 | Legs layer height: 6 / 8 / 10 rows |
| `hat` (VIP) | 0–2 | Top hat, beret, chef's toque — drawn above head |
| `facialHair` (VIP) | 0–1 | Curled moustache, full beard |
| `neckwear` (VIP) | 0–3 | Red tie, gold cravat, red scarf, long red tie |
| `glasses` (Banned) | 0–1 | Wire-frame rounds, oversized sunglasses |
| `eyebrows` (Banned) | 0–1 | Heavy furrowed brows, droopy half-closed lids |

`VisualTraits` type in `src/types.ts` is unchanged.

## New Files

### `src/components/scene/pixelSprites.ts`

Pure module. No React. Exports one function per layer type:

```ts
hairLayer(style: number, color: string): PixelLayer
headLayer(skinTone: string): PixelLayer
clothingLayer(style: number, color: string): PixelLayer
legsLayer(height: number, color: string): PixelLayer
shoesLayer(): PixelLayer
shadowLayer(): PixelLayer
hatLayer(style: number): PixelLayer
facialHairLayer(style: number, color: string): PixelLayer
neckwearLayer(style: number): PixelLayer
glassesLayer(style: number): PixelLayer
eyebrowsLayer(style: number, color: string): PixelLayer
```

Also exports color palette constants matching the existing `ClientAvatar` constants:

```ts
SKIN_TONES: string[]   // 5 values
HAIR_COLORS: string[]  // 6 values
CLOTHING_COLORS: string[]  // 5 values
```

### `src/components/scene/pixelRenderer.ts`

Pure module. No React.

```ts
type PixelRect = { x: number; y: number; w: number; h: number; color: string }
type PixelLayer = PixelRect[]

function renderSprite(layers: PixelLayer[], ctx: CanvasRenderingContext2D): void
function buildCustomerLayers(traits: VisualTraits): PixelLayer[]
```

`renderSprite` iterates layers in order, calling `ctx.fillRect` for each rect. `buildCustomerLayers` assembles layers from traits using the functions in `pixelSprites.ts`.

### `src/components/scene/PixelAvatar.tsx`

Replaces `ClientAvatar`. Same props interface:

```ts
interface PixelAvatarProps {
  traits: VisualTraits
  animationState?: 'entrance' | 'accused' | 'refused'
  scale?: number  // default: 2
}
```

Renders a `<canvas>` at 24×48 native pixels, CSS-scaled. `useEffect` calls `buildCustomerLayers(traits)` then `renderSprite(layers, ctx)` on mount and whenever traits change. Animation state applies a CSS class with keyframes:

- `entrance`: `translateY(8px → 0) + opacity(0 → 1)`, 300ms ease-out
- `accused`: `translateX` shake (±3px × 4 cycles), 400ms
- `refused`: `translateY(0 → 10px) + opacity(1 → 0)`, 300ms ease-in

### `src/components/scene/PixelMaitreD.tsx`

Replaces `MaitreDAvatar`. Same props interface:

```ts
interface PixelMaitreDProps {
  animationState?: 'idle' | 'bow' | 'stop' | 'shrug'
  scale?: number  // default: 2
}
```

Renders a `<canvas>` at 24×48. Four hand-authored sprite functions defined inline (not trait-based):

- `drawIdle(ctx)` — upright, stern face, arms at sides
- `drawBow(ctx)` — torso rotated forward (~20°), eyes closed
- `drawStop(ctx)` — arms raised, wide eyes, raised brows
- `drawShrug(ctx)` — arms raised (palms up), slight shrug expression

`useEffect` redraws canvas on `animationState` change. A CSS scale pulse (`scale(1 → 1.04 → 1)`, 150ms) marks each state transition.

## Migration

Drop-in replacements — same prop APIs, no changes to call sites except import paths:

| Old | New |
|---|---|
| `ClientAvatar` | `PixelAvatar` |
| `MaitreDAvatar` | `PixelMaitreD` |

Files to update imports:
- `src/components/scene/DeskScene.tsx`
- `src/components/desk/Clipboard.tsx` (used in `VipDossierEntry`, `BannedDossierEntry`)
- Queue component(s) that render waiting customers

`ClientAvatar.tsx` and `MaitreDAvatar.tsx` are deleted after migration.

## Out of Scope

- Floorplan table occupancy indicators (tracked separately)
- Animated props (bread loaf, wine glass, salt shaker) — static sprites only
- Per-character named sprite overrides (Donny Tromp orange skin, etc. are achieved through existing `visualTraits` in `characterRoster.ts`)

## Testing

`pixelSprites.ts` and `pixelRenderer.ts` are pure functions — unit tests cover:
- Each layer function returns rects within the 24×48 bounds
- `buildCustomerLayers` produces layers for every trait combination without throwing
- `renderSprite` calls `fillRect` the expected number of times (mock canvas context)
