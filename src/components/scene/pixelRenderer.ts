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
    legsLayer(traits.height as 0 | 1 | 2, pantsColor),
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
