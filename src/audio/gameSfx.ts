import { Howl, Howler } from 'howler';
import { TYPEWRITER_SOUND_MIN_MS } from '@/src/audio/audioConstants';

/** Matches `Toast['variant']` — keep in sync with `ToastContext`. */
export type ToastSoundVariant = 'success' | 'error' | 'warning' | 'info';

export interface GameToastSounds {
  success: Howl;
  error: Howl;
  warning: Howl;
  info: Howl;
}

/**
 * Files in `public/audio/game/` (URLs `/audio/game/...`).
 * Howler accepts wav / mp3 / ogg per clip; extensions must match the files on disk.
 */
const PATH = {
  success: '/audio/game/toast-success.wav',
  error: '/audio/game/toast-error.wav',
  warning: '/audio/game/toast-warning.ogg',
  info: '/audio/game/toast-info.wav',
} as const;

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
  stampCrinkle: '/audio/corkboard/stamp-crinkle.wav',
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
