# Design: Maître D' Figure, Wrapping Bubbles, Storm-Out Bubble

**Date:** 2026-03-22
**Scope:** `src/components/scene/DeskScene.tsx` only

---

## 1. Maître D' — SVG Tuxedo Figure

Replace the current placeholder shape (`w-10 h-14 bg-[#141414] rounded-t-full` with a ◆ icon) with the following SVG:

```svg
<svg width="48" height="72" viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="12" r="10" fill="#141414"/>
  <rect x="21" y="21" width="6" height="5" fill="#141414"/>
  <polygon points="18,26 24,29 18,32" fill="#555"/>
  <polygon points="30,26 24,29 30,32" fill="#555"/>
  <circle cx="24" cy="29" r="1.5" fill="#333"/>
  <rect x="14" y="26" width="20" height="26" rx="3" fill="#141414"/>
  <rect x="21" y="28" width="6" height="20" rx="1" fill="white"/>
  <line x1="14" y1="30" x2="6" y2="48" stroke="#141414" stroke-width="5" stroke-linecap="round"/>
  <line x1="34" y1="30" x2="42" y2="48" stroke="#141414" stroke-width="5" stroke-linecap="round"/>
  <line x1="19" y1="52" x2="14" y2="70" stroke="#141414" stroke-width="5" stroke-linecap="round"/>
  <line x1="29" y1="52" x2="34" y2="70" stroke="#141414" stroke-width="5" stroke-linecap="round"/>
</svg>
```

The label "Maître D'" beneath is unchanged.

---

## 2. Speech Bubbles — Wrap Instead of Truncate

`SpeechBubble` currently has `max-w-[160px] truncate` in its className. Remove `truncate` and add `whitespace-normal break-words leading-snug`. Keep `max-w-[160px]`. The bubble div has no fixed height and no `overflow-hidden` — it grows naturally. The `title` attribute stays.

There is one `SpeechBubble` component in `DeskScene.tsx`, used for both the maître d' and guest. A single className edit covers both.

Add a `variant?: 'default' | 'storm'` prop to `SpeechBubble`:
- `'default'` (or undefined): existing white styling.
- `'storm'`: `bg-red-50 border-red-600 text-red-700 font-semibold shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]`, tail color `#dc2626`.

---

## 3. Storm-Out Bubble

### State and refs

```ts
const [stormedOut, setStormedOut] = useState<{ message: string } | null>(null);
const prevQueueRef = useRef<typeof queue>([]);       // snapshot of previous queue
const stormTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

### Detection — useEffect

```ts
useEffect(() => {
  const prev = prevQueueRef.current;
  const currentIds = new Set(queue.map(c => c.id));

  for (const client of prev) {
    if (!currentIds.has(client.id) && client.patience <= 0) {
      // This client stormed out
      if (stormTimerRef.current) clearTimeout(stormTimerRef.current);
      const message = STORM_OUT_LINES[Math.floor(Math.random() * STORM_OUT_LINES.length)];
      setStormedOut({ message });
      stormTimerRef.current = setTimeout(() => setStormedOut(null), 2000);
      break; // one bubble at a time; last-wins if multiple storm out on same tick
    }
  }

  prevQueueRef.current = queue; // update AFTER comparison, inside effect body

  return () => {
    if (stormTimerRef.current) clearTimeout(stormTimerRef.current);
  };
}, [queue]);
```

`prevQueueRef.current` is the previous render's queue — client objects still exist there with their patience values. The current queue is already updated, so the disappeared client can only be found in `prevQueueRef`.

### Phrases

```ts
const STORM_OUT_LINES = [
  "This is outrageous!",
  "I'm never coming back!",
  "What a disgrace!",
  "Absolutely unacceptable!",
  "You'll be hearing from my lawyer!",
];
```

### Render

The `StormBubble` is a `SpeechBubble` with `variant="storm"`. It renders in the queue section, as the first child of the queue `div`, above the queue icons:

```tsx
{/* Queue */}
<div className="flex flex-col flex-1 overflow-x-auto pb-1">
  <AnimatePresence>
    {stormedOut && (
      <SpeechBubble text={stormedOut.message} variant="storm" />
    )}
  </AnimatePresence>
  <div className="flex items-end gap-2">
    {/* existing queue icons */}
  </div>
</div>
```

This places the bubble naturally above the queue row without absolute positioning, inside the existing flex column.

---

## Dependencies

- `motion/react` (`AnimatePresence`, `motion.div`) — already imported in `DeskScene.tsx`.
- No new packages needed.

## Files Changed

- `src/components/scene/DeskScene.tsx` — all three changes contained here.

No new files. No changes to game logic, types, or other components.
