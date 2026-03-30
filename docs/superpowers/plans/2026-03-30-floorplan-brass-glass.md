# Floorplan Brass-and-Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the FloorplanGrid from a flat digital grid into an Art Deco seating chart floating over the restaurant interior image, with flickering candlelight on occupied tables.

**Architecture:** Create a new `FloorplanBackground` component (mirrors `StreetSceneBackground`) that layers the `restaurant-inside.png` image behind a vignette and the existing UI. Refactor `FloorplanGrid` to use Art Deco palette, replace the occupied-cell icon+timer with a `CandleGlow` Framer Motion component, and add a stepped brass frame with corner ornaments around the grid.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Framer Motion (`motion/react`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/floorplan/FloorplanBackground.tsx` | **Create** | Three-layer wrapper: background image → vignette → children |
| `src/components/floorplan/FloorplanGrid.tsx` | **Modify** | `CandleGlow` component, Art Deco palette, header, frame, use `FloorplanBackground` |

No other files change.

---

### Task 1: Create `FloorplanBackground`

**Files:**
- Create: `src/components/floorplan/FloorplanBackground.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/floorplan/FloorplanBackground.tsx
import React from 'react';

interface FloorplanBackgroundProps {
  children: React.ReactNode;
}

export const FloorplanBackground: React.FC<FloorplanBackgroundProps> = ({ children }) => {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Layer 1 — restaurant interior image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/restaurant-inside.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }}
      />
      {/* Layer 2 — radial vignette for grid readability */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 40% 60%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)',
        }}
      />
      {/* Layer 3 — UI content */}
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/floorplan/FloorplanBackground.tsx
git commit -m "feat: add FloorplanBackground component with restaurant interior image"
```

---

### Task 2: Add `CandleGlow` and update header in `FloorplanGrid`

**Files:**
- Modify: `src/components/floorplan/FloorplanGrid.tsx`

- [ ] **Step 1: Remove unused `Users` import and add `CandleGlow` component**

At the top of `FloorplanGrid.tsx`, remove `Users` from the lucide import line:

```tsx
import { Check, X } from "lucide-react";
```

Then add the `CandleGlow` component definition directly above the `FloorplanGridProps` interface:

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

- [ ] **Step 2: Redesign the title header**

Replace the current header block (lines 97–103 in the original):

```tsx
{/* 1. Title header — always present, no subtitle */}
<div className="flex items-center px-6 py-3 border-b border-[#141414]/20 shrink-0">
  <h2 className="text-xl font-bold text-[#141414] flex items-center gap-2">
    <Users className="w-5 h-5" />
    Floorplan
  </h2>
</div>
```

With:

```tsx
{/* 1. Title header — Art Deco style */}
<div
  style={{
    background: 'linear-gradient(to bottom, rgba(26,8,8,0.95), rgba(18,8,4,0.92))',
    borderBottom: '2px solid #c9a227',
    position: 'relative',
  }}
  className="flex items-center px-5 py-3 shrink-0"
>
  {/* Burgundy-gold accent stripe */}
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    background: 'linear-gradient(to right, #8b1a1a, #c9a227, #8b1a1a)',
  }} />
  {/* Floorplan icon */}
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-2.5 mt-px shrink-0">
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

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/floorplan/FloorplanGrid.tsx
git commit -m "feat: add CandleGlow component and Art Deco header to FloorplanGrid"
```

---

### Task 3: Restyle party strip, rush row, and wrap root in `FloorplanBackground`

**Files:**
- Modify: `src/components/floorplan/FloorplanGrid.tsx`

- [ ] **Step 1: Add `FloorplanBackground` import**

At the top of `FloorplanGrid.tsx`, add:

```tsx
import { FloorplanBackground } from './FloorplanBackground';
```

- [ ] **Step 2: Replace the root `div` with `FloorplanBackground`**

The current root element is:

```tsx
<div className="flex flex-col bg-[#E4E3E0] h-full overflow-hidden" data-tour="floorplan">
```

Replace with:

```tsx
<FloorplanBackground>
<div className="flex flex-col h-full" data-tour="floorplan">
```

And close with `</div></FloorplanBackground>` at the end of the return (wrapping the existing closing `</div>`).

- [ ] **Step 3: Restyle party strip background**

The current party strip outer div:

```tsx
<div className="flex items-center gap-3 px-6 py-3 bg-[#D6D5D2] border-b border-[#141414]/15 shrink-0">
```

Replace with:

```tsx
<div
  className="flex items-center gap-3 px-5 py-3 shrink-0"
  style={{ background: 'rgba(12,6,2,0.88)', borderBottom: '1px solid #4a2e14' }}
>
```

- [ ] **Step 4: Restyle party member icons and name**

Replace the party member icons block (the `Users` icons and name span):

```tsx
<div className="flex flex-col gap-1">
  <div className="flex gap-1">
    {Array.from({ length: partySize }).map((_, i) => (
      <Users
        key={i}
        size={16}
        className={i < selectedCells.length ? 'text-emerald-600' : 'text-[#141414] opacity-30'}
      />
    ))}
  </div>
  <span className="text-[9px] font-bold uppercase tracking-widest">
    {currentClient?.trueFirstName} ({selectedCells.length}/{partySize})
  </span>
</div>
```

With:

```tsx
<div className="flex flex-col gap-1">
  <div className="flex gap-1">
    {Array.from({ length: partySize }).map((_, i) => (
      <div
        key={i}
        className="w-2.5 h-2.5 rounded-full"
        style={{
          background: i < selectedCells.length ? '#c9a227' : '#4a2e14',
          opacity: i < selectedCells.length ? 0.9 : 0.5,
        }}
      />
    ))}
  </div>
  <span
    className="text-[8px] uppercase tracking-widest font-mono"
    style={{ color: '#8b6914' }}
  >
    {currentClient?.trueFirstName} ({selectedCells.length}/{partySize})
  </span>
</div>
```

- [ ] **Step 5: Restyle the Maitre D' silhouette in party strip**

Replace:

```tsx
<div className="w-8 h-11 bg-[#141414] rounded-t-full flex items-end justify-center text-white text-[8px] pb-1 shrink-0">
  MD
</div>
```

With:

```tsx
<div
  className="flex items-end justify-center pb-1 shrink-0"
  style={{
    width: 26, height: 36,
    background: 'rgba(20,8,4,0.9)',
    border: '1px solid #c9a227',
    borderRadius: '13px 13px 2px 2px',
  }}
>
  <span style={{ color: '#c9a227', fontSize: 7 }}>◆</span>
</div>
```

- [ ] **Step 6: Restyle rush row**

Replace the rush row outer div:

```tsx
<div className="flex flex-wrap gap-2 items-center shrink-0 px-6 py-2 border-b border-amber-400/40 bg-amber-50/30">
```

With:

```tsx
<div
  className="flex flex-wrap gap-2 items-center shrink-0 px-5 py-2"
  style={{ background: 'rgba(12,6,2,0.88)', borderBottom: '1px solid #4a2e14' }}
>
```

And replace the "Last Call —" label:

```tsx
<span className="text-xs font-bold uppercase tracking-wide text-amber-700">
  Last Call —
</span>
```

With:

```tsx
<span
  className="text-xs font-bold uppercase tracking-wide"
  style={{ color: '#8b6914', letterSpacing: '0.1em', fontFamily: 'Georgia, serif' }}
>
  Last Call —
</span>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/floorplan/FloorplanGrid.tsx
git commit -m "feat: wrap FloorplanGrid in background image, restyle party strip and rush row"
```

---

### Task 4: Art Deco grid frame and cell state palette

**Files:**
- Modify: `src/components/floorplan/FloorplanGrid.tsx`

- [ ] **Step 1: Replace the grid wrapper with the Art Deco frame**

The current grid wrapper div (inside the `wrapperRef` div) is:

```tsx
<div
  className={`
    grid gap-1 bg-[#141414]/10 p-1 rounded-xl border-2 border-[#141414]/20
    ${!isSeating && !hoveredPartyId ? "opacity-80 grayscale-[0.2]" : ""}
    ${!isSeating && hoveredPartyId ? "opacity-100" : ""}
    ${isSeating ? "ring-4 ring-emerald-500/20" : ""}
  `}
  style={{
    width: gridSize || "100%",
    gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
    touchAction: 'none',
  }}
  onPointerUp={handleGridPointerUp}
  onPointerLeave={handleGridPointerUp}
  onPointerCancel={handleGridPointerUp}
  id="floorplan-grid"
>
```

Replace with a two-element structure: an outer frame div + inner grid div:

```tsx
{/* Art Deco frame */}
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
  {/* Corner ornaments */}
  <div style={{ position:'absolute', top:4, left:4,   width:9, height:9, borderTop:'2px solid #c9a227', borderLeft:'2px solid #c9a227' }} />
  <div style={{ position:'absolute', top:4, right:4,  width:9, height:9, borderTop:'2px solid #c9a227', borderRight:'2px solid #c9a227' }} />
  <div style={{ position:'absolute', bottom:4, left:4,  width:9, height:9, borderBottom:'2px solid #c9a227', borderLeft:'2px solid #c9a227' }} />
  <div style={{ position:'absolute', bottom:4, right:4, width:9, height:9, borderBottom:'2px solid #c9a227', borderRight:'2px solid #c9a227' }} />

  {/* Grid */}
  <div
    className="grid gap-1"
    style={{
      width: gridSize ? gridSize - 22 : '100%',
      gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
      touchAction: 'none',
    }}
    onPointerUp={handleGridPointerUp}
    onPointerLeave={handleGridPointerUp}
    onPointerCancel={handleGridPointerUp}
    id="floorplan-grid"
  >
```

Close both the inner grid `</div>` and the outer frame `</div>` at the end (replacing the single closing `</div>` that was there before).

- [ ] **Step 2: Replace cell className logic with Art Deco palette**

Replace the current `<button>` className block inside the grid map:

```tsx
className={`
  aspect-square rounded-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5
  ${isBlocked ? "bg-[#141414]/70 cursor-not-allowed opacity-60" : ""}
  ${!isBlocked && cell.state === CellState.EMPTY ? "bg-white" : ""}
  ${!isBlocked && cell.state === CellState.EMPTY && isSeating ? "hover:bg-emerald-100 cursor-pointer" : ""}
  ${!isBlocked && cell.state === CellState.SELECTED ? "bg-emerald-500 shadow-inner scale-95" : ""}
  ${!isBlocked && cell.state === CellState.OCCUPIED && !isAboutToFree ? "bg-[#141414] cursor-not-allowed" : ""}
  ${!isBlocked && isAboutToFree ? "bg-amber-400 cursor-not-allowed" : ""}
  ${!isSeating ? "cursor-default" : ""}
  ${hoveredPartyId && cell.partyId === hoveredPartyId ? "ring-2 ring-amber-400 ring-inset brightness-125 scale-105" : ""}
`}
```

With a style-based approach:

```tsx
className="aspect-square rounded-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5"
style={(() => {
  if (isBlocked) return {
    background: 'rgba(8,8,8,0.75)',
    border: '1px solid #1a1208',
    opacity: 0.45,
    cursor: 'not-allowed',
  };
  if (cell.state === CellState.SELECTED) return {
    background: 'rgba(38,28,0,0.92)',
    border: '2px solid #c9a227',
    boxShadow: '0 0 14px rgba(201,162,39,0.65), inset 0 0 8px rgba(201,162,39,0.12)',
    transform: 'scale(0.93)',
    cursor: 'pointer',
  };
  if (isAboutToFree) return {
    background: 'rgba(38,8,0,0.88)',
    border: '1px solid #8b1a1a',
    boxShadow: '0 0 10px rgba(139,26,26,0.55)',
    cursor: 'not-allowed',
  };
  if (cell.state === CellState.OCCUPIED) return {
    background: 'rgba(18,10,4,0.82)',
    border: '1px solid #c9a227',
    boxShadow: '0 0 10px rgba(201,162,39,0.45), inset 0 0 6px rgba(201,162,39,0.06)',
    cursor: 'not-allowed',
    ...(hoveredPartyId && cell.partyId === hoveredPartyId
      ? { boxShadow: '0 0 16px rgba(201,162,39,0.8)', transform: 'scale(1.05)' }
      : {}),
  };
  // EMPTY
  return {
    background: 'rgba(18,10,4,0.82)',
    border: '1px solid #4a2e14',
    cursor: isSeating ? 'pointer' : 'default',
  };
})()}
```

- [ ] **Step 3: Replace occupied cell content with `CandleGlow`**

Replace the occupied cell content block:

```tsx
{cell.state === CellState.OCCUPIED && (
  <>
    <Users
      className={`w-3 h-3 shrink-0 ${isAboutToFree ? "text-amber-900" : "text-[#E4E3E0]/50"}`}
    />
    {cell.mealDuration !== undefined && (
      <span
        className={`text-[9px] font-mono font-bold leading-none tabular-nums ${isAboutToFree ? "text-stone-900" : "text-amber-400/90"}`}
        title={`${cell.mealDuration} in-game minutes remaining`}
      >
        {cell.mealDuration}m
      </span>
    )}
  </>
)}
```

With:

```tsx
{cell.state === CellState.OCCUPIED && cell.mealDuration !== undefined && (
  <CandleGlow mealDuration={cell.mealDuration} isCritical={isAboutToFree} />
)}
```

- [ ] **Step 4: Keep hover style for empty cells in seating mode**

The style IIFE above returns a static object for EMPTY. Add CSS pseudo-class hover by converting the button to also accept an `onMouseEnter`/`onMouseLeave` approach — but since we're using inline styles, the simplest way is to add a Tailwind class only for the hover bg variant. Add the following conditional className addition for empty+seating:

Append to the existing `className` string on the button:

```tsx
className={`aspect-square rounded-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5${
  !isBlocked && cell.state === CellState.EMPTY && isSeating ? ' hover:brightness-150' : ''
}`}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/floorplan/FloorplanGrid.tsx
git commit -m "feat: apply Art Deco grid frame, brass cell palette, and CandleGlow on occupied tables"
```

---

### Task 5: Smoke-test in browser

**Files:** none changed

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to the floorplan view**

Open `http://localhost:3000`. Start a game, then click the **Floorplan** tab. Verify:

- Restaurant interior image visible behind the grid
- Header shows gold serif "FLOORPLAN" text with burgundy-gold accent stripe
- Grid cells are dark with brass borders
- Occupied cells show a flickering candle and time remaining in gold
- About-to-free cells show a red candle
- Selected cells (during seating) show a gold ring and scale-down
- Blocked cells are dimmed

- [ ] **Step 3: Test seating flow**

Accept a party at the desk and seat them. Verify:
- Party strip appears with Art Deco background and gold party dots
- Dragging across cells selects them with gold highlight
- Auto-confirm fires correctly
- Confirm/Refuse buttons still work

- [ ] **Step 4: Test overtime / rush row**

Run the game to overtime. Verify:
- Rush row appears with dark background and gold "Last Call —" text
- Rush table buttons still work

- [ ] **Step 5: Final commit if any fixups were needed**

```bash
git add -p
git commit -m "fix: floorplan brass-glass visual fixups after smoke test"
```

(Skip if no changes needed.)
