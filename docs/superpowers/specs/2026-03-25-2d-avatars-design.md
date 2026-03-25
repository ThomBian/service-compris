---
title: 2D Party Avatars at the Desk
date: 2026-03-25
status: approved
---

# 2D Party Avatars at the Desk

## Context

The current desk scene represents the arriving party as plain `Users` icons (Lucide React) and the Maître D' as a minimal black silhouette SVG. This spec replaces both with illustrated, expressive SVG characters — colourful procedurally-assembled guests and a fixed, fancy Maître D' — and adds a reactive animation layer tied to game events.

This is sub-project 2 of the investigation interaction system. Sub-project 1 (Tactile Party Ticket) has shipped. Sub-project 3 (Clipboard — VIPs) depends on the `VisualTraits` data model introduced here.

---

## Goal

- Replace `Users` icons in `DeskScene` with full-colour illustrated guest avatars assembled from procedural parts
- Replace the existing Maître D' SVG silhouette with a fixed "Modern Chic" illustrated character
- Both react to game events via Framer Motion animations
- Provide `VisualTraits` on `Client` as the foundation for VIP trait overlays in sub-project 3

---

## Out of Scope

- Allergy / dietary bubble system (sub-project 4)
- VIP visual trait overlays (sub-project 3 — `VisualTraits` fields are the foundation)
- Queue characters (only the desk client gets avatars)
- Mobile / responsive layout changes
- Existing size accusation click target and hover badge — unchanged, just wraps different children

---

## Data Model

### New `VisualTraits` interface — `src/types.ts`

```ts
export interface VisualTraits {
  skinTone:      0 | 1 | 2 | 3 | 4;      // 5 tones: very light → dark
  hairStyle:     0 | 1 | 2 | 3 | 4;      // short, long, curly, bald, bun
  hairColor:     0 | 1 | 2 | 3 | 4 | 5;  // black, brown, blonde, red, grey, white
  clothingStyle: 0 | 1 | 2 | 3;          // formal, casual, dress, smart-casual
  clothingColor: 0 | 1 | 2 | 3 | 4;      // 5 palette options
  height:        0 | 1 | 2;              // short, medium, tall (drives SVG viewBox scale)
}
```

### `Client` — `src/types.ts`

Add `visualTraits: VisualTraits` as a required field on the `Client` interface.

### Trait generation — `src/logic/gameLogic.ts`

In `generateClientData`, add random picks across each dimension (pure `Math.random()` — no trait is tied to `ClientType`). Pass through in `createNewClient`.

### Party member seeding

Party members beyond the spokesperson (index 0) are rendered from a deterministic hash of `client.id + index` via a pure helper function:

```ts
export function seedTraits(id: string, index: number): VisualTraits
```

This lives in `src/logic/gameLogic.ts`. It derives a pseudo-random but stable appearance using a DJB2-style hash over the characters of `id + String(index)`, then takes each field value as `hash % fieldRange`. Example implementation:

```ts
export function seedTraits(id: string, index: number): VisualTraits {
  const seed = id + String(index);
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  const pick = (range: number) => { const v = h % range; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; return v; };
  return {
    skinTone:      pick(5) as VisualTraits['skinTone'],
    hairStyle:     pick(5) as VisualTraits['hairStyle'],
    hairColor:     pick(6) as VisualTraits['hairColor'],
    clothingStyle: pick(4) as VisualTraits['clothingStyle'],
    clothingColor: pick(5) as VisualTraits['clothingColor'],
    height:        pick(3) as VisualTraits['height'],
  };
}
```

---

## Components

### `src/components/scene/ClientAvatar.tsx` (create)

Renders a single guest character as a layered inline SVG assembled from `VisualTraits`.

```ts
interface ClientAvatarProps {
  traits: VisualTraits;
  animState?: 'entrance' | 'accused' | 'refused' | null;
}
```

- `height` trait changes the SVG `height` attribute only (short ≈ 52px, medium ≈ 66px, tall ≈ 80px). The `viewBox` stays fixed at `0 0 48 80` across all height variants so overlay layers from sub-project 3 can use a stable coordinate space.
- Layers: body silhouette → skin tone → clothing → hair → face (eyes, nose, mouth)
- Colour palettes defined as constant arrays indexed by trait values
- `animState` drives a `motion.div` wrapper:
  - `entrance`: spring up from below (`y: 20 → 0, opacity: 0 → 1`)
  - `accused`: horizontal shake (`x: [0, -6, 6, -4, 4, 0]`, 0.4s)
  - `refused`: slump + fade (`y: 0 → 6, opacity: 1 → 0.4`)
- Animation state resets to `null` via an `onAnimationComplete` callback prop passed in from `DeskScene`. The child calls this callback when the Framer Motion animation finishes; `DeskScene` sets the state back to `null`. No `setTimeout` — duration lives in the animation definition only.

### `src/components/scene/MaitreDAvatar.tsx` (create)

Fixed "Modern Chic" character — slim navy suit, burgundy bow tie and pocket square, warm medium skin, modern undercut. No `VisualTraits` needed.

```ts
interface MaitreDAvatarProps {
  animState?: 'bow' | 'stop' | 'shrug' | null;
}
```

- `bow`: forward lean (`rotate: [0, 8, 0]`)
- `stop`: brief scale pulse (`scale: [1, 1.05, 1]`)
- `shrug`: shoulder raise (`y: [0, -4, 0]`)
- Animation state resets to `null` via the same `onAnimationComplete` callback prop pattern as `ClientAvatar`

### `src/components/scene/DeskScene.tsx` (modify)

- Replace the hand-coded Maître D' SVG block (lines 182–201) with `<MaitreDAvatar animState={maitreDAnimState} />`
- Replace the `Users` icon map inside the party group with `<ClientAvatar traits={...} animState={guestAnimState} />` for index 0 (spokesperson uses `currentClient.visualTraits`), and `<ClientAvatar traits={seedTraits(currentClient.id, i)} />` for subsequent members
- Add `maitreDAnimState` and `guestAnimState` local state (both `string | null`, default `null`)
- **Entrance animation**: triggered by a `useEffect` watching `currentClient?.id`. When the ID changes (new client arrives), set `guestAnimState = 'entrance'`.
- **Accusation animations**: `DeskScene` wraps its own `callOutLie` calls. Before calling `callOutLie('size')`, it does nothing; after the state update resolves, a `useEffect` watching `currentClient.isCaught` sets `guestAnimState = 'accused'` and `maitreDAnimState = 'bow'` when `isCaught` flips to `true`.
- **False accusation**: `DeskScene` passes a local wrapper around `callOutLie` to the party group click handler. The wrapper calls `callOutLie` and then also calls `setMaitreDAnimState('shrug')` directly. Since `callOutLie` is synchronous (single `setGameState` call), the shrug fires in the same React update cycle as the patience penalty. This avoids the fragile patience-delta watch.
- **REFUSE / seated**: `useEffect` watching `currentClient.physicalState` sets `guestAnimState = 'refused'` and `maitreDAnimState = 'stop'` on `REFUSED`, and `maitreDAnimState = 'bow'` on `SEATING`.
- Both states reset to `null` via the `onAnimationComplete` callback from the child components.
- No new context actions needed — animation state is entirely local to `DeskScene`

---

## Animation Trigger Map

| Game event | Guest `animState` | Maître D' `animState` |
|---|---|---|
| Client arrives at desk | `entrance` | — |
| Accusation correct (`isCaught` flips true) | `accused` | `bow` |
| False accusation (patience penalty fires) | — | `shrug` |
| REFUSE fired (`physicalState → REFUSED`) | `refused` | `stop` |
| Party seated (door opens) | — | `bow` |

---

## Testing

Three new cases in `src/logic/__tests__/gameLogic.test.ts`:

1. **`generateClientData` assigns `visualTraits` within range** — all six fields are present and within their declared upper bounds after generation: `skinTone ∈ [0,4]`, `hairStyle ∈ [0,4]`, `hairColor ∈ [0,5]`, `clothingStyle ∈ [0,3]`, `clothingColor ∈ [0,4]`, `height ∈ [0,2]`. Test asserts each field explicitly with `toBeGreaterThanOrEqual(0)` and `toBeLessThanOrEqual(max)`.

2. **`seedTraits` is deterministic** — `seedTraits('abc123', 1)` called twice returns objects that are deeply equal across all six fields (`toEqual`).

3. **`seedTraits` varies by index** — `seedTraits('abc123', 0)` and `seedTraits('abc123', 1)` do not return identical objects (guards against a broken hash that ignores the index).

No component tests (project has no component test infrastructure). `npm run lint` + `npm run test` as regression check after each task.
