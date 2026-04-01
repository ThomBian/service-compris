import { Howl } from 'howler';

/** Rain + jazz loops only — shared by intro and in-shift ambience (`useGameAmbience`). */
export interface GameAmbienceSounds {
  rainLoop: Howl;
  jazzLoop: Howl;
}

/**
 * One-shot SFX used only during the intro (not shared across mount cycles).
 * Typewriter strikes use `playDialogueTypewriterClick` in `gameSfx.ts` (shared with corkboard / in-game Mr. V).
 */
export interface IntroOneShotSounds {
  clipboardThud: Howl;
  doorOpen: Howl;
}

/** Howl instances used by the cinematic intro (`IntroSequence`). */
export interface IntroSounds extends GameAmbienceSounds, IntroOneShotSounds {}

/**
 * Files in `public/audio/intro/` (URLs `/audio/intro/...`).
 * Web Audio (default) is used for reliable WAV playback; `html5` mode was causing
 * silent failures with some large `.wav` beds in Chrome/Safari.
 */
const PATH = {
  rain: '/audio/intro/rain-loop.wav',
  jazz: '/audio/intro/jazz-loop.wav',
  door: '/audio/intro/door-open.wav',
} as const;

const devLoadErr =
  import.meta.env.DEV && typeof console !== 'undefined'
    ? (label: string) =>
        (_id: number, err: unknown) =>
          console.error(`[introAudio] load failed (${label}):`, err)
    : () => undefined;

function buildGameAmbienceSounds(): GameAmbienceSounds {
  return {
    rainLoop: new Howl({
      src: [PATH.rain],
      loop: true,
      volume: 0.4,
      preload: true,
      onloaderror: devLoadErr('rain-loop'),
    }),
    jazzLoop: new Howl({
      src: [PATH.jazz],
      loop: true,
      volume: 0.2,
      preload: true,
      onloaderror: devLoadErr('jazz-loop'),
    }),
  };
}

let sharedAmbience: GameAmbienceSounds | null = null;

/**
 * Session-wide rain + jazz loops (one decode). Used by `IntroSequence` and `useGameAmbience`.
 */
export function getSharedAmbienceSounds(): GameAmbienceSounds {
  if (!sharedAmbience) {
    sharedAmbience = buildGameAmbienceSounds();
  }
  return sharedAmbience;
}

/**
 * @deprecated Prefer `getSharedAmbienceSounds()`. Alias for searchability.
 */
export function createGameAmbienceSounds(): GameAmbienceSounds {
  return getSharedAmbienceSounds();
}

/**
 * Per-mount intro one-shots — call once per `IntroSequence` instance (Strict Mode safe for loops).
 *
 * **Clipboard:** Uses the same asset as the door until `clipboard-thud.wav` exists;
 * then set `clipboardThud` `src` to `['/audio/intro/clipboard-thud.wav']`.
 */
export function createIntroOneShotSounds(): IntroOneShotSounds {
  return {
    clipboardThud: new Howl({
      src: [PATH.door],
      volume: 0.5,
      preload: true,
      onloaderror: devLoadErr('clipboard-thud (door)'),
    }),
    doorOpen: new Howl({
      src: [PATH.door],
      volume: 0.7,
      preload: true,
      onloaderror: devLoadErr('door-open'),
    }),
  };
}

/**
 * Full intro sound set: shared loops + fresh one-shots.
 *
 * **Autoplay:** The caller must start `rainLoop` and apply a **2s fade-in** for
 * `jazzLoop` only after the first user gesture (e.g. first Enter on Screen 0), per
 * browser autoplay rules. Typical jazz pattern: `jazzLoop.volume(0); jazzLoop.play();`
 * then `jazzLoop.fade(0, 0.2, 2000)`.
 */
export function createIntroSounds(): IntroSounds {
  return {
    ...getSharedAmbienceSounds(),
    ...createIntroOneShotSounds(),
  };
}
