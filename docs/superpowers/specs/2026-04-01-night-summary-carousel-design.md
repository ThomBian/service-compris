# Design Spec: Night Summary Carousel ("Shift Summary Juice")

**Date:** 2026-04-01  
**Status:** Approved  
**Source spec:** Service Compris/Specs/2026-04-night-summary.md (Obsidian)

---

## 1. Overview

The end-of-shift corkboard is replaced by a sequential, player-driven **carousel reveal**. Each of the three summary elements (Newspaper, Ledger, Memo) slides into center focus one at a time. The player acknowledges each with `[ENTER]` (primary) or a mouse click (alias). Once all three are dismissed, a final arranged view appears with the stamp (loss only) and CTAs.

The Activity Log paper is **removed entirely** — no fallback, no link, no archive.

---

## 2. Architecture

### 2.1 Hook: `useCarouselSummary`

Owns all carousel state. No timers drive progression — every step is player-triggered.

```typescript
type CarouselStep = 'newspaper' | 'ledger' | 'memo' | 'final'

interface CarouselState {
  step: CarouselStep
  isRevealing: boolean     // true while text/line animation is running
  canAdvance: boolean      // true once reveal completes (isRevealing === false)
  revealedChars: number    // for headline (newspaper) and body (memo) character reveals
  revealedLines: number    // for ledger line-by-line reveal
}
```

**`advance()`** — the single player action:
- If `isRevealing`: skip reveal (jump to full text instantly, mark `canAdvance = true`)
- If `canAdvance`: play SWISH SFX, move to next step, reset reveal state

Exposed additionally:
- `triggerStampSfx()` — called by CorkboardScreen when stamp fires in `final` step

### 2.2 Components

| Component | Responsibility |
|---|---|
| `CorkboardScreen` | Thin orchestrator: background, ENTER listener, step routing, stamp + CTAs in final |
| `NewspaperReveal` | Newspaper slide-in, headline char reveal, telegraph SFX, dismiss to top-left |
| `LedgerReveal` | Ledger slide-in, line-by-line reveal, odometer SFX + DING, dismiss to top-right |
| `MemoReveal` | Mr. V memo slide-in, full text char reveal, typewriter SFX, dismiss to bottom-center |

Each reveal component receives:
- `revealProgress` / `revealedChars` / `revealedLines` from the hook
- `canAdvance: boolean`
- `isActive: boolean` — whether this paper is currently in center focus
- `isDismissed: boolean` — whether to render in corner position

---

## 3. Carousel Sequence

### Step 1 — Newspaper (World Reaction)
- Slides into screen center on mount
- **Headline:** reveals character-by-character; telegraph SFX fires per character
- **Body text:** appears instantly once headline completes
- `[ PRESS ENTER ]` blinking prompt appears when `canAdvance`
- On advance: SWISH SFX → newspaper shrinks + slides to **top-left corner** (CSS transform, ~400ms)

### Step 2 — Ledger (Financials)
- Slides into center
- Lines reveal one at a time, **300ms between each line**
- Rolling odometer SFX plays while lines reveal; DING on final line
- Lines (same as today): Revenue · Covers Seated · Salaries · Electricity · Food · Net Profit · Cash on Hand · Rating
- `[ PRESS ENTER ]` when `canAdvance`
- On advance: SWISH SFX → ledger shrinks + slides to **top-right corner**

### Step 3 — Memo (Mr. V's Next Threat)
- Uses the existing Mr. V visual (in-game dialogue style)
- Full memo text reveals character-by-character; heavy typewriter SFX per character
- `[ PRESS ENTER ]` when `canAdvance`
- On advance: SWISH SFX → memo shrinks + slides to **bottom-center**

---

## 4. Final State

Once the memo is dismissed, `step === 'final'`:

1. **Overlay lifts:** dark opacity overlay fades out
2. **Layout:** all three dismissed papers are now visible and spaced on the mahogany desk — decorative only, no interaction, no zoom
3. **Stamp (loss only):** fires automatically ~500ms after entering `final`
   - Hand slams rubber stamp onto the Ledger (THWACK SFX + paper crinkle)
   - Stamp is styled: bold text, rotated ~-15°, red ink, overlaid on ledger corner
   - Three variants by `lossReason`:
     - `MORALE` → **"DÉMISSIONNÉ"**
     - `VIP` → **"SCANDALE"**
     - `BANNED` → **"COMPROMIS"**
4. **CTAs fade in** after stamp completes (win: ~500ms after `final`; loss: after stamp animation)
   - Win: `[ OPEN THE DOORS ]` + `[ SUBMIT RESIGNATION ]`
   - Loss: `[ SUBMIT RESIGNATION ]` only

---

## 5. Audio Design

| Event | SFX | Status |
|---|---|---|
| Headline character reveal | Telegraph typing | Placeholder needed |
| Ledger line reveal (rolling) | Adding machine clack | Placeholder needed |
| Ledger final line | DING | Placeholder needed |
| Memo character reveal | Heavy typewriter strike | Reuse existing |
| Step transition (ENTER) | Paper swish across desk | Placeholder needed |
| Stamp | Bass-boosted wooden THWACK | Placeholder needed |
| Stamp settle | Paper crinkle | Placeholder needed |

Placeholder files are added to the project under `public/sfx/` with silent or stub audio. Real assets to be dropped in by the designer — no code changes required.

---

## 6. Input Handling

- **ENTER key** (primary): triggers `advance()` anywhere during carousel
- **Mouse click** (alias): triggers `advance()` on click anywhere on the screen during carousel
- Both disabled during the `final` step (CTAs take over)

---

## 7. What Changes vs. Today

| Area | Before | After |
|---|---|---|
| Progression | Auto-timed (setTimeout delays) | Player-driven (ENTER / click) |
| Order | Ledger → Newspaper → Letter → Activity Log | Newspaper → Ledger → Memo |
| Activity Log | Paper pinned on corkboard | Removed entirely |
| Text reveals | No char-by-char reveals | Headline + memo: char-by-char; ledger: 300ms/line |
| Stamp timing | During ledger reveal | After all three dismissed |
| Stamp variants | One style | Three (DÉMISSIONNÉ / SCANDALE / COMPROMIS) |
| CTAs | Available early | Fade in only in `final` step |

---

## 8. Out of Scope

- Re-reading dismissed papers (decorative only once dismissed)
- Mobile/touch swipe navigation (ENTER + click is sufficient for now)
- Accessibility (keyboard focus management deferred)
