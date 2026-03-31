import { describe, it, expect } from 'vitest';
import { createCharacter } from '../characters/factory';
import {
  CHARACTER_ROSTER,
  generateDailyCharacters,
  injectCharacterReservations,
} from '../characterRoster';
import { BypassQueueVip } from '../characters/BypassQueueVip';
import { AuraDrainVip } from '../characters/AuraDrainVip';
import { OversizeVip } from '../characters/OversizeVip';
import { START_TIME, FACTION_BOOST, MAX_PATH_SCORE, SPAWN_PROBABILITY } from '../../constants';
import type { CharacterDefinition, GameState } from '../../types';
import type { PathScores } from '../../types/campaign';

describe('createCharacter factory', () => {
  it('creates BypassQueueVip for BYPASS_QUEUE behaviorType', () => {
    const def = CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')!;
    expect(createCharacter(def)).toBeInstanceOf(BypassQueueVip);
  });

  it('creates AuraDrainVip for AURA_DRAIN behaviorType', () => {
    const def = CHARACTER_ROSTER.find(c => c.id === 'manu-macaroon')!;
    expect(createCharacter(def)).toBeInstanceOf(AuraDrainVip);
  });

  it('creates OversizeVip for OVERSIZE_VIP behaviorType', () => {
    const mockDef = { ...CHARACTER_ROSTER[0], behaviorType: 'OVERSIZE_VIP' };
    expect(createCharacter(mockDef)).toBeInstanceOf(OversizeVip);
  });

  it('throws for unknown behaviorType', () => {
    const def = { ...CHARACTER_ROSTER[0], behaviorType: 'UNKNOWN' };
    expect(() => createCharacter(def)).toThrow();
  });
});

describe('CHARACTER_ROSTER', () => {
  it('contains the-syndicate and manu-macaroon', () => {
    const ids = CHARACTER_ROSTER.map(c => c.id);
    expect(ids).toContain('the-syndicate');
    expect(ids).toContain('manu-macaroon');
  });

  it('all entries have required fields', () => {
    CHARACTER_ROSTER.forEach(c => {
      expect(c.id).toBeTruthy();
      expect(c.role).toMatch(/^(VIP|BANNED)$/);
      expect(c.behaviorType).toBeTruthy();
      expect(c.visualTraits).toBeDefined();
      expect(c.clueText).toBeTruthy();
    });
  });

  it('no duplicate IDs', () => {
    const ids = CHARACTER_ROSTER.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains all 6 new lore characters', () => {
    const ids = CHARACTER_ROSTER.map(c => c.id);
    expect(ids).toContain('donny-tromp');
    expect(ids).toContain('gordon-angry');
    expect(ids).toContain('mr-feast');
    expect(ids).toContain('the-phantom-eater');
    expect(ids).toContain('chef-balzac');
    expect(ids).toContain('sodium-bae');
  });

  it('has n1-vip-actor in the roster', () => {
    const def = CHARACTER_ROSTER.find(c => c.id === 'n1-vip-actor');
    expect(def).toBeDefined();
    expect(def?.role).toBe('VIP');
  });

  it('has n1-phantom-eater-night1 in the roster', () => {
    const def = CHARACTER_ROSTER.find(c => c.id === 'n1-phantom-eater-night1');
    expect(def).toBeDefined();
    expect(def?.role).toBe('BANNED');
    expect(def?.arrivalMO).toBe('RESERVATION_ALIAS');
    expect(def?.aliasFirstName).toBe('Le');
    expect(def?.aliasLastName).toBe('Fantôme');
  });

  it('all faction-aligned characters have valid factionPath', () => {
    const factionChars = CHARACTER_ROSTER.filter(c => c.factionPath !== undefined);
    factionChars.forEach(c => {
      expect(['underworld', 'michelin', 'viral']).toContain(c.factionPath);
    });
  });

  it('the-syndicate and manu-macaroon are underworld', () => {
    expect(CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')?.factionPath).toBe('underworld');
    expect(CHARACTER_ROSTER.find(c => c.id === 'manu-macaroon')?.factionPath).toBe('underworld');
  });

  it('gordon-angry is michelin, mr-feast and sodium-bae are viral', () => {
    expect(CHARACTER_ROSTER.find(c => c.id === 'gordon-angry')?.factionPath).toBe('michelin');
    expect(CHARACTER_ROSTER.find(c => c.id === 'mr-feast')?.factionPath).toBe('viral');
    expect(CHARACTER_ROSTER.find(c => c.id === 'sodium-bae')?.factionPath).toBe('viral');
  });

  it('donny-tromp, the-phantom-eater, chef-balzac have no factionPath', () => {
    ['donny-tromp', 'the-phantom-eater', 'chef-balzac'].forEach(id => {
      const char = CHARACTER_ROSTER.find(c => c.id === id);
      expect(char).toBeDefined();
      expect(char!.factionPath).toBeUndefined();
    });
  });
});

describe('generateDailyCharacters', () => {
  it('returns empty array when difficulty is 0', () => {
    expect(generateDailyCharacters(0, CHARACTER_ROSTER)).toEqual([]);
  });

  it('returns empty array when roster is empty', () => {
    expect(generateDailyCharacters(2, [])).toEqual([]);
  });

  it('never returns duplicates across 50 runs', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyCharacters(2, CHARACTER_ROSTER);
      const ids = result.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('never returns more characters than roster size', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateDailyCharacters(3, CHARACTER_ROSTER);
      expect(result.length).toBeLessThanOrEqual(CHARACTER_ROSTER.length);
    }
  });
});

describe('generateDailyCharacters — faction spawn bias', () => {
  it('behaves identically to current when pathScores is omitted', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDailyCharacters(2, CHARACTER_ROSTER);
      expect(result.length).toBeLessThanOrEqual(CHARACTER_ROSTER.length);
      const ids = result.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('at max path score, faction characters spawn more often than base probability', () => {
    const maxScores: PathScores = { underworld: MAX_PATH_SCORE, michelin: 0, viral: 0 };
    const underworldChars = CHARACTER_ROSTER.filter(c => c.factionPath === 'underworld');
    const base = SPAWN_PROBABILITY[2]; // 0.7 at difficulty 2

    let totalSpawned = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const result = generateDailyCharacters(2, underworldChars, maxScores);
      totalSpawned += result.length;
    }
    const avgRate = totalSpawned / (runs * underworldChars.length);
    // At max score: p = min(0.95, 0.7 + 0.4) = 0.95 — expect average > base
    expect(avgRate).toBeGreaterThan(base);
  });

  it('returns empty array at difficulty 0 even with pathScores', () => {
    const scores: PathScores = { underworld: 10, michelin: 10, viral: 10 };
    expect(generateDailyCharacters(0, CHARACTER_ROSTER, scores)).toEqual([]);
  });

  it('never returns more characters than roster size with pathScores', () => {
    const scores: PathScores = { underworld: 10, michelin: 10, viral: 10 };
    for (let i = 0; i < 20; i++) {
      const result = generateDailyCharacters(3, CHARACTER_ROSTER, scores);
      expect(result.length).toBeLessThanOrEqual(CHARACTER_ROSTER.length);
    }
  });
});

describe('injectCharacterReservations', () => {
  it('injects a reservation for RESERVATION_ALIAS characters', () => {
    const macaroon = CHARACTER_ROSTER.find(c => c.id === 'manu-macaroon')!;
    const result = injectCharacterReservations([macaroon], []);
    const injected = result.find(r => r.id === 'char-res-manu-macaroon');
    expect(injected).toBeDefined();
    expect(injected!.firstName).toBe(macaroon.aliasFirstName);
    // reservedPartySize (2) used, not expectedPartySize (4) — this is the trap
    expect(injected!.partySize).toBe(macaroon.reservedPartySize);
    expect(injected!.partySize).toBe(2);
  });

  it('does not inject a reservation for WALK_IN characters', () => {
    const syndicate = CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')!;
    const result = injectCharacterReservations([syndicate], []);
    expect(result).toHaveLength(0);
  });

  it('does not inject a reservation for BYPASS characters', () => {
    const syndicate = CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')!;
    const result = injectCharacterReservations([syndicate], []);
    expect(result.find(r => r.id.includes('the-syndicate'))).toBeUndefined();
  });
});

describe('OversizeVip', () => {
  const def: Partial<CharacterDefinition> = {
    id: 'test-oversize',
    behaviorType: 'OVERSIZE_VIP',
    cashBonus: 300,
    ratingPenalty: 1.0,
    moralePenalty: 15,
  };
  const vip = new OversizeVip(def as CharacterDefinition);

  it('onSeated adds cashBonus to cash', () => {
    const result = vip.onSeated({ cash: 100 } as GameState);
    expect(result.cash).toBe(400);
  });

  it('onRefused applies ratingPenalty and moralePenalty', () => {
    const result = vip.onRefused({ cash: 100, rating: 4.0, morale: 80 } as GameState);
    expect(result.rating).toBe(3.0);
    expect(result.morale).toBe(65);
  });

  it('onRefused floors rating and morale at 0', () => {
    const result = vip.onRefused({ cash: 0, rating: 0.5, morale: 5 } as GameState);
    expect(result.rating).toBe(0);
    expect(result.morale).toBe(0);
  });

  it('onSeated returns unchanged cash when cashBonus is undefined', () => {
    const noBonusDef: Partial<CharacterDefinition> = { id: 'x', behaviorType: 'OVERSIZE_VIP' };
    const v = new OversizeVip(noBonusDef as CharacterDefinition);
    const result = v.onSeated({ cash: 100 } as GameState);
    expect(result.cash).toBe(100);
  });
});
