# Audio Asset Organization

All runtime audio assets live under `public/audio/` and are loaded by URL paths
from code (mostly `src/audio/gameSfx.ts` and `src/audio/introAudio.ts`).

## Folder hierarchy

- `shared/`
  - Reusable audio used by multiple systems.
  - Current: `shared/toast/` for generic toast UI sounds.
- `boss/`
  - Boss encounter and mini-game specific audio.
  - Current:
    - `boss/handshake/`
    - `boss/coat-check/`
- `corkboard/`
  - Corkboard flow SFX.
- `intro/`
  - Intro and narrative SFX/music.

## Conventions

- Prefer lowercase kebab-case file names (for example `handshake-whiskey.wav`).
- Group by feature first, then by concrete sound role.
- Keep extension/type aligned with code paths in `src/audio/*.ts`.
- When adding assets, update loader paths and (if needed) volume values in code.

## Current game SFX mapping

`src/audio/gameSfx.ts` currently maps:

- Toast variants -> `/audio/shared/toast/*`
- Handshake item taps -> `/audio/boss/handshake/*`
- Coat check parry -> `/audio/boss/coat-check/parry.wav`

## Troubleshooting

- If you see `[gameSfx] load failed (...)` in devtools:
  - verify filename and extension exactly match the path in code
  - verify file exists under `public/audio/...`
