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
