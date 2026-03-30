import { describe, it, expect } from 'vitest'
import {
  shadowLayer, shoesLayer, legsLayer, neckLayer,
  headLayer, hairLayer,
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
})
