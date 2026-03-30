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
