import type { CharacterDefinition } from '../../types';
import type { SpecialCharacter } from './SpecialCharacter';
import { BypassQueueVip } from './BypassQueueVip';
import { AuraDrainVip } from './AuraDrainVip';
import { StandardVip } from './StandardVip';
import { StandardBanned } from './StandardBanned';

export function createCharacter(def: CharacterDefinition): SpecialCharacter {
  switch (def.behaviorType) {
    case 'BYPASS_QUEUE':    return new BypassQueueVip(def);
    case 'AURA_DRAIN':      return new AuraDrainVip(def);
    case 'STANDARD_VIP':    return new StandardVip(def);
    case 'STANDARD_BANNED': return new StandardBanned(def);
    default: throw new Error(`Unknown behaviorType: ${def.behaviorType}`);
  }
}
