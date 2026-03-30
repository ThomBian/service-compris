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

export function shoesLayer(color = '#0a0a0a'): PixelLayer {
  return [
    r(4, 43, 6, 3, color),
    r(14, 43, 6, 3, color),
  ]
}

export function legsLayer(height: 0 | 1 | 2, color: string): PixelLayer {
  const legHeights = [6, 8, 10]
  const h = legHeights[height]
  const y = 43 - h
  return [
    r(6, y, 4, h, color),
    r(14, y, 4, h, color),
  ]
}

export function neckLayer(skin: string): PixelLayer {
  return [r(10, 19, 4, 4, skin)]
}

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

export function clothingLayer(style: number, color: string): PixelLayer {
  switch (style) {
    case 0: { // formal jacket — always black; `color` param is intentionally unused
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
        r(8, 22, 8, 2, color),          // neckline trim
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

export function hatLayer(style: number): PixelLayer {
  switch (style) {
    case 0: { // top hat — sits at the top of the sprite canvas; head is offset down 6px when wearing
      return [
        r(4, 1, 16, 1, '#0a0a0a'),   // brim
        r(7, 0, 10, 7, '#111111'),   // cylinder
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
        r(7, 11, 5, 2, '#1a0f0a'),   // left brow
        r(12, 11, 5, 2, '#1a0f0a'),  // right brow
        r(10, 10, 2, 1, '#1a0f0a'),  // inner furrowed peak left
        r(12, 10, 2, 1, '#1a0f0a'),  // inner furrowed peak right
      ]
    }
    case 1: { // droopy half-closed (drunk)
      return [
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
