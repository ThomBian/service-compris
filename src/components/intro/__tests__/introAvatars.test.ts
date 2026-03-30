import { describe, it, expect } from 'vitest';
import { INTRO_AVATARS } from '../introAvatars';
import type { VisualTraits } from '@/src/types';

const SKIN_MAX = 4;
const HAIR_STYLE_MAX = 4;
const HAIR_COLOR_MAX = 5;
const CLOTHING_STYLE_MAX = 3;
const CLOTHING_COLOR_MAX = 4;
const HEIGHT_MAX = 2;

function assertInRange(name: string, value: number, max: number) {
  expect(value, name).toBeGreaterThanOrEqual(0);
  expect(value, name).toBeLessThanOrEqual(max);
}

describe('INTRO_AVATARS', () => {
  it('exports exactly five presets', () => {
    expect(INTRO_AVATARS).toHaveLength(5);
  });

  it('each preset has required traits in valid ranges', () => {
    for (const traits of INTRO_AVATARS) {
      assertInRange('skinTone', traits.skinTone, SKIN_MAX);
      assertInRange('hairStyle', traits.hairStyle, HAIR_STYLE_MAX);
      assertInRange('hairColor', traits.hairColor, HAIR_COLOR_MAX);
      assertInRange('clothingStyle', traits.clothingStyle, CLOTHING_STYLE_MAX);
      assertInRange('clothingColor', traits.clothingColor, CLOTHING_COLOR_MAX);
      assertInRange('height', traits.height, HEIGHT_MAX);
    }
  });

  it('optional accessory fields are in valid ranges when present', () => {
    for (const traits of INTRO_AVATARS) {
      if (traits.hat !== undefined) {
        assertInRange('hat', traits.hat, 2);
      }
      if (traits.facialHair !== undefined) {
        assertInRange('facialHair', traits.facialHair, 1);
      }
      if (traits.neckwear !== undefined) {
        assertInRange('neckwear', traits.neckwear, 3);
      }
      if (traits.glasses !== undefined) {
        assertInRange('glasses', traits.glasses, 1);
      }
      if (traits.eyebrows !== undefined) {
        assertInRange('eyebrows', traits.eyebrows, 1);
      }
    }
  });

  it('matches the spec snapshot (exact trait objects)', () => {
    const expected: VisualTraits[] = [
      { skinTone: 0, hairStyle: 0, hairColor: 0, clothingStyle: 0, clothingColor: 0, height: 1 },
      { skinTone: 2, hairStyle: 1, hairColor: 2, clothingStyle: 2, clothingColor: 1, height: 1 },
      { skinTone: 1, hairStyle: 0, hairColor: 1, clothingStyle: 0, clothingColor: 2, height: 2, facialHair: 0 },
      { skinTone: 0, hairStyle: 0, hairColor: 3, clothingStyle: 0, clothingColor: 0, height: 1, glasses: 0 },
      { skinTone: 4, hairStyle: 2, hairColor: 4, clothingStyle: 1, clothingColor: 3, height: 0, eyebrows: 0 },
    ];
    expect(INTRO_AVATARS).toEqual(expected);
  });
});
