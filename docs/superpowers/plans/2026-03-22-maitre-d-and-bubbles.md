# Maître D' Figure, Wrapping Bubbles & Storm-Out Bubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the maître d' look like a tuxedo-clad person, let speech bubbles wrap in height instead of truncating, and show a brief red angry bubble when a queue guest storms out.

**Architecture:** All changes are self-contained in `src/components/scene/DeskScene.tsx`. `SpeechBubble` gets a `variant` prop for reuse in both normal and storm contexts. Storm-out detection uses two refs to diff the queue between renders without touching game logic.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, `motion/react` (AnimatePresence + motion.div — already imported)

---

## File Map

| File | Change |
|---|---|
| `src/components/scene/DeskScene.tsx` | All changes — SpeechBubble variant prop, SVG figure, storm-out state/effects/render |

No new files. No other files touched.

---

### Task 1: Add `variant` prop to `SpeechBubble` and fix wrapping

**Files:**
- Modify: `src/components/scene/DeskScene.tsx` (lines 7–37 — `SpeechBubbleProps` and `SpeechBubble` component)

- [ ] **Step 1: Update `SpeechBubbleProps` to accept an optional `variant` prop**

In `DeskScene.tsx`, change the interface at the top:

```tsx
interface SpeechBubbleProps {
  text: string | undefined;
  variant?: 'default' | 'storm';
}
```

- [ ] **Step 2: Update the `SpeechBubble` component body**

Replace the existing `SpeechBubble` component with:

```tsx
const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, variant = 'default' }) => {
  const isStorm = variant === 'storm';
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          title={text}
          className={`relative rounded-lg px-2 py-1 text-[10px] max-w-[160px] whitespace-normal break-words leading-snug mb-1 ${
            isStorm
              ? 'bg-red-50 border border-red-600 text-red-700 font-semibold shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]'
              : 'bg-white border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]'
          }`}
        >
          {text}
          <span
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: isStorm ? '6px solid #dc2626' : '6px solid #141414',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

Key changes from original:
- Added `variant` prop (default `'default'`)
- Removed `truncate` — replaced with `whitespace-normal break-words leading-snug`
- Conditional className and tail color based on variant
- `SpeechBubble` manages its own `AnimatePresence` internally — callers do NOT wrap it in a second one

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: add variant prop to SpeechBubble, fix wrapping (remove truncate)"
```

---

### Task 2: Replace maître d' placeholder with SVG tuxedo figure

**Files:**
- Modify: `src/components/scene/DeskScene.tsx` (maître d' section)

- [ ] **Step 1: Replace the placeholder div with the SVG figure**

Find this block in the maître d' section:

```tsx
<div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-center justify-center text-white">
  <span className="text-base leading-none">◆</span>
</div>
```

Replace with:

```tsx
<svg width="48" height="72" viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  {/* Head */}
  <circle cx="24" cy="12" r="10" fill="#141414"/>
  {/* Neck */}
  <rect x="21" y="21" width="6" height="5" fill="#141414"/>
  {/* Bow tie */}
  <polygon points="18,26 24,29 18,32" fill="#555"/>
  <polygon points="30,26 24,29 30,32" fill="#555"/>
  <circle cx="24" cy="29" r="1.5" fill="#333"/>
  {/* Suit body */}
  <rect x="14" y="26" width="20" height="26" rx="3" fill="#141414"/>
  {/* White shirt front */}
  <rect x="21" y="28" width="6" height="20" rx="1" fill="white"/>
  {/* Arms */}
  <line x1="14" y1="30" x2="6" y2="48" stroke="#141414" strokeWidth="5" strokeLinecap="round"/>
  <line x1="34" y1="30" x2="42" y2="48" stroke="#141414" strokeWidth="5" strokeLinecap="round"/>
  {/* Legs */}
  <line x1="19" y1="52" x2="14" y2="70" stroke="#141414" strokeWidth="5" strokeLinecap="round"/>
  <line x1="29" y1="52" x2="34" y2="70" stroke="#141414" strokeWidth="5" strokeLinecap="round"/>
</svg>
```

Note: SVG attributes in JSX use camelCase (`strokeWidth`, `strokeLinecap`), not kebab-case as in HTML/SVG.

- [ ] **Step 2: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Open http://localhost:3000. The maître d' should now appear as a tuxedo figure with head, bow tie, suit body with white shirt strip, arms, and legs.

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: replace maître d' placeholder with SVG tuxedo figure"
```

---

### Task 3: Storm-out bubble — detection and render

**Files:**
- Modify: `src/components/scene/DeskScene.tsx` (add state, refs, two effects, and render)

- [ ] **Step 1: Add `useState`, `useRef`, `useEffect` to the React import**

The component is currently stateless — update the React import:

```tsx
import React, { useState, useRef, useEffect } from 'react';
```

- [ ] **Step 2: Add the storm-out phrase constant**

Just before the `SpeechBubble` component definition, add:

```tsx
const STORM_OUT_LINES = [
  "This is outrageous!",
  "I'm never coming back!",
  "What a disgrace!",
  "Absolutely unacceptable!",
  "You'll be hearing from my lawyer!",
];
```

- [ ] **Step 3: Add state and refs inside `DeskScene`**

Inside the `DeskScene` component body, after the existing derived values (`canSeat`, `maitreDMessage`, `guestMessage`):

```tsx
const [stormedOut, setStormedOut] = useState<{ message: string } | null>(null);
const prevQueueRef = useRef<typeof queue>([]);
const stormTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 4: Add the detection `useEffect` (no cleanup — see Step 5)**

```tsx
useEffect(() => {
  const prev = prevQueueRef.current;
  const currentIds = new Set(queue.map(c => c.id));

  for (const client of prev) {
    if (!currentIds.has(client.id) && client.patience <= 0) {
      if (stormTimerRef.current) clearTimeout(stormTimerRef.current);
      const message = STORM_OUT_LINES[Math.floor(Math.random() * STORM_OUT_LINES.length)];
      setStormedOut({ message });
      stormTimerRef.current = setTimeout(() => setStormedOut(null), 2000);
      break;
    }
  }

  prevQueueRef.current = queue;
  // No cleanup return here — returning a cleanup would cancel the timer
  // on every queue tick. The unmount cleanup is in a separate effect (Step 5).
}, [queue]);
```

**Why no cleanup here:** React's `useEffect` cleanup runs before the next effect call (i.e., on every queue change). If we returned `() => clearTimeout(stormTimerRef.current)` here, the 2-second timer would be cancelled on the very next game tick, before the bubble had a chance to display. The timer is instead cleaned up on unmount via a dedicated effect in the next step.

- [ ] **Step 5: Add the unmount-only cleanup effect**

```tsx
useEffect(() => {
  return () => {
    if (stormTimerRef.current) clearTimeout(stormTimerRef.current);
  };
}, []); // empty deps — runs cleanup only on unmount
```

- [ ] **Step 6: Update the queue section render**

The storm bubble is rendered by simply passing `stormedOut?.message` into a `SpeechBubble` with `variant="storm"`. Because `SpeechBubble` manages its own `AnimatePresence` internally, do NOT wrap it in another `AnimatePresence` — that would nest two `AnimatePresence` instances and break the exit animation.

Find the existing queue section:

```tsx
{/* Queue */}
<div className="flex items-end gap-2 flex-1 overflow-x-auto pb-1">
  {queue.length === 0 ? (
    <span className="text-xs italic opacity-30">Queue is empty</span>
  ) : (
    queue.map((c) => (
      <div key={c.id} className="flex flex-col items-center gap-0.5 shrink-0">
        <Users size={16} className="opacity-60" />
        <div
          className="w-1 rounded-full bg-emerald-500"
          style={{ height: Math.max(2, (c.patience / 100) * 20) }}
        />
      </div>
    ))
  )}
</div>
```

Replace with:

```tsx
{/* Queue */}
<div className="flex flex-col flex-1 overflow-x-hidden pb-1 gap-1">
  <SpeechBubble text={stormedOut?.message} variant="storm" />
  <div className="flex items-end gap-2 overflow-x-auto">
    {queue.length === 0 ? (
      <span className="text-xs italic opacity-30">Queue is empty</span>
    ) : (
      queue.map((c) => (
        <div key={c.id} className="flex flex-col items-center gap-0.5 shrink-0">
          <Users size={16} className="opacity-60" />
          <div
            className="w-1 rounded-full bg-emerald-500"
            style={{ height: Math.max(2, (c.patience / 100) * 20) }}
          />
        </div>
      ))
    )}
  </div>
</div>
```

The outer div becomes a flex column. `SpeechBubble` renders nothing when `text` is undefined (its internal `AnimatePresence` gates on `text`), so it takes up no space when idle. The "Queue is empty" branch is preserved inside the inner row.

- [ ] **Step 7: Type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 8: Verify visually**

```bash
npm run dev
```

Open http://localhost:3000. Speed up the clock and let a queue member's patience bar drain to zero. A red speech bubble with an angry phrase should appear above the queue row for ~2 seconds, then fade out.

- [ ] **Step 9: Run the full test suite to confirm no regressions**

```bash
npm run test
```

Expected: all existing tests pass (changes are UI-only; game logic is untouched).

- [ ] **Step 10: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: add storm-out bubble — red animated speech bubble when queue guest leaves"
```
