# White Glove — SFX

Hooks live in `src/audio/gameSfx.ts` (`playWhiteGlove*`).

## Replace-in-place clips

| File | When it plays | Notes |
|------|----------------|-------|
| **`fork-snap.wav`** | Fork locks to dashed outline | Placeholder today: copy of `../handshake/bell.wav` |
| **`knife-snap.wav`** | Knife locks, fork not yet done on that table | Placeholder: `../handshake/coin.wav` |
| **`setting-complete.wav`** | Knife locks **after** fork on the same table (full place setting) | Placeholder: `../../corkboard/odometer-click.wav` — short tick |
| **`win-round.wav`** | All **5** tables complete | Placeholder: `../../corkboard/ledger-ding.wav` |

Swap any file with your own WAV (same name) or change paths in `WHITE_GLOVE_PATH` in `gameSfx.ts`.

## Timer loss

Shell `TimerBar` ends the encounter; no dedicated lose clip in the mini-game (optional: add `lose-time.wav` later and call from overlay only for this boss if desired).
