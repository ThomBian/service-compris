import { STORAGE_KEYS } from '@/src/storageKeys';

export const INTRO_SEEN_KEY = STORAGE_KEYS.introSeen;

export const SCREEN0_KEYS = [
  'screen0.p1',
  'screen0.p2',
  'screen0.p3',
  'screen0.p4',
  'screen0.p5',
] as const;

export const DIFFICULTY_VALUES = [0, 1, 2, 3] as const;

export const INTRO_CHAR_DELAY_MS = 12;
export const INTRO_JITTER_MS = 5;

export function readIntroSeen(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEYS.introSeen);
  } catch {
    return false;
  }
}
