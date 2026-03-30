# In-game UI SFX

Loaded from `src/audio/gameSfx.ts` (URLs `/audio/game/...`).

## Toast variants

Paths and extensions are defined in `src/audio/gameSfx.ts` (`PATH`).

| File | When |
|------|------|
| `toast-success.mp3` | Toast variant `success` (e.g. justified refusal, caught lie, accepted) |
| `toast-error.wav` | Toast variant `error` (e.g. storm out, unjustified refusal, fooled) |
| `toast-warning.ogg` | Toast variant `warning` (e.g. false accusation, VIP left queue) |
| `toast-info.wav` | Toast variant `info` (e.g. floorplan hints) |

Volumes are set in `createGameToastSounds()`.

## Troubleshooting

- If you see `[gameSfx] load failed` in devtools, check the filename/extension matches `PATH` and the file is under `public/audio/game/`.
