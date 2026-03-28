import type { ActiveRule, RuleKey } from '../types/campaign';

// Casts internally — call sites do not need type guards.
export function getRule<T>(rules: ActiveRule[], key: RuleKey, defaultValue: T): T {
  return (rules.find(r => r.key === key)?.value as T) ?? defaultValue;
}
