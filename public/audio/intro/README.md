# Intro sequence audio

WAV files in this folder are loaded by Howler from `src/audio/introAudio.ts` (URLs `/audio/intro/...`).

## Bundled tracks

| File | Use |
|------|-----|
| `rain-loop.wav` | Screen 0 — rain ambience (loop) |
| `jazz-loop.wav` | Screen 0 — jazz bed, 2s fade-in after first gesture (loop) |
| `typewriter-click.wav` | Typewriter SFX while intro copy reveals (screens 0, 2 clipboard lines, 3 M. V. line) |
| `door-open.wav` | CLOCK IN door hit (one-shot) |

## Optional

| File | Use |
|------|-----|
| `clipboard-thud.wav` | Screen 2 — clipboard landing. **Not in repo yet:** `clipboardThud` reuses `door-open.wav` at lower volume until you add this file. After adding it, in `introAudio.ts` point `clipboardThud` at `['/audio/intro/clipboard-thud.wav']` instead of `PATH.door`. |

Volumes are tuned in `createIntroSounds()`; adjust there if mixes are too loud or quiet.

## Troubleshooting (no sound)

- **Click or tap** the opening screen once: browsers often unlock audio only after pointer input, not only **Enter**.
- Ensure the tab is **not muted** and system volume is up.
- In devtools, if you see `[introAudio] load failed`, the WAV may be an unsupported codec for Web Audio (try 16-bit PCM WAV) or the file path 404s.
