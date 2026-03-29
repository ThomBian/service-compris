# Floorplan Brass-and-Glass Redesign

**Date:** 2026-03-29

## Goal

Transform the floorplan view from a flat digital grid into an atmospheric Art Deco seating chart. The grid floats over the actual restaurant interior (`public/restaurant-inside.png`), with brass borders, dark semi-transparent cells, and flickering candlelight animations on occupied tables. Visual inspiration: the Le Solstice exterior (deep burgundy, warm gold, near-black).

---

## Files Changed

| File | Change |
|---|---|
| `src/components/floorplan/FloorplanBackground.tsx` | New component — background image wrapper (mirrors `StreetSceneBackground` pattern) |
| `src/components/floorplan/FloorplanGrid.tsx` | Palette swap, `CandleGlow` inline component, Art Deco frame, header redesign, use `FloorplanBackground` |

No changes to game logic, context, or button behaviour.

---

## `FloorplanBackground.tsx`

Wraps the grid content in three layers (same pattern as `StreetSceneBackground`):

```
Layer 1 — /restaurant-inside.png (background-size: cover, center, image-rendering: pixelated)
Layer 2 — radial vignette overlay (dark edges, transparent center — improves grid readability)
Layer 3 — children (header + grid UI)
```

```tsx
<div className="relative h-full w-full overflow-hidden">
  {/* Layer 1 */}
  <div className="absolute inset-0 z-0" style={{
    backgroundImage: "url('/restaurant-inside.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    imageRendering: 'pixelated',
  }} />
  {/* Layer 2 */}
  <div className="absolute inset-0 z-[1] pointer-events-none" style={{
    background: 'radial-gradient(ellipse at 40% 60%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)',
  }} />
  {/* Layer 3 */}
  <div className="relative z-10 h-full flex flex-col">
    {children}
  </div>
</div>
```

---

## Palette

| Token | Value | Usage |
|---|---|---|
| Container bg (fallback) | `#0d0a06` | Behind image |
| Cell bg | `rgba(18,10,4,0.82)` | Empty cells |
| Dim brass | `#4a2e14` | Empty cell border |
| Bright brass | `#c9a227` | Occupied/selected border, title text |
| Mid brass | `#8b6914` | Hover border, party name text |
| Burgundy | `#8b1a1a` | Header accent stripe, about-to-free border |
| Grid card bg | `rgba(8,4,2,0.58)` | Framed card over background image |

---

## Cell States

| State | Background | Border | Box-shadow |
|---|---|---|---|
| Empty | `rgba(18,10,4,0.82)` | `#4a2e14` | — |
| Empty + seating hover | `rgba(42,26,8,0.85)` | `#8b6914` | faint gold |
| Selected | `rgba(38,28,0,0.92)` | `#c9a227` | gold glow + `scale(0.93)` |
| Occupied | `rgba(18,10,4,0.82)` | `#c9a227` | `0 0 10px rgba(201,162,39,0.45)` + `CandleGlow` |
| About-to-free | `rgba(38,8,0,0.88)` | `#8b1a1a` | red glow + `CandleGlow` (red flame) |
| Blocked | `rgba(8,8,8,0.75)` | `#1a1208` | dimmed, `opacity: 0.45` |

---

## `CandleGlow` Component

Defined inline at the top of `FloorplanGrid.tsx`. Replaces the current `Users` icon + duration span inside occupied cells.

```tsx
interface CandleGlowProps {
  mealDuration: number;
  isCritical: boolean;
}

const CandleGlow: React.FC<CandleGlowProps> = ({ mealDuration, isCritical }) => (
  <motion.div
    className="flex flex-col items-center gap-0.5"
    animate={{ opacity: [0.75, 1, 0.8, 0.95, 0.75], scale: [1, 1.06, 0.97, 1.03, 1] }}
    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
  >
    <div
      className="w-1 h-2.5 rounded-full"
      style={{
        background: isCritical
          ? 'linear-gradient(to top, #c41e1e, #ffaa44)'
          : 'linear-gradient(to top, #e8a020, #fff8e0)',
        boxShadow: isCritical
          ? '0 0 8px #ff5533, 0 0 16px rgba(255,60,30,0.3)'
          : '0 0 8px #ffcc44, 0 0 16px rgba(255,180,0,0.3)',
      }}
    />
    <span
      className="text-[7px] font-mono leading-none tabular-nums"
      style={{ color: isCritical ? '#c41e1e' : '#c9a227' }}
    >
      {mealDuration}m
    </span>
  </motion.div>
);
```

Each occupied cell renders its own `CandleGlow` instance. Because Framer Motion starts each animation at mount time, cells that come online at different moments flicker out of sync naturally — no offset prop needed.

`isCritical` is true when `cell.mealDuration <= TABLE_TURNING_SOON_THRESHOLD` (existing constant).

---

## Art Deco Grid Frame

The `<div>` wrapping the grid gets a layered `box-shadow` creating a stepped border effect, and four CSS corner ornaments:

```tsx
// Frame wrapper
<div
  style={{
    padding: '9px',
    background: 'rgba(8,4,2,0.58)',
    border: '2px solid #c9a227',
    boxShadow: `
      0 0 0 1px #6b4e10,
      0 0 0 4px rgba(8,4,2,0.5),
      0 0 0 5px #3a2208,
      0 0 28px rgba(201,162,39,0.18),
      0 8px 32px rgba(0,0,0,0.5),
      inset 0 0 20px rgba(0,0,0,0.3)
    `,
    position: 'relative',
  }}
>
  {/* Corner ornaments — four absolute divs with L-shaped borders */}
  {/* top-left */}  <div style={{ position:'absolute', top:4, left:4,  width:9, height:9, borderTop:'2px solid #c9a227', borderLeft:'2px solid #c9a227' }} />
  {/* top-right */} <div style={{ position:'absolute', top:4, right:4, width:9, height:9, borderTop:'2px solid #c9a227', borderRight:'2px solid #c9a227' }} />
  {/* btm-left */}  <div style={{ position:'absolute', bottom:4, left:4,  width:9, height:9, borderBottom:'2px solid #c9a227', borderLeft:'2px solid #c9a227' }} />
  {/* btm-right */} <div style={{ position:'absolute', bottom:4, right:4, width:9, height:9, borderBottom:'2px solid #c9a227', borderRight:'2px solid #c9a227' }} />

  {/* existing grid */}
</div>
```

The active-seating `ring-4 ring-emerald-500/20` class on the grid is removed; the gold frame already communicates selection readiness.

---

## Header Redesign

The title header gets the Art Deco treatment. The `Users` icon is replaced with a small inline SVG (4-square floorplan symbol).

```tsx
<div style={{
  background: 'linear-gradient(to bottom, rgba(26,8,8,0.95), rgba(18,8,4,0.92))',
  borderBottom: '2px solid #c9a227',
  position: 'relative',
}} className="flex items-center px-5 py-3 shrink-0">
  {/* Accent stripe */}
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    background: 'linear-gradient(to right, #8b1a1a, #c9a227, #8b1a1a)',
  }} />
  {/* Icon + title */}
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-2.5 mt-px">
    <rect x=".75" y=".75" width="12.5" height="12.5" rx="1" stroke="#c9a227" strokeWidth="1.2"/>
    <rect x="3" y="3" width="3" height="3" fill="#c9a227" opacity="0.7"/>
    <rect x="8" y="3" width="3" height="3" fill="#c9a227" opacity="0.7"/>
    <rect x="3" y="8" width="3" height="3" fill="#c9a227" opacity="0.7"/>
    <rect x="8" y="8" width="3" height="3" fill="#c9a227" opacity="0.3"/>
  </svg>
  <h2 style={{
    color: '#c9a227',
    fontFamily: 'Georgia, serif',
    fontSize: '13px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontWeight: 'normal',
    margin: 0,
  }}>
    Floorplan
  </h2>
</div>
```

---

## Party Strip & Rush Row

Background becomes `rgba(12,6,2,0.88)` with `border-bottom: 1px solid #4a2e14`. All other structure, buttons, and logic are unchanged.

---

## Seating Mode Ring

Remove the `ring-4 ring-emerald-500/20` class from the grid wrapper — the gold Art Deco frame provides sufficient visual feedback for seating mode readiness.

---

## Root Element Change

The outermost `div` in `FloorplanGrid` currently has `bg-[#E4E3E0]`. This class is removed so the `FloorplanBackground` image shows through. `FloorplanBackground` becomes the new root wrapper, replacing the plain `div`.

---

## What Does Not Change

- All game logic, context hooks, action handlers
- Button styles (Confirm, Refuse, Rush Table, Last Call)
- Drag-to-select pointer event handlers
- Auto-confirm timer
- `TABLE_TURNING_SOON_THRESHOLD` logic
- `GRID_SIZE` constant usage
- Tour `data-tour="floorplan"` attribute
- All element IDs (`floorplan-grid`, `cell-${x}-${y}`, etc.)
