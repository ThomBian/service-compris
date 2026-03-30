import { Howl } from 'howler';

/** Rain + jazz loops only — shared by intro and in-shift ambience (`useGameAmbience`). */
export interface GameAmbienceSounds {
  rainLoop: Howl;
  jazzLoop: Howl;
}

/** Howl instances used by the cinematic intro (`IntroSequence`). */
export interface IntroSounds extends GameAmbienceSounds {
  typewriterClick: Howl;
  clipboardThud: Howl;
  doorOpen: Howl;
}

/**
 * Files in `public/audio/intro/` (URLs `/audio/intro/...`).
 * Web Audio (default) is used for reliable WAV playback; `html5` mode was causing
 * silent failures with some large `.wav` beds in Chrome/Safari.
 */
const PATH = {
  rain: '/audio/intro/rain-loop.wav',
  jazz: '/audio/intro/jazz-loop.wav',
  typewriter: '/audio/intro/typewriter-click.wav',
  door: '/audio/intro/door-open.wav',
} as const;

const devLoadErr =
  import.meta.env.DEV && typeof console !== 'undefined'
    ? (label: string) =>
        (_id: number, err: unknown) =>
          console.error(`[introAudio] load failed (${label}):`, err)
    : () => undefined;

/**
 * Builds Howler instances for intro ambience and SFX. Intended to be called once
 * from `IntroSequence` (lazy creation inside this factory is fine).
 *
 * **Autoplay:** The caller must start `rainLoop` and apply a **2s fade-in** for
 * `jazzLoop` only after the first user gesture (e.g. first Enter on Screen 0), per
 * browser autoplay rules. Typical jazz pattern: `jazzLoop.volume(0); jazzLoop.play();`
 * then `jazzLoop.fade(0, 0.2, 2000)`.
 *
 * **Clipboard:** Uses the same asset as the door until `clipboard-thud.wav` exists;
 * then set `clipboardThud` `src` to `['/audio/intro/clipboard-thud.wav']`.
 */
export function createGameAmbienceSounds(): GameAmbienceSounds {
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

export function createIntroSounds(): IntroSounds {
  const { rainLoop, jazzLoop } = createGameAmbienceSounds();
  return {
    rainLoop,
    jazzLoop,
    typewriterClick: new Howl({
      src: [PATH.typewriter],
      volume: 0.6,
      preload: true,
      onloaderror: devLoadErr('typewriter-click'),
    }),
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
