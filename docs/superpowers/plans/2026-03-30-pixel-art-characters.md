# Pixel Art Character Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]` / `- [x]`) syntax for tracking.

**Goal:** Replace the SVG-based `ClientAvatar` and `MaitreDAvatar` with a canvas-based 24×48 pixel art renderer used in the desk scene, queue, and Clipboard panel.

**Completion:** Implemented in the repo. Checkboxes below are marked done. **`PixelMaitreD`:** `onAnimationComplete` fires after **500ms** (bow), **300ms** (stop), **400ms** (shrug) via `setTimeout`, matching the former `MaitreDAvatar` motion durations; the plan text that used `md-pulse` + `onAnimationEnd` was superseded for behavioral parity. **`PixelAvatar`:** guest CSS keyframes unchanged; keyframe injection runs once in `useEffect`. Both canvases use `aria-hidden` as decorative portraits.

**Architecture:** A pure data layer (`pixelSprites.ts`) defines pixel rects per trait; a pure renderer (`pixelRenderer.ts`) composites them onto a canvas context; two React components (`PixelAvatar`, `PixelMaitreD`) wrap a `<canvas>` element and apply CSS animations. Drop-in replacements for existing components with identical prop APIs.

**Tech Stack:** React 19, TypeScript, Vitest (Node env), `<canvas>` API, CSS keyframes

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/components/scene/pixelSprites.ts` | Pure layer data: one function per trait type returning `PixelLayer` |
| Create | `src/components/scene/pixelRenderer.ts` | `renderSprite` + `buildCustomerLayers` — pure, no React |
| Create | `src/components/scene/PixelAvatar.tsx` | React canvas component replacing `ClientAvatar` |
| Create | `src/components/scene/PixelMaitreD.tsx` | React canvas component replacing `MaitreDAvatar` |
| Create | `src/components/scene/__tests__/pixelSprites.test.ts` | Bounds + completeness tests |
| Create | `src/components/scene/__tests__/pixelRenderer.test.ts` | Renderer unit tests |
| Modify | `src/components/scene/DeskScene.tsx` | Swap imports to `PixelAvatar` / `PixelMaitreD` |
| Modify | `src/components/desk/Clipboard.tsx` | Swap import to `PixelAvatar` |
| Delete | `src/components/scene/ClientAvatar.tsx` | Replaced |
| Delete | `src/components/scene/MaitreDAvatar.tsx` | Replaced |

---

## Sprite Coordinate System

All sprites: 24px wide × 48px tall. y=0 at top. Each unit = 1 canvas pixel, CSS-scaled.

```
y=0–8   : hair / hat
y=9–19  : head (face, eyes, mouth)
y=19–22 : neck
y=22–36 : torso / clothing
y=36–43 : legs
y=43–46 : shoes
y=46–48 : shadow
```

Scale by context: desk `scale=3` (72×144px), queue `scale=1.5` (36×72px), clipboard `scale=1` (24×48px).

---

## Task 1: Pixel type definitions and base layers

**Files:**
- Create: `src/components/scene/pixelSprites.ts`
- Create: `src/components/scene/__tests__/pixelSprites.test.ts`

- [x] **Step 1: Write failing tests for base types and layers**

```typescript
// src/components/scene/__tests__/pixelSprites.test.ts
import { describe, it, expect } from 'vitest'
import {
  shadowLayer, shoesLayer, legsLayer, neckLayer,
  SKIN_TONES, HAIR_COLORS, CLOTHING_COLORS,
} from '../pixelSprites'
import type { PixelRect } from '../pixelSprites'

const SPRITE_W = 24
const SPRITE_H = 48

function inBounds(r: PixelRect) {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= SPRITE_W && r.y + r.h <= SPRITE_H
}

describe('pixelSprites base layers', () => {
  it('shadowLayer rects are in bounds', () => {
    shadowLayer().forEach(r => expect(inBounds(r)).toBe(true))
  })
  it('shoesLayer rects are in bounds', () => {
    shoesLayer().forEach(r => expect(inBounds(r)).toBe(true))
  })
  it('legsLayer height 0 is shorter than height 2', () => {
    const h0 = legsLayer(0, '#000')
    const h2 = legsLayer(2, '#000')
    const totalH = (rects: PixelRect[]) => rects.reduce((s, r) => s + r.h, 0)
    expect(totalH(h0)).toBeLessThan(totalH(h2))
  })
  it('neckLayer uses skin color', () => {
    const layer = neckLayer('#abcdef')
    expect(layer.every(r => r.color === '#abcdef')).toBe(true)
  })
  it('SKIN_TONES has 5 entries', () => {
    expect(SKIN_TONES).toHaveLength(5)
  })
  it('HAIR_COLORS has 6 entries', () => {
    expect(HAIR_COLORS).toHaveLength(6)
  })
  it('CLOTHING_COLORS has 5 entries', () => {
    expect(CLOTHING_COLORS).toHaveLength(5)
  })
})
```

- [x] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- pixelSprites --run
```

Expected: FAIL — module not found.

- [x] **Step 3: Implement base types and layers**

```typescript
// src/components/scene/pixelSprites.ts
export type PixelRect = { x: number; y: number; w: number; h: number; color: string }
export type PixelLayer = PixelRect[]

export const SKIN_TONES     = ['#fde8d0', '#f5c5a3', '#d4956a', '#a0624a', '#5c3317'] as const
export const HAIR_COLORS    = ['#1a0f0a', '#4a2c17', '#d4a843', '#c0392b', '#888888', '#f0f0f0'] as const
export const CLOTHING_COLORS = ['#141414', '#c0392b', '#2c3e50', '#27ae60', '#8e44ad'] as const

function r(x: number, y: number, w: number, h: number, color: string): PixelRect {
  return { x, y, w, h, color }
}

export function shadowLayer(): PixelLayer {
  return [r(4, 46, 16, 2, 'rgba(0,0,0,0.25)')]
}

export function shoesLayer(): PixelLayer {
  return [
    r(4, 43, 6, 3, '#0a0a0a'),
    r(14, 43, 6, 3, '#0a0a0a'),
  ]
}

export function legsLayer(height: number, color: string): PixelLayer {
  const legHeights = [6, 8, 10]
  const h = legHeights[height] ?? 8
  const y = 43 - h
  return [
    r(6, y, 4, h, color),
    r(14, y, 4, h, color),
  ]
}

export function neckLayer(skin: string): PixelLayer {
  return [r(10, 19, 4, 4, skin)]
}
```

- [x] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- pixelSprites --run
```

Expected: PASS (7 tests).

- [x] **Step 5: Commit**

```bash
git add src/components/scene/pixelSprites.ts src/components/scene/__tests__/pixelSprites.test.ts
git commit -m "feat: pixel art sprite types, palette constants, and base layers"
```

---

## Task 2: Head and hair layers

**Files:**
- Modify: `src/components/scene/pixelSprites.ts`
- Modify: `src/components/scene/__tests__/pixelSprites.test.ts`

- [x] **Step 1: Write failing tests**

Append to the `describe` block in `pixelSprites.test.ts`:

```typescript
import {
  shadowLayer, shoesLayer, legsLayer, neckLayer,
  headLayer, hairLayer,
  SKIN_TONES, HAIR_COLORS, CLOTHING_COLORS,
} from '../pixelSprites'

// inside describe block, add:
it('headLayer uses skin color', () => {
  headLayer('#ff0000').forEach(r => {
    if (r.color !== '#1a0f0a' && r.color !== 'white' && r.color !== '#8b4513' && r.color !== '#c07040') {
      expect(r.color).toBe('#ff0000')
    }
  })
})

it('hairLayer styles 0–4 return in-bounds rects', () => {
  for (let s = 0; s < 5; s++) {
    hairLayer(s, '#000').forEach(r => expect(inBounds(r)).toBe(true))
  }
})

it('hairLayer style 3 (bald) returns empty layer', () => {
  expect(hairLayer(3, '#000')).toHaveLength(0)
})
```

- [x] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- pixelSprites --run
```

Expected: FAIL — `headLayer` and `hairLayer` not exported.

- [x] **Step 3: Implement head and hair layers**

Append to `pixelSprites.ts`:

```typescript
export function headLayer(skin: string): PixelLayer {
  return [
    // head shape
    r(7, 9, 10, 11, skin),
    // eyes
    r(9, 13, 2, 2, '#1a0f0a'),
    r(13, 13, 2, 2, '#1a0f0a'),
    // eye highlights
    r(10, 13, 1, 1, 'white'),
    r(14, 13, 1, 1, 'white'),
    // nose
    r(11, 16, 2, 1, '#c07040'),
    // mouth
    r(9, 18, 2, 1, '#8b4513'),
    r(11, 19, 2, 1, '#8b4513'),
    r(13, 18, 2, 1, '#8b4513'),
  ]
}

export function hairLayer(style: number, color: string): PixelLayer {
  switch (style) {
    case 0: // short
      return [
        r(6, 5, 12, 5, color),  // top
        r(5, 8, 2, 3, color),   // left side
        r(17, 8, 2, 3, color),  // right side
      ]
    case 1: // long
      return [
        r(6, 5, 12, 5, color),
        r(5, 8, 2, 14, color),
        r(17, 8, 2, 14, color),
      ]
    case 2: // curly
      return [
        r(5, 4, 14, 7, color),
        r(4, 6, 2, 5, color),
        r(18, 6, 2, 5, color),
        r(7, 3, 10, 3, color),
      ]
    case 3: // bald
      return []
    case 4: // bun
      return [
        r(6, 6, 12, 5, color),
        r(9, 2, 6, 5, color),   // bun top
      ]
    default:
      return []
  }
}
```

- [x] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- pixelSprites --run
```

Expected: PASS (all tests).

- [x] **Step 5: Commit**

```bash
git add src/components/scene/pixelSprites.ts src/components/scene/__tests__/pixelSprites.test.ts
git commit -m "feat: pixel art head and hair layers"
```

---

## Task 3: Clothing and legs-color layers

**Files:**
- Modify: `src/components/scene/pixelSprites.ts`
- Modify: `src/components/scene/__tests__/pixelSprites.test.ts`

- [x] **Step 1: Write failing tests**

Append to the `describe` block:

```typescript
import { ..., clothingLayer } from '../pixelSprites'

it('clothingLayer styles 0–3 return in-bounds rects', () => {
  for (let s = 0; s < 4; s++) {
    clothingLayer(s, '#c0392b').forEach(r => expect(inBounds(r)).toBe(true))
  }
})

it('clothingLayer style 0 includes gold buttons (#d4af37)', () => {
  const layer = clothingLayer(0, '#141414')
  expect(layer.some(r => r.color === '#d4af37')).toBe(true)
})

it('clothingLayer style 2 (dress) produces more rects than style 1 (shirt)', () => {
  expect(clothingLayer(2, '#c0392b').length).toBeGreaterThan(clothingLayer(1, '#c0392b').length)
})
```

- [x] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- pixelSprites --run
```

Expected: FAIL — `clothingLayer` not exported.

- [x] **Step 3: Implement clothing layer**

Append to `pixelSprites.ts`:

```typescript
export function clothingLayer(style: number, color: string): PixelLayer {
  switch (style) {
    case 0: { // formal jacket (black, white shirt front, gold buttons)
      return [
        r(4, 22, 16, 14, '#141414'),    // jacket body
        r(10, 22, 4, 14, '#f0f0f0'),    // shirt front
        r(4, 22, 5, 9, '#141414'),      // left lapel shadow
        r(15, 22, 5, 9, '#141414'),     // right lapel shadow
        r(11, 26, 2, 2, '#d4af37'),     // button 1
        r(11, 30, 2, 2, '#d4af37'),     // button 2
        r(4, 22, 3, 22, '#141414'),     // left arm
        r(17, 22, 3, 22, '#141414'),    // right arm
      ]
    }
    case 1: { // casual shirt
      return [
        r(4, 22, 16, 14, color),
        r(10, 22, 4, 14, '#f8f8f8'),
        r(4, 22, 3, 20, color),
        r(17, 22, 3, 20, color),
      ]
    }
    case 2: { // dress (no separate legs)
      return [
        r(5, 22, 14, 10, color),        // bodice
        r(3, 30, 18, 14, color),        // skirt flares out
        r(4, 22, 3, 10, color),         // left sleeve
        r(17, 22, 3, 10, color),        // right sleeve
      ]
    }
    case 3: { // smart-casual blazer
      return [
        r(4, 22, 16, 14, color),
        r(10, 22, 4, 14, '#f0f0f0'),
        r(4, 22, 4, 8, color),
        r(16, 22, 4, 8, color),
        r(4, 22, 3, 20, color),
        r(17, 22, 3, 20, color),
      ]
    }
    default:
      return []
  }
}
```

- [x] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- pixelSprites --run
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/scene/pixelSprites.ts src/components/scene/__tests__/pixelSprites.test.ts
git commit -m "feat: pixel art clothing layers (jacket, casual, dress, blazer)"
```

---

## Task 4: Accessory layers (VIP + banned)

**Files:**
- Modify: `src/components/scene/pixelSprites.ts`
- Modify: `src/components/scene/__tests__/pixelSprites.test.ts`

- [x] **Step 1: Write failing tests**

Append to the `describe` block:

```typescript
import { ..., hatLayer, facialHairLayer, neckwearLayer, glassesLayer, eyebrowsLayer } from '../pixelSprites'

it('hatLayer styles 0–2 return in-bounds rects', () => {
  for (let s = 0; s < 3; s++) {
    hatLayer(s).forEach(r => expect(inBounds(r)).toBe(true))
  }
})

it('neckwearLayer style 3 (long red tie) extends lower than style 0 (short tie)', () => {
  const bottomY = (layer: PixelLayer) => Math.max(...layer.map(r => r.y + r.h))
  expect(bottomY(neckwearLayer(3))).toBeGreaterThan(bottomY(neckwearLayer(0)))
})

it('glassesLayer styles 0–1 return in-bounds rects', () => {
  for (let s = 0; s < 2; s++) {
    glassesLayer(s).forEach(r => expect(inBounds(r)).toBe(true))
  }
})

it('eyebrowsLayer returns in-bounds rects for both styles', () => {
  for (let s = 0; s < 2; s++) {
    eyebrowsLayer(s, '#000').forEach(r => expect(inBounds(r)).toBe(true))
  }
})
```

- [x] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- pixelSprites --run
```

Expected: FAIL — accessory functions not exported.

- [x] **Step 3: Implement accessory layers**

Append to `pixelSprites.ts`:

```typescript
export function hatLayer(style: number): PixelLayer {
  switch (style) {
    case 0: { // top hat
      return [
        r(4, 1, 16, 1, '#0a0a0a'),   // brim
        r(7, -4, 10, 6, '#111111'),  // Note: may render above canvas if hat is on — caller offsets
        // Use y=0 as minimum; the hat "pushes" the character sprite down by 6px
        r(7, 0, 10, 7, '#111111'),   // cylinder (sits at top of canvas when head is offset)
        r(4, 6, 16, 2, '#0a0a0a'),   // brim overlap
        r(7, 5, 10, 2, '#d4af37'),   // gold band
      ]
    }
    case 1: { // beret
      return [
        r(5, 2, 14, 5, '#8B0000'),
        r(4, 4, 16, 3, '#8B0000'),
        r(16, 3, 3, 2, '#6b0000'),   // slouch detail
      ]
    }
    case 2: { // chef's toque
      return [
        r(7, 0, 10, 9, 'white'),     // puff
        r(6, 7, 12, 3, '#dddddd'),   // band
        r(5, 9, 14, 2, '#cccccc'),   // brim
      ]
    }
    default:
      return []
  }
}

export function facialHairLayer(style: number, color: string): PixelLayer {
  switch (style) {
    case 0: { // curled moustache
      return [
        r(8, 17, 8, 2, color),
        r(8, 16, 2, 2, color),
        r(14, 16, 2, 2, color),
        r(7, 18, 2, 1, color),   // left curl
        r(15, 18, 2, 1, color),  // right curl
      ]
    }
    case 1: { // full beard
      return [
        r(7, 17, 10, 6, color),
        r(8, 22, 8, 4, color),
        r(9, 25, 6, 2, color),
      ]
    }
    default:
      return []
  }
}

export function neckwearLayer(style: number): PixelLayer {
  switch (style) {
    case 0: { // red tie (short)
      return [
        r(10, 22, 4, 3, '#e74c3c'),  // knot
        r(11, 25, 2, 10, '#c0392b'), // blade
        r(10, 34, 4, 3, '#c0392b'),  // tip
      ]
    }
    case 1: { // gold cravat
      return [
        r(9, 22, 6, 5, '#d4af37'),
        r(10, 26, 4, 2, '#b8960c'),
        r(11, 22, 2, 6, '#b8960c'),
      ]
    }
    case 2: { // red scarf
      return [
        r(8, 22, 8, 4, '#c0392b'),
        r(7, 25, 3, 10, '#c0392b'),   // left tail
        r(14, 25, 3, 8, '#c0392b'),   // right tail
      ]
    }
    case 3: { // long red tie (extends to knees)
      return [
        r(10, 22, 4, 3, '#e74c3c'),  // knot
        r(11, 25, 2, 16, '#c0392b'), // very long blade
        r(10, 40, 4, 3, '#c0392b'),  // tip
      ]
    }
    default:
      return []
  }
}

export function glassesLayer(style: number): PixelLayer {
  switch (style) {
    case 0: { // wire-frame round
      return [
        // left lens outline
        r(7, 12, 5, 1, '#2a2a2a'), r(7, 16, 5, 1, '#2a2a2a'),
        r(7, 13, 1, 3, '#2a2a2a'), r(11, 13, 1, 3, '#2a2a2a'),
        // bridge
        r(12, 14, 2, 1, '#2a2a2a'),
        // right lens outline
        r(14, 12, 5, 1, '#2a2a2a'), r(14, 16, 5, 1, '#2a2a2a'),
        r(14, 13, 1, 3, '#2a2a2a'), r(18, 13, 1, 3, '#2a2a2a'),
        // arms
        r(6, 13, 1, 2, '#2a2a2a'),
        r(19, 13, 1, 2, '#2a2a2a'),
      ]
    }
    case 1: { // oversized sunglasses
      return [
        r(5, 12, 14, 6, 'rgba(0,180,200,0.35)'),  // tinted lens fill
        r(5, 12, 14, 1, '#444'),   // top rim
        r(5, 17, 14, 1, '#444'),   // bottom rim
        r(5, 12, 1, 6, '#444'),    // left outer
        r(18, 12, 1, 6, '#444'),   // right outer
        r(11, 14, 2, 2, '#444'),   // bridge
        r(4, 13, 1, 2, '#333'),    // left arm
        r(19, 13, 1, 2, '#333'),   // right arm
      ]
    }
    default:
      return []
  }
}

export function eyebrowsLayer(style: number, skinColor: string): PixelLayer {
  switch (style) {
    case 0: { // heavy furrowed
      return [
        r(7, 11, 5, 2, '#1a0f0a'),   // left brow (thick, angled in)
        r(12, 11, 5, 2, '#1a0f0a'),  // right brow
        r(10, 10, 2, 1, '#1a0f0a'),  // inner furrowed peak left
        r(12, 10, 2, 1, '#1a0f0a'),  // inner furrowed peak right
      ]
    }
    case 1: { // droopy half-closed (drunk)
      return [
        // Cover upper half of eyes with skin-toned droopy lids
        r(9, 13, 2, 2, skinColor),   // left lid drooping
        r(13, 13, 2, 2, skinColor),  // right lid drooping
        r(8, 12, 4, 1, '#4a2c17'),   // left brow sagging
        r(12, 12, 4, 1, '#4a2c17'),  // right brow sagging
      ]
    }
    default:
      return []
  }
}
```

- [x] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- pixelSprites --run
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/scene/pixelSprites.ts src/components/scene/__tests__/pixelSprites.test.ts
git commit -m "feat: pixel art accessory layers — hats, facial hair, neckwear, glasses, eyebrows"
```

---

## Task 5: Pixel renderer and buildCustomerLayers

**Files:**
- Create: `src/components/scene/pixelRenderer.ts`
- Create: `src/components/scene/__tests__/pixelRenderer.test.ts`

- [x] **Step 1: Write failing tests**

```typescript
// src/components/scene/__tests__/pixelRenderer.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderSprite, buildCustomerLayers } from '../pixelRenderer'
import type { PixelLayer } from '../pixelSprites'
import type { VisualTraits } from '../../../types'

function mockCtx() {
  return { fillStyle: '', fillRect: vi.fn() } as unknown as CanvasRenderingContext2D
}

const baseTrait: VisualTraits = {
  skinTone: 0, hairStyle: 0, hairColor: 0,
  clothingStyle: 0, clothingColor: 0, height: 1,
}

describe('renderSprite', () => {
  it('calls fillRect for every rect in every layer', () => {
    const ctx = mockCtx()
    const layers: PixelLayer[] = [
      [{ x: 0, y: 0, w: 2, h: 2, color: '#ff0000' }],
      [{ x: 4, y: 4, w: 1, h: 1, color: '#00ff00' }],
    ]
    renderSprite(layers, ctx)
    expect(ctx.fillRect).toHaveBeenCalledTimes(2)
  })

  it('sets fillStyle before each fillRect call', () => {
    const ctx = mockCtx()
    const layers: PixelLayer[] = [[{ x: 0, y: 0, w: 1, h: 1, color: '#abcdef' }]]
    renderSprite(layers, ctx)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1, 1)
  })
})

describe('buildCustomerLayers', () => {
  it('returns an array of layers for all base traits', () => {
    const layers = buildCustomerLayers(baseTrait)
    expect(layers.length).toBeGreaterThan(0)
  })

  it('includes VIP accessories when traits include hat', () => {
    const vipTrait: VisualTraits = { ...baseTrait, hat: 0 }
    const layers = buildCustomerLayers(vipTrait)
    expect(layers.length).toBeGreaterThan(buildCustomerLayers(baseTrait).length)
  })

  it('includes banned accessories when traits include glasses', () => {
    const bannedTrait: VisualTraits = { ...baseTrait, glasses: 1 }
    const layers = buildCustomerLayers(bannedTrait)
    expect(layers.length).toBeGreaterThan(buildCustomerLayers(baseTrait).length)
  })

  it('does not throw for any valid trait combination', () => {
    for (let skinTone = 0; skinTone < 5; skinTone++) {
      for (let hairStyle = 0; hairStyle < 5; hairStyle++) {
        for (let clothingStyle = 0; clothingStyle < 4; clothingStyle++) {
          expect(() => buildCustomerLayers({
            ...baseTrait, skinTone, hairStyle, clothingStyle,
          })).not.toThrow()
        }
      }
    }
  })
})
```

- [x] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- pixelRenderer --run
```

Expected: FAIL — module not found.

- [x] **Step 3: Implement pixelRenderer.ts**

```typescript
// src/components/scene/pixelRenderer.ts
import type { VisualTraits } from '../../types'
import {
  type PixelLayer,
  SKIN_TONES, HAIR_COLORS, CLOTHING_COLORS,
  shadowLayer, shoesLayer, legsLayer, neckLayer,
  headLayer, hairLayer, clothingLayer,
  hatLayer, facialHairLayer, neckwearLayer,
  glassesLayer, eyebrowsLayer,
} from './pixelSprites'

export function renderSprite(layers: PixelLayer[], ctx: CanvasRenderingContext2D): void {
  for (const layer of layers) {
    for (const rect of layer) {
      ctx.fillStyle = rect.color
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }
  }
}

export function buildCustomerLayers(traits: VisualTraits): PixelLayer[] {
  const skin    = SKIN_TONES[traits.skinTone]
  const hair    = HAIR_COLORS[traits.hairColor]
  const clothes = CLOTHING_COLORS[traits.clothingColor]
  const pantsColor = traits.clothingStyle === 0 ? '#2c3e50' : '#1a0f0a'

  const layers: PixelLayer[] = [
    shadowLayer(),
    legsLayer(traits.height, pantsColor),
    clothingLayer(traits.clothingStyle, clothes),
    shoesLayer(),   // drawn after clothing so jacket arms don't overdraw shoes
    neckLayer(skin),
    headLayer(skin),
    hairLayer(traits.hairStyle, hair),
  ]

  // VIP accessories
  if (traits.hat !== undefined)        layers.push(hatLayer(traits.hat))
  if (traits.facialHair !== undefined) layers.push(facialHairLayer(traits.facialHair, hair))
  if (traits.neckwear !== undefined)   layers.push(neckwearLayer(traits.neckwear))

  // Banned accessories (drawn after head so they overlay it)
  if (traits.eyebrows !== undefined)   layers.push(eyebrowsLayer(traits.eyebrows, skin))
  if (traits.glasses !== undefined)    layers.push(glassesLayer(traits.glasses))

  return layers
}
```

- [x] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- pixelRenderer --run
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/scene/pixelRenderer.ts src/components/scene/__tests__/pixelRenderer.test.ts
git commit -m "feat: pixel art renderer and buildCustomerLayers"
```

---

## Task 6: PixelAvatar React component

**Files:**
- Create: `src/components/scene/PixelAvatar.tsx`

- [x] **Step 1: Create PixelAvatar.tsx**

```tsx
// src/components/scene/PixelAvatar.tsx
import React, { useRef, useEffect } from 'react'
import type { VisualTraits } from '../../types'
import { buildCustomerLayers } from './pixelRenderer'
import { renderSprite } from './pixelRenderer'

const SPRITE_W = 24
const SPRITE_H = 48

interface PixelAvatarProps {
  traits: VisualTraits
  animState?: 'entrance' | 'accused' | 'refused' | null
  onAnimationComplete?: () => void
  scale?: number
}

const KEYFRAMES = `
@keyframes pa-entrance {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
@keyframes pa-accused {
  0%   { transform: translateX(0); }
  15%  { transform: translateX(-4px); }
  30%  { transform: translateX(4px); }
  45%  { transform: translateX(-3px); }
  60%  { transform: translateX(3px); }
  75%  { transform: translateX(-2px); }
  100% { transform: translateX(0); }
}
@keyframes pa-refused {
  from { transform: translateY(0);    opacity: 1;   }
  to   { transform: translateY(10px); opacity: 0.4; }
}
`

let styleInjected = false
function injectKeyframes() {
  if (styleInjected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.textContent = KEYFRAMES
  document.head.appendChild(el)
  styleInjected = true
}

export const PixelAvatar: React.FC<PixelAvatarProps> = ({
  traits,
  animState,
  onAnimationComplete,
  scale = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  injectKeyframes()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H)
    renderSprite(buildCustomerLayers(traits), ctx)
  }, [traits])

  const animStyle: React.CSSProperties = animState === 'entrance'
    ? { animation: 'pa-entrance 0.3s ease-out forwards' }
    : animState === 'accused'
    ? { animation: 'pa-accused 0.4s ease-in-out forwards' }
    : animState === 'refused'
    ? { animation: 'pa-refused 0.3s ease-in forwards' }
    : {}

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_W}
      height={SPRITE_H}
      style={{
        width: SPRITE_W * scale,
        height: SPRITE_H * scale,
        imageRendering: 'pixelated',
        ...animStyle,
      }}
      onAnimationEnd={animState ? onAnimationComplete : undefined}
    />
  )
}
```

- [x] **Step 2: Start dev server and visually confirm the component renders**

```bash
npm run dev
```

Open http://localhost:3000. Navigate to the game's desk scene. If `ClientAvatar` is still in use, the visual change won't be visible yet — that's expected. Confirm dev server starts without errors.

- [x] **Step 3: Commit**

```bash
git add src/components/scene/PixelAvatar.tsx
git commit -m "feat: PixelAvatar canvas component with entrance/accused/refused CSS animations"
```

---

## Task 7: PixelMaitreD React component

**Files:**
- Create: `src/components/scene/PixelMaitreD.tsx`

- [x] **Step 1: Create PixelMaitreD.tsx**

```tsx
// src/components/scene/PixelMaitreD.tsx
import React, { useRef, useEffect, useState } from 'react'
import { renderSprite } from './pixelRenderer'
import type { PixelLayer } from './pixelSprites'

const SPRITE_W = 24
const SPRITE_H = 48

// Maître D' skin / palette constants
const SKIN = '#d4956a'
const HAIR = '#2d1b00'
const JACKET = '#0f1923'
const BOWTIE = '#7b1c2e'
const SHIRT = '#f0f0f0'
const GOLD = '#d4af37'
const SHOES = '#2d1b00'

function buildIdleLayers(): PixelLayer[] {
  return [
    // shadow
    [{ x: 4, y: 46, w: 16, h: 2, color: 'rgba(0,0,0,0.3)' }],
    // shoes
    [{ x: 4, y: 43, w: 6, h: 3, color: SHOES }, { x: 14, y: 43, w: 6, h: 3, color: SHOES }],
    // legs
    [{ x: 6, y: 35, w: 4, h: 8, color: JACKET }, { x: 14, y: 35, w: 4, h: 8, color: JACKET }],
    // arms (at sides)
    [{ x: 2, y: 22, w: 3, h: 18, color: JACKET }, { x: 19, y: 22, w: 3, h: 18, color: JACKET }],
    // hands
    [{ x: 2, y: 38, w: 3, h: 3, color: SKIN }, { x: 19, y: 38, w: 3, h: 3, color: SKIN }],
    // jacket body
    [{ x: 5, y: 22, w: 14, h: 14, color: JACKET }],
    // shirt front
    [{ x: 10, y: 22, w: 4, h: 14, color: SHIRT }],
    // bow tie
    [
      { x: 8, y: 22, w: 3, h: 4, color: BOWTIE },
      { x: 13, y: 22, w: 3, h: 4, color: BOWTIE },
      { x: 11, y: 23, w: 2, h: 3, color: '#5a1420' },
    ],
    // gold buttons
    [{ x: 11, y: 27, w: 2, h: 2, color: GOLD }, { x: 11, y: 31, w: 2, h: 2, color: GOLD }],
    // pocket square
    [{ x: 6, y: 23, w: 3, h: 3, color: BOWTIE }],
    // neck
    [{ x: 10, y: 19, w: 4, h: 4, color: SKIN }],
    // head
    [
      { x: 7, y: 9, w: 10, h: 11, color: SKIN },
      { x: 9, y: 13, w: 2, h: 2, color: '#1a0f0a' },
      { x: 13, y: 13, w: 2, h: 2, color: '#1a0f0a' },
      { x: 10, y: 13, w: 1, h: 1, color: 'white' },
      { x: 14, y: 13, w: 1, h: 1, color: 'white' },
      // stern mouth
      { x: 9, y: 18, w: 6, h: 1, color: '#6b3020' },
      // small moustache
      { x: 10, y: 17, w: 4, h: 1, color: HAIR },
    ],
    // hair (slicked back)
    [
      { x: 6, y: 5, w: 12, h: 5, color: HAIR },
      { x: 5, y: 8, w: 2, h: 3, color: HAIR },
      { x: 17, y: 8, w: 2, h: 3, color: HAIR },
    ],
    // eyebrows
    [
      { x: 8, y: 11, w: 4, h: 1, color: HAIR },
      { x: 12, y: 11, w: 4, h: 1, color: HAIR },
    ],
  ]
}

function buildBowLayers(): PixelLayer[] {
  // Bowing: shift body forward (x-2), head drops to y+4
  return [
    [{ x: 4, y: 46, w: 16, h: 2, color: 'rgba(0,0,0,0.3)' }],
    [{ x: 4, y: 43, w: 6, h: 3, color: SHOES }, { x: 14, y: 43, w: 6, h: 3, color: SHOES }],
    [{ x: 6, y: 35, w: 4, h: 8, color: JACKET }, { x: 14, y: 35, w: 4, h: 8, color: JACKET }],
    // arms forward
    [{ x: 1, y: 24, w: 4, h: 14, color: JACKET }, { x: 19, y: 24, w: 4, h: 14, color: JACKET }],
    [{ x: 1, y: 36, w: 4, h: 3, color: SKIN }, { x: 19, y: 36, w: 4, h: 3, color: SKIN }],
    [{ x: 4, y: 24, w: 16, h: 14, color: JACKET }],
    [{ x: 10, y: 24, w: 4, h: 14, color: SHIRT }],
    [
      { x: 8, y: 24, w: 3, h: 4, color: BOWTIE },
      { x: 13, y: 24, w: 3, h: 4, color: BOWTIE },
      { x: 11, y: 25, w: 2, h: 3, color: '#5a1420' },
    ],
    // neck + head tilted forward (y shifted +4)
    [{ x: 10, y: 23, w: 4, h: 4, color: SKIN }],
    [
      { x: 6, y: 13, w: 10, h: 11, color: SKIN },
      // eyes closed (bow)
      { x: 8, y: 17, w: 4, h: 1, color: '#1a0f0a' },
      { x: 14, y: 17, w: 4, h: 1, color: '#1a0f0a' },
      // slight smile
      { x: 9, y: 21, w: 6, h: 1, color: '#8b4513' },
    ],
    [
      { x: 5, y: 9, w: 12, h: 5, color: HAIR },
      { x: 4, y: 12, w: 2, h: 3, color: HAIR },
      { x: 16, y: 12, w: 2, h: 3, color: HAIR },
    ],
  ]
}

function buildStopLayers(): PixelLayer[] {
  return [
    [{ x: 4, y: 46, w: 16, h: 2, color: 'rgba(0,0,0,0.3)' }],
    [{ x: 4, y: 43, w: 6, h: 3, color: SHOES }, { x: 14, y: 43, w: 6, h: 3, color: SHOES }],
    [{ x: 6, y: 35, w: 4, h: 8, color: JACKET }, { x: 14, y: 35, w: 4, h: 8, color: JACKET }],
    // arms raised
    [{ x: 0, y: 14, w: 4, h: 14, color: JACKET }, { x: 20, y: 14, w: 4, h: 14, color: JACKET }],
    // palms (hands up)
    [{ x: 0, y: 12, w: 4, h: 4, color: SKIN }, { x: 20, y: 12, w: 4, h: 4, color: SKIN }],
    [{ x: 5, y: 22, w: 14, h: 14, color: JACKET }],
    [{ x: 10, y: 22, w: 4, h: 14, color: SHIRT }],
    [
      { x: 8, y: 22, w: 3, h: 4, color: BOWTIE },
      { x: 13, y: 22, w: 3, h: 4, color: BOWTIE },
      { x: 11, y: 23, w: 2, h: 3, color: '#5a1420' },
    ],
    [{ x: 10, y: 19, w: 4, h: 4, color: SKIN }],
    [
      { x: 7, y: 9, w: 10, h: 11, color: SKIN },
      // wide eyes
      { x: 8, y: 13, w: 3, h: 2, color: '#1a0f0a' },
      { x: 13, y: 13, w: 3, h: 2, color: '#1a0f0a' },
      // raised brows
      { x: 8, y: 10, w: 4, h: 1, color: HAIR },
      { x: 12, y: 10, w: 4, h: 1, color: HAIR },
      // stern flat mouth
      { x: 9, y: 18, w: 6, h: 1, color: '#6b3020' },
    ],
    [
      { x: 6, y: 5, w: 12, h: 5, color: HAIR },
      { x: 5, y: 8, w: 2, h: 3, color: HAIR },
      { x: 17, y: 8, w: 2, h: 3, color: HAIR },
    ],
  ]
}

function buildShrugLayers(): PixelLayer[] {
  // Same raised-arms pose as stop, but softer expression
  return [
    ...buildStopLayers().slice(0, -1), // reuse stop, override head layer
    [
      { x: 7, y: 9, w: 10, h: 11, color: SKIN },
      { x: 9, y: 13, w: 2, h: 2, color: '#1a0f0a' },
      { x: 13, y: 13, w: 2, h: 2, color: '#1a0f0a' },
      // raised brows (softer)
      { x: 9, y: 11, w: 3, h: 1, color: HAIR },
      { x: 12, y: 11, w: 3, h: 1, color: HAIR },
      // curved "what can I do" mouth
      { x: 9, y: 18, w: 2, h: 1, color: '#8b4513' },
      { x: 11, y: 19, w: 2, h: 1, color: '#8b4513' },
      { x: 13, y: 18, w: 2, h: 1, color: '#8b4513' },
    ],
  ]
}

const PULSE_KEYFRAMES = `
@keyframes md-pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.04); }
  100% { transform: scale(1); }
}
`

let mdStyleInjected = false
function injectMdKeyframes() {
  if (mdStyleInjected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.textContent = PULSE_KEYFRAMES
  document.head.appendChild(el)
  mdStyleInjected = true
}

interface PixelMaitreDProps {
  animState?: 'bow' | 'stop' | 'shrug' | null
  onAnimationComplete?: () => void
  scale?: number
}

export const PixelMaitreD: React.FC<PixelMaitreDProps> = ({
  animState,
  onAnimationComplete,
  scale = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pulse, setPulse] = useState(false)

  injectMdKeyframes()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H)

    let layers: PixelLayer[]
    if (animState === 'bow')   layers = buildBowLayers()
    else if (animState === 'stop')  layers = buildStopLayers()
    else if (animState === 'shrug') layers = buildShrugLayers()
    else                            layers = buildIdleLayers()

    renderSprite(layers, ctx)
    setPulse(true)
  }, [animState])

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_W}
      height={SPRITE_H}
      style={{
        width: SPRITE_W * scale,
        height: SPRITE_H * scale,
        imageRendering: 'pixelated',
        animation: pulse ? 'md-pulse 0.15s ease-in-out' : undefined,
      }}
      onAnimationEnd={() => {
        setPulse(false)
        onAnimationComplete?.()
      }}
    />
  )
}
```

- [x] **Step 2: Run full test suite**

```bash
npm run test --run
```

Expected: All existing tests pass. No new failures.

- [x] **Step 4: Commit**

```bash
git add src/components/scene/PixelMaitreD.tsx src/components/scene/pixelSprites.ts
git commit -m "feat: PixelMaitreD canvas component with idle/bow/stop/shrug states"
```

---

## Task 8: Migrate DeskScene

**Files:**
- Modify: `src/components/scene/DeskScene.tsx`

- [x] **Step 1: Update imports in DeskScene.tsx**

Find and replace the two avatar imports at the top of `DeskScene.tsx`:

```typescript
// Remove:
import { ClientAvatar } from "./ClientAvatar";
import { MaitreDAvatar } from "./MaitreDAvatar";

// Add:
import { PixelAvatar } from "./PixelAvatar";
import { PixelMaitreD } from "./PixelMaitreD";
```

- [x] **Step 2: Replace MaitreDAvatar usage**

Find `<MaitreDAvatar` in `DeskScene.tsx` (line ~239) and replace:

```tsx
// Before:
<MaitreDAvatar
  animState={maitreDAnimState}
  onAnimationComplete={() => setMaitreDAnimState(null)}
/>

// After:
<PixelMaitreD
  animState={maitreDAnimState}
  onAnimationComplete={() => setMaitreDAnimState(null)}
  scale={3}
/>
```

- [x] **Step 3: Replace ClientAvatar usage — desk client (line ~295)**

```tsx
// Before:
<ClientAvatar
  traits={i === 0 ? currentClient.visualTraits : seedTraits(currentClient.id, i)}
  animState={i === 0 ? guestAnimState : null}
  onAnimationComplete={i === 0 ? () => setGuestAnimState(null) : undefined}
/>

// After:
<PixelAvatar
  traits={i === 0 ? currentClient.visualTraits : seedTraits(currentClient.id, i)}
  animState={i === 0 ? guestAnimState : null}
  onAnimationComplete={i === 0 ? () => setGuestAnimState(null) : undefined}
  scale={3}
/>
```

- [x] **Step 4: Replace ClientAvatar usage — queue (line ~342)**

```tsx
// Before:
<ClientAvatar traits={c.visualTraits} />

// After:
<PixelAvatar traits={c.visualTraits} scale={1.5} />
```

- [x] **Step 5: Replace ClientAvatar usage — storm-out ghost (line ~363)**

```tsx
// Before:
<ClientAvatar traits={seedTraits("storm", 0)} />

// After:
<PixelAvatar traits={seedTraits("storm", 0)} scale={1.5} />
```

- [x] **Step 6: Start dev server and visually verify**

```bash
npm run dev
```

Open http://localhost:3000 and start a game. Confirm:
- Queue shows pixel art customers at queue size
- Desk scene shows pixel art customer (large) and maître d' (large)
- Maître D' bow/stop/shrug states trigger and animate
- Entrance animation plays on desk client arrival
- Storm-out ghost appears in queue

- [x] **Step 7: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: migrate DeskScene to PixelAvatar and PixelMaitreD"
```

---

## Task 9: Migrate Clipboard

**Files:**
- Modify: `src/components/desk/Clipboard.tsx`

- [x] **Step 1: Update import in Clipboard.tsx**

```typescript
// Remove:
import { ClientAvatar } from "../scene/ClientAvatar";

// Add:
import { PixelAvatar } from "../scene/PixelAvatar";
```

- [x] **Step 2: Replace ClientAvatar in VipDossierEntry (~line 71)**

```tsx
// Before:
<div className="w-full [&_svg]:w-full [&_svg]:h-auto">
  <ClientAvatar traits={char.visualTraits} />
</div>

// After:
<PixelAvatar traits={char.visualTraits} scale={1} />
```

- [x] **Step 3: Replace ClientAvatar in BannedDossierEntry (~line 159)**

```tsx
// Before:
<div className="w-full [&_svg]:w-full [&_svg]:h-auto">
  <ClientAvatar traits={char.visualTraits} />
</div>

// After:
<PixelAvatar traits={char.visualTraits} scale={1} />
```

- [x] **Step 4: Visually verify Clipboard**

Open the Clipboard panel (VIPs tab and Banned tab) during a game. Confirm pixel art portraits render correctly at 1× scale.

- [x] **Step 5: Commit**

```bash
git add src/components/desk/Clipboard.tsx
git commit -m "feat: migrate Clipboard dossiers to PixelAvatar"
```

---

## Task 10: Cleanup and final verification

**Files:**
- Delete: `src/components/scene/ClientAvatar.tsx`
- Delete: `src/components/scene/MaitreDAvatar.tsx`

- [x] **Step 1: Confirm no remaining usages of old components**

```bash
grep -r "ClientAvatar\|MaitreDAvatar" src/ --include="*.tsx" --include="*.ts"
```

Expected: Only the component definition files themselves appear. If any other files still import them, fix those imports before deleting.

- [x] **Step 2: Delete old components**

```bash
rm src/components/scene/ClientAvatar.tsx
rm src/components/scene/MaitreDAvatar.tsx
```

- [x] **Step 3: Run full test suite**

```bash
npm run test --run
```

Expected: All tests pass.

- [x] **Step 4: Run type check**

```bash
npm run lint
```

Expected: No errors.

- [x] **Step 5: Final visual check in dev**

```bash
npm run dev
```

Walk through a full game session:
- Queue populates with pixel art characters at `scale=1.5`
- Desk client renders at `scale=3` with entrance animation
- Accused animation plays on question/accusation
- Refused animation plays on refusal
- Maître D' bows on seating, raises hand on stop/shrug
- Clipboard VIP and Banned tabs show pixel art dossier portraits at `scale=1`

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove legacy SVG ClientAvatar and MaitreDAvatar"
```
