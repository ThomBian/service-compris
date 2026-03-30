import type { PixelRect } from '../pixelSprites'

export const SPRITE_W = 24
export const SPRITE_H = 48

export function inBounds(r: PixelRect): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= SPRITE_W && r.y + r.h <= SPRITE_H
}
