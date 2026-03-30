import { describe, it, expect } from 'vitest'
import {
  shadowLayer, shoesLayer, legsLayer, neckLayer,
  SKIN_TONES, HAIR_COLORS, CLOTHING_COLORS,
} from '../pixelSprites'
import type { PixelRect } from '../pixelSprites'
import { inBounds } from './testHelpers'

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
