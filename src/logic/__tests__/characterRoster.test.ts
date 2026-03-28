import { describe, it, expect } from 'vitest';
import { createCharacter } from '../characters/factory';
import {
  CHARACTER_ROSTER,
  generateDailyCharacters,
  injectCharacterReservations,
} from '../characterRoster';
import { BypassQueueVip } from '../characters/BypassQueueVip';
import { AuraDrainVip } from '../characters/AuraDrainVip';
import { START_TIME } from '../../constants';

describe('createCharacter factory', () => {
  it('creates BypassQueueVip for BYPASS_QUEUE behaviorType', () => {
    const def = CHARACTER_ROSTER.find(c => c.id === 'the-syndicate')!;
    expect(createCharacter(def)).toBeInstanceOf(BypassQueueVip);
  });

  it('creates AuraDrainVip for AURA_DRAIN behaviorType', () => {
    const def = CHARACTER_ROSTER.find(c => c.id === 'manu-macaroon')!;
    expect(createCharacter(def)).toBeInstanceOf(AuraDrainVip);
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
