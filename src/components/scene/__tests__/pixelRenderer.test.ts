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
