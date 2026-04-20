import { describe, expect, it } from 'vitest';
import { bossIdToI18nGroup } from '../BossEncounterOutcome';

describe('bossIdToI18nGroup', () => {
  it('maps kebab-case roster ids to nested i18n keys', () => {
    expect(bossIdToI18nGroup('syndicate-don')).toBe('syndicateDon');
    expect(bossIdToI18nGroup('grand-inquisitor')).toBe('grandInquisitor');
    expect(bossIdToI18nGroup('influencer')).toBe('influencer');
    expect(bossIdToI18nGroup('aristocrat')).toBe('aristocrat');
  });
});
