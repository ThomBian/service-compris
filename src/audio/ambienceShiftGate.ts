/** Blocks in-shift ambience (`useGameAmbience`) until intro exit fade + stop completes. */

let shiftAmbienceBlockedUntil = 0;

/** Mirrors the `setTimeout` window after `finishIntro` schedules rain/jazz stop. */
export const INTRO_EXIT_AMBIENCE_MS = 1600;

export function blockShiftAmbienceUntil(timestampMs: number): void {
  shiftAmbienceBlockedUntil = Math.max(shiftAmbienceBlockedUntil, timestampMs);
}

export function isShiftAmbienceBlocked(): boolean {
  return Date.now() < shiftAmbienceBlockedUntil;
}

export function getMsUntilShiftAmbienceUnblocked(): number {
  return Math.max(0, shiftAmbienceBlockedUntil - Date.now());
}
