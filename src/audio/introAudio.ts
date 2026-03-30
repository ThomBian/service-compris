import { Howl } from 'howler';

/** Howl instances used by the cinematic intro (`IntroSequence`). */
export interface IntroSounds {
  rainLoop: Howl;
  jazzLoop: Howl;
  typewriterClick: Howl;
  clipboardThud: Howl;
  doorOpen: Howl;
}

/**
 * Builds Howler instances for intro ambience and SFX. Intended to be called once
 * from `IntroSequence` (lazy creation inside this factory is fine).
 *
 * **Autoplay:** The caller must start `rainLoop` and apply a **2s fade-in** for
 * `jazzLoop` only after the first user gesture (e.g. first click on Screen 0), per
 * browser autoplay rules. Typical jazz pattern: `jazzLoop.volume(0); jazzLoop.play();`
 * then `jazzLoop.fade(0, 0.2, 2000)`.
 */
export function createIntroSounds(): IntroSounds {
  return {
    rainLoop: new Howl({
      src: ['/audio/intro/rain-loop.mp3'],
      loop: true,
      volume: 0.4,
    }),
    jazzLoop: new Howl({
      src: ['/audio/intro/jazz-loop.mp3'],
      loop: true,
      volume: 0.2,
    }),
    typewriterClick: new Howl({
      src: ['/audio/intro/typewriter-click.mp3'],
      volume: 0.6,
    }),
    clipboardThud: new Howl({
      src: ['/audio/intro/clipboard-thud.mp3'],
      volume: 0.8,
    }),
    doorOpen: new Howl({
      src: ['/audio/intro/door-open.mp3'],
      volume: 0.7,
    }),
  };
}
