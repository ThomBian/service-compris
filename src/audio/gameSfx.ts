import { Howl, Howler } from 'howler';
import { TYPEWRITER_SOUND_MIN_MS } from '@/src/audio/audioConstants';

/** Matches `Toast['variant']` — keep in sync with `ToastContext`. */
export type ToastSoundVariant = 'success' | 'error' | 'warning' | 'info';
export type HandshakeItemSfx = 'LEDGER' | 'BELL' | 'COIN' | 'WHISKEY';

export interface GameToastSounds {
  success: Howl;
  error: Howl;
  warning: Howl;
  info: Howl;
}

/**
 * Files in `public/audio/shared` and `public/audio/boss` (URLs `/audio/...`).
 * Howler accepts wav / mp3 / ogg per clip; extensions must match the files on disk.
 */
const PATH = {
  success: '/audio/shared/toast/toast-success.wav',
  error: '/audio/shared/toast/toast-error.wav',
  warning: '/audio/shared/toast/toast-warning.ogg',
  info: '/audio/shared/toast/toast-info.wav',
} as const;

const HANDSHAKE_ITEM_PATH: Record<HandshakeItemSfx, string> = {
  LEDGER: '/audio/boss/handshake/ledger.wav',
  BELL: '/audio/boss/handshake/bell.wav',
  COIN: '/audio/boss/handshake/coin.wav',
  WHISKEY: '/audio/boss/handshake/whiskey.wav',
};

const devLoadErr =
  import.meta.env.DEV && typeof console !== 'undefined'
    ? (label: string) => (_id: number, err: unknown) =>
        console.error(`[gameSfx] load failed (${label}):`, err)
    : () => undefined;

export function createGameToastSounds(): GameToastSounds {
  return {
    success: new Howl({
      src: [PATH.success],
      volume: 0.42,
      preload: true,
      onloaderror: devLoadErr('toast-success'),
    }),
    error: new Howl({
      src: [PATH.error],
      volume: 0.48,
      preload: true,
      onloaderror: devLoadErr('toast-error'),
    }),
    warning: new Howl({
      src: [PATH.warning],
      volume: 0.4,
      preload: true,
      onloaderror: devLoadErr('toast-warning'),
    }),
    info: new Howl({
      src: [PATH.info],
      volume: 0.36,
      preload: true,
      onloaderror: devLoadErr('toast-info'),
    }),
  };
}

let toastSounds: GameToastSounds | null = null;

function ensureToastSounds(): GameToastSounds {
  if (!toastSounds) {
    toastSounds = createGameToastSounds();
  }
  return toastSounds;
}

/** One-shot SFX when a toast appears (`ToastProvider` / variant). */
export function playToastSound(variant: ToastSoundVariant): void {
  const s = ensureToastSounds();
  void Howler.ctx?.resume?.();
  const howl = s[variant];
  howl.stop();
  howl.play();
}

let bossWarningSting: Howl | null = null;

function ensureBossWarningSting(): Howl {
  if (!bossWarningSting) {
    bossWarningSting = new Howl({
      src: ['/audio/boss/shared/boss-warning-sting.wav', '/audio/shared/toast/toast-warning.ogg'],
      volume: 0.65,
      preload: true,
      onloaderror: devLoadErr('boss-warning-sting'),
    });
  }
  return bossWarningSting;
}

/** Dramatic sting played when a boss spawn condition is first met. */
export function playBossWarningSting(): void {
  void Howler.ctx?.resume?.();
  const howl = ensureBossWarningSting();
  howl.stop();
  howl.play();
}

// --- Boss mini-game: handshake item taps (placeholder paths) ---

let handshakeItemSounds: Record<HandshakeItemSfx, Howl> | null = null;

function ensureHandshakeItemSounds(): Record<HandshakeItemSfx, Howl> {
  if (!handshakeItemSounds) {
    handshakeItemSounds = {
      LEDGER: new Howl({
        src: [HANDSHAKE_ITEM_PATH.LEDGER],
        volume: 0.42,
        preload: true,
        onloaderror: devLoadErr('handshake-ledger'),
      }),
      BELL: new Howl({
        src: [HANDSHAKE_ITEM_PATH.BELL],
        volume: 0.42,
        preload: true,
        onloaderror: devLoadErr('handshake-bell'),
      }),
      COIN: new Howl({
        src: [HANDSHAKE_ITEM_PATH.COIN],
        volume: 0.42,
        preload: true,
        onloaderror: devLoadErr('handshake-coin'),
      }),
      WHISKEY: new Howl({
        src: [HANDSHAKE_ITEM_PATH.WHISKEY],
        volume: 0.42,
        preload: true,
        onloaderror: devLoadErr('handshake-whiskey'),
      }),
    };
  }
  return handshakeItemSounds;
}

export function playHandshakeItemSfx(item: HandshakeItemSfx): void {
  void Howler.ctx?.resume?.();
  const h = ensureHandshakeItemSounds()[item];
  h.stop();
  h.play();
}

// --- Typewriter click (reused for in-game MrV dialogue) ---

let dialogueTypewriterHowl: Howl | null = null;
let typewriterLastMs = 0;

function ensureDialogueTypewriter(): Howl {
  if (!dialogueTypewriterHowl) {
    dialogueTypewriterHowl = new Howl({
      src: ['/audio/intro/typewriter-click.wav'],
      volume: 0.45,
      preload: true,
      onloaderror: devLoadErr('typewriter-click'),
    });
  }
  return dialogueTypewriterHowl;
}

/**
 * Shared typewriter strike: intro (`IntroSequence`), in-game `MrVDialogue`, corkboard memo/headline.
 * Pass directly as `onChar` to `useTypewriter`.
 */
export function playDialogueTypewriterClick(): void {
  const now = performance.now();
  if (now - typewriterLastMs < TYPEWRITER_SOUND_MIN_MS) return;
  typewriterLastMs = now;
  void Howler.ctx?.resume?.();
  const h = ensureDialogueTypewriter();
  h.stop();
  h.play();
}

// --- Corkboard carousel SFX ---

const CORKBOARD_PATH = {
  odometer: '/audio/corkboard/odometer-click.wav',
  ledgerDing: '/audio/corkboard/ledger-ding.wav',
  swish: '/audio/corkboard/paper-swish.wav',
  stampThwack: '/audio/corkboard/stamp-thwack.wav',
  // TODO: replace with '/audio/corkboard/stamp-crinkle.wav' once asset is delivered
  stampCrinkle: '/audio/corkboard/paper-swish.wav',
} as const;

let corkboardSounds: Record<keyof typeof CORKBOARD_PATH, Howl> | null = null;

function ensureCorkboardSounds(): Record<keyof typeof CORKBOARD_PATH, Howl> {
  if (!corkboardSounds) {
    corkboardSounds = {
      odometer: new Howl({
        src: [CORKBOARD_PATH.odometer],
        volume: 0.35,
        preload: true,
        onloaderror: devLoadErr('odometer'),
      }),
      ledgerDing: new Howl({
        src: [CORKBOARD_PATH.ledgerDing],
        volume: 0.5,
        preload: true,
        onloaderror: devLoadErr('ledger-ding'),
      }),
      swish: new Howl({
        src: [CORKBOARD_PATH.swish],
        volume: 0.45,
        preload: true,
        onloaderror: devLoadErr('swish'),
      }),
      stampThwack: new Howl({
        src: [CORKBOARD_PATH.stampThwack],
        volume: 0.7,
        preload: true,
        onloaderror: devLoadErr('stamp-thwack'),
      }),
      stampCrinkle: new Howl({
        src: [CORKBOARD_PATH.stampCrinkle],
        volume: 0.4,
        preload: true,
        onloaderror: devLoadErr('stamp-crinkle'),
      }),
    };
  }
  return corkboardSounds;
}

/** Per-line SFX during ledger reveal (adding machine clack). */
export function playOdometerClick(): void {
  void Howler.ctx?.resume?.();
  const h = ensureCorkboardSounds().odometer;
  h.stop();
  h.play();
}

/** Fires once when the last ledger row is revealed. */
export function playLedgerDing(): void {
  void Howler.ctx?.resume?.();
  ensureCorkboardSounds().ledgerDing.play();
}

/** Paper swish sound on carousel step transition. */
export function playPaperSwish(): void {
  void Howler.ctx?.resume?.();
  const h = ensureCorkboardSounds().swish;
  h.stop();
  h.play();
}

// --- Boss mini-game: coat check parry (`public/audio/boss/coat-check/parry.wav`) ---

let coatParryHowl: Howl | null = null;

function ensureCoatParryHowl(): Howl {
  if (!coatParryHowl) {
    coatParryHowl = new Howl({
      src: ['/audio/boss/coat-check/parry.wav'],
      volume: 0.46,
      preload: true,
      onloaderror: devLoadErr('coat-parry'),
    });
  }
  return coatParryHowl;
}

/** Parry tap in boss COAT_CHECK mini-game. */
export function playCoatParrySfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensureCoatParryHowl();
  h.stop();
  h.play();
}

/** Bass-boosted stamp impact on the ledger. */
export function playStampThwack(): void {
  void Howler.ctx?.resume?.();
  ensureCorkboardSounds().stampThwack.play();
}

/** Paper crinkle after stamp settles. */
export function playStampCrinkle(): void {
  void Howler.ctx?.resume?.();
  ensureCorkboardSounds().stampCrinkle.play();
}

// --- Boss mini-game: Paparazzi Flash (`PaparazziGame.tsx`) ---
// Green capture: dedicated file under `public/audio/boss/paparazzi/` (replace in place). Others reuse shared assets — see README there.

const PAPARAZZI_PATH = {
  /** Placeholder clip — swap `public/audio/boss/paparazzi/green-capture.wav` for your shutter / good-angle SFX. */
  greenCapture: '/audio/boss/paparazzi/green-capture.wav',
  badAngle: '/audio/shared/toast/toast-error.wav',
  /** Missed green — distinct from red tap (warning vs error). */
  greenExpired: '/audio/shared/toast/toast-warning.ogg',
  winRound: '/audio/corkboard/ledger-ding.wav',
  urgentTick: '/audio/corkboard/odometer-click.wav',
} as const;

let paparazziSounds: Record<keyof typeof PAPARAZZI_PATH, Howl> | null = null;
let paparazziUrgentLastMs = 0;
const PAPARAZZI_URGENT_MIN_MS = 420;

function ensurePaparazziSounds(): Record<keyof typeof PAPARAZZI_PATH, Howl> {
  if (!paparazziSounds) {
    paparazziSounds = {
      greenCapture: new Howl({
        src: [PAPARAZZI_PATH.greenCapture],
        volume: 0.42,
        preload: true,
        onloaderror: devLoadErr('paparazzi-green-capture'),
      }),
      badAngle: new Howl({
        src: [PAPARAZZI_PATH.badAngle],
        volume: 0.52,
        preload: true,
        onloaderror: devLoadErr('paparazzi-red'),
      }),
      greenExpired: new Howl({
        src: [PAPARAZZI_PATH.greenExpired],
        volume: 0.44,
        preload: true,
        onloaderror: devLoadErr('paparazzi-miss'),
      }),
      winRound: new Howl({
        src: [PAPARAZZI_PATH.winRound],
        volume: 0.55,
        preload: true,
        onloaderror: devLoadErr('paparazzi-win'),
      }),
      urgentTick: new Howl({
        src: [PAPARAZZI_PATH.urgentTick],
        volume: 0.28,
        preload: true,
        onloaderror: devLoadErr('paparazzi-urgent'),
      }),
    };
  }
  return paparazziSounds;
}

/** Successful tap on a green viewfinder (counts toward win). */
export function playPaparazziGreenCaptureSfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensurePaparazziSounds().greenCapture;
  h.stop();
  h.play();
}

/** Tap on a red viewfinder — instant fail. */
export function playPaparazziRedMisfireSfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensurePaparazziSounds().badAngle;
  h.stop();
  h.play();
}

/** Green viewfinder expired untapped — fail. */
export function playPaparazziGreenExpiredSfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensurePaparazziSounds().greenExpired;
  h.stop();
  h.play();
}

/** All required good taps collected. */
export function playPaparazziWinRoundSfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensurePaparazziSounds().winRound;
  h.stop();
  h.play();
}

/**
 * Green viewfinder enters last-chance blink — throttled so many concurrent greens do not spam.
 */
export function playPaparazziGreenUrgentSfx(): void {
  const now = performance.now();
  if (now - paparazziUrgentLastMs < PAPARAZZI_URGENT_MIN_MS) return;
  paparazziUrgentLastMs = now;
  void Howler.ctx?.resume?.();
  const h = ensurePaparazziSounds().urgentTick;
  h.stop();
  h.play();
}

// --- Boss mini-game: White Glove (`WhiteGloveGame.tsx`) ---
// Dedicated clips under `public/audio/boss/white-glove/` — replace in place; see README there.

const WHITE_GLOVE_PATH = {
  forkSnap: '/audio/boss/white-glove/fork-snap.wav',
  knifeSnap: '/audio/boss/white-glove/knife-snap.wav',
  /** Fork + knife aligned on one table (knife was the last piece). */
  settingComplete: '/audio/boss/white-glove/setting-complete.wav',
  winRound: '/audio/boss/white-glove/win-round.wav',
} as const;

let whiteGloveSounds: Record<keyof typeof WHITE_GLOVE_PATH, Howl> | null = null;

function ensureWhiteGloveSounds(): Record<keyof typeof WHITE_GLOVE_PATH, Howl> {
  if (!whiteGloveSounds) {
    whiteGloveSounds = {
      forkSnap: new Howl({
        src: [WHITE_GLOVE_PATH.forkSnap],
        volume: 0.38,
        preload: true,
        onloaderror: devLoadErr('white-glove-fork-snap'),
      }),
      knifeSnap: new Howl({
        src: [WHITE_GLOVE_PATH.knifeSnap],
        volume: 0.36,
        preload: true,
        onloaderror: devLoadErr('white-glove-knife-snap'),
      }),
      settingComplete: new Howl({
        src: [WHITE_GLOVE_PATH.settingComplete],
        volume: 0.34,
        preload: true,
        onloaderror: devLoadErr('white-glove-setting-complete'),
      }),
      winRound: new Howl({
        src: [WHITE_GLOVE_PATH.winRound],
        volume: 0.52,
        preload: true,
        onloaderror: devLoadErr('white-glove-win'),
      }),
    };
  }
  return whiteGloveSounds;
}

export function playWhiteGloveForkSnapSfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensureWhiteGloveSounds().forkSnap;
  h.stop();
  h.play();
}

export function playWhiteGloveKnifeSnapSfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensureWhiteGloveSounds().knifeSnap;
  h.stop();
  h.play();
}

/** Both utensils snapped on the current table (played instead of a lone knife snap). */
export function playWhiteGloveSettingCompleteSfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensureWhiteGloveSounds().settingComplete;
  h.stop();
  h.play();
}

/** All five tables perfected — before overlay outcome. */
export function playWhiteGloveWinRoundSfx(): void {
  void Howler.ctx?.resume?.();
  const h = ensureWhiteGloveSounds().winRound;
  h.stop();
  h.play();
}
