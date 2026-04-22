# Paparazzi Flash — SFX

Runtime hooks live in `src/audio/gameSfx.ts` (`playPaparazzi*`).

## Green good-tap (your asset)

| Moment | Function | File |
|--------|----------|------|
| Green tap (progress, not final win) | `playPaparazziGreenCaptureSfx` | **`green-capture.wav`** (this folder) |

**Replace in place:** overwrite `green-capture.wav` with your sound (same filename). Format: WAV (or change extension + `PAPARAZZI_PATH` in `gameSfx.ts` if you use mp3/ogg).

The file checked in today is a **temporary duplicate** of `../handshake/coin.wav` so the game always loads; swap it when your clip is ready.

## Other moments (reuse for now)

| Moment | Function | Source file |
|--------|----------|-------------|
| Red tap | `playPaparazziRedMisfireSfx` | `shared/toast/toast-error.wav` |
| Green expired | `playPaparazziGreenExpiredSfx` | `shared/toast/toast-warning.ogg` |
| Win (8 greens) | `playPaparazziWinRoundSfx` | `corkboard/ledger-ding.wav` |
| Green → blink | `playPaparazziGreenUrgentSfx` | `corkboard/odometer-click.wav` |

## Optional extra slots later

Dedicated files under this folder (and new entries in `PAPARAZZI_PATH`) if you want full custom set:

- `red-misfire.wav`, `green-expired.wav`, `win-round.wav`, `urgent-tick.wav`

Keep clips short (about **400 ms** or less) so taps stay readable under spawn pressure.
