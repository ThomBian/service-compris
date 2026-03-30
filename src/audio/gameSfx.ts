import { Howl, Howler } from 'howler';

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
