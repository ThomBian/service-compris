import type { CampaignPath } from '../types/campaign';

/** Segment under `campaign:nights.*` (e.g. `1`, `3.default`). */
export function campaignNightsKeySegment(
  nightNumber: number,
  path: CampaignPath,
): string {
  if (nightNumber <= 2) return String(nightNumber);
  return `${nightNumber}.${path}`;
}
