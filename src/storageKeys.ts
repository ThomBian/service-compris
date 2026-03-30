/** localStorage keys — single source of truth to avoid typos and ease refactors. */
export const STORAGE_KEYS = {
  introSeen: 'service-compris-intro-seen',
  tourSeen: 'service-compris-tour-seen',
  audioMuted: 'service-compris-audio-muted',
  i18nLang: 'service-compris-lang',
} as const;
