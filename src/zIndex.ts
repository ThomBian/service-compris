/**
 * Stacking order for fixed/absolute UI. Mute stays above toasts so it stays reachable.
 * Use with `style={{ zIndex: Z_INDEX.* }}` so values are not lost to Tailwind purging.
 */
export const Z_INDEX = {
  introBackdrop: 100,
  introChrome: 50,
  /** In-game Monsieur V. scripted dialogue overlay. */
  gameDialogue: 55,
  gameHeader: 20,
  /** Toasts (portal); content is pointer-events-none. */
  toast: 5000,
  /** Global mute — above toasts. */
  globalChrome: 6000,
} as const;
