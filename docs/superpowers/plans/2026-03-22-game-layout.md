# Game Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 3-column layout with a two-view toggle model — View A (Desk) and View B (Floorplan) — separated by a 2D scene panel on top and a context-specific tool panel below.

**Architecture:** `App.tsx` holds `view: 'desk' | 'floorplan'` state. A shared `ScenePanel` renders different 2D scenes per view; a shared `BottomPanel` swaps between `DeskTools` and `FloorplanGrid`. Clicking the Door in `DeskScene` triggers `seatParty()` and switches to View B; all three floorplan resolutions (perfect fit, crop+confirm, forced refuse) clear `currentClient` and trigger auto-return to View A via a `useEffect`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Framer Motion (`motion/react`), Vitest (tests), Lucide React (icons)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `src/components/ScenePanel.tsx` | Scene wrapper — renders `DeskScene` or `FloorplanScene` based on `view` prop |
| `src/components/BottomPanel.tsx` | Panel wrapper — renders `DeskTools` or `FloorplanGrid` based on `view` prop. Owns cross-fade animation. |
| `src/components/scene/DeskScene.tsx` | 2D side-view: Door (clickable), Maître D', Desk/party, Queue |
| `src/components/scene/FloorplanScene.tsx` | 2D side-view: Maître D', current party (with seat highlights), occupied guest count |
| `src/components/desk/DeskTools.tsx` | Layout container for the four desk tools |
| `src/components/desk/BookingLedger.tsx` | Reservation list (replaces `BookingList.tsx`) |
| `src/components/desk/PartyTicket.tsx` | Current client chat + question buttons + Refuse/Wait actions |
| `src/components/desk/Clipboard.tsx` | Placeholder: Menu / VIPs / Banned List |
| `src/components/desk/MiniGrid.tsx` | Read-only grid snapshot (EMPTY/OCCUPIED only) |
| `src/components/floorplan/FloorplanGrid.tsx` | Interactive seating grid (moved from `components/`) |

### Modified files
| File | Change |
|---|---|
| `src/logic/gameLogic.ts` | Add `handleSeatingRefusal()` pure function |
| `src/hooks/useDecisionActions.ts` | Add `refuseSeatedParty()`, remove `cancelSeating()` |
| `src/hooks/useGameEngine.ts` | Expose `refuseSeatedParty`, remove `cancelSeating` |
| `src/context/GameContext.tsx` | Update `GameContextType`: add `refuseSeatedParty`, remove `cancelSeating` |
| `src/App.tsx` | Full rewire: view state, flex-column layout, clean up overlay/breakpoint logic |
| `src/components/TopBar.tsx` | Remove dead props: `showLogs`, `toggleLogs`, `showBookings`, `toggleBookings`, `is2xl` |

### Deleted files
- `src/components/Podium.tsx`
- `src/components/BookingList.tsx`
- `src/components/QueuePreview.tsx`
- `src/components/RightPanel.tsx`
- `src/components/FloorplanGrid.tsx` (replaced by `floorplan/FloorplanGrid.tsx`)
- `src/hooks/useMediaQuery.ts` (only used for breakpoint logic being removed)

---

## Task 1: Add `handleSeatingRefusal` to gameLogic

**Files:**
- Modify: `src/logic/gameLogic.ts`
- Test: `src/logic/__tests__/gameLogic.test.ts`

The penalty for refusing after accepting: `-1.5` rating (3× unjustified refusal), `-30` morale, no cash change. The `hasLied` flag is irrelevant here — the player accepted the risk by clicking the Door.

- [ ] **Step 1: Write the failing test**

Add to `src/logic/__tests__/gameLogic.test.ts`:

```ts
import { handleSeatingRefusal } from '../gameLogic'; // add to import

describe('handleSeatingRefusal', () => {
  it('applies a heavy rating and morale penalty regardless of client type', () => {
    const client = makeClient({ type: ClientType.WALK_IN, lieType: LieType.NONE });
    const result = handleSeatingRefusal(client, 4.0, 80, []);
    expect(result.nextRating).toBeCloseTo(2.5);
    expect(result.nextMorale).toBe(50);
    expect(result.nextLogs[0]).toMatch(/Refused after seating/i);
  });

  it('clamps rating to 0 if penalty exceeds current rating', () => {
    const client = makeClient();
    const result = handleSeatingRefusal(client, 1.0, 20, []);
    expect(result.nextRating).toBe(0);
    expect(result.nextMorale).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --reporter=verbose src/logic/__tests__/gameLogic.test.ts
```

Expected: FAIL — `handleSeatingRefusal is not a function`

- [ ] **Step 3: Implement `handleSeatingRefusal` in gameLogic.ts**

Add after `handleRefusedClient`:

```ts
export function handleSeatingRefusal(
  client: Client,
  currentRating: number,
  currentMorale: number,
  currentLogs: string[]
) {
  const nextRating = Math.max(0, currentRating - 1.5);
  const nextMorale = Math.max(0, currentMorale - 30);
  const nextLogs = [
    `Refused after seating: You accepted ${client.trueFirstName} then turned them away. Guests are furious.`,
    ...currentLogs
  ];
  return { nextRating, nextMorale, nextLogs };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/logic/__tests__/gameLogic.test.ts
```

Expected: all `handleSeatingRefusal` tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic/gameLogic.ts src/logic/__tests__/gameLogic.test.ts
git commit -m "feat: add handleSeatingRefusal pure function with heavy penalty"
```

---

## Task 2: Add `refuseSeatedParty`, remove `cancelSeating` from GameContext

**Files:**
- Modify: `src/hooks/useDecisionActions.ts`
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1: Add `refuseSeatedParty` to `useDecisionActions.ts`**

Add this import at the top:
```ts
import { handleAcceptedClient, handleRefusedClient, handleSeatingRefusal, canSelectCell } from '../logic/gameLogic';
```

Add after `confirmSeating`:
```ts
const refuseSeatedParty = useCallback(() => {
  setGameState(prev => {
    if (!prev.currentClient || prev.currentClient.physicalState !== PhysicalState.SEATING) return prev;
    const { nextRating, nextMorale, nextLogs } = handleSeatingRefusal(
      prev.currentClient,
      prev.rating,
      prev.morale,
      prev.logs
    );
    const nextGrid = prev.grid.map(row => row.map(cell =>
      cell.state === CellState.SELECTED ? { ...cell, state: CellState.EMPTY } : cell
    ));
    return {
      ...prev,
      currentClient: null,
      grid: nextGrid,
      rating: nextRating,
      morale: nextMorale,
      logs: nextLogs.slice(0, 50)
    };
  });
}, [setGameState]);
```

Remove the `cancelSeating` function entirely. Update the return object to replace `cancelSeating` with `refuseSeatedParty`:
```ts
return {
  handleDecision,
  waitInLine,
  seatParty,
  toggleCellSelection,
  confirmSeating,
  refuseSeatedParty
};
```

- [ ] **Step 2: Update `useGameEngine.ts`**

Replace `cancelSeating` with `refuseSeatedParty` in the destructure and return:
```ts
const {
  handleDecision,
  waitInLine,
  seatParty,
  toggleCellSelection,
  confirmSeating,
  refuseSeatedParty
} = useDecisionActions(setGameState);
```

Return object — replace `cancelSeating: cancelSeating` with `refuseSeatedParty`.

- [ ] **Step 3: Update `GameContext.tsx`**

Replace `cancelSeating: () => void` with `refuseSeatedParty: () => void` in `GameContextType`.

- [ ] **Step 4: Run lint to verify no type errors**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useDecisionActions.ts src/hooks/useGameEngine.ts src/context/GameContext.tsx
git commit -m "feat: add refuseSeatedParty action, remove cancelSeating"
```

---

## Task 3: Move FloorplanGrid — swap Cancel for Refuse Party

**Files:**
- Create: `src/components/floorplan/FloorplanGrid.tsx` (move + modify)
- Delete: `src/components/FloorplanGrid.tsx`

The Cancel button becomes a "Refuse Party" button that calls `refuseSeatedParty` instead of `cancelSeating`.

- [ ] **Step 1: Create `src/components/floorplan/` directory and new file**

Copy `src/components/FloorplanGrid.tsx` to `src/components/floorplan/FloorplanGrid.tsx`. Update:

1. Import path fix — `useGame` import: `'../../context/GameContext'` → `'../../context/GameContext'` (no change needed if relative)
   Actually the path from `floorplan/` to `context/` is `../../context/GameContext`

2. Update the `useGame` destructure — replace `cancelSeating` with `refuseSeatedParty`:
```ts
const {
  gameState,
  toggleCellSelection,
  confirmSeating,
  refuseSeatedParty
} = useGame();
```

3. Replace the Cancel button with a Refuse Party button:
```tsx
<button
  onClick={refuseSeatedParty}
  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-all flex items-center gap-1.5"
  id="refuse-party-btn"
>
  <X className="w-3 h-3" />
  Refuse Party
</button>
```

Fix all relative import paths (e.g., `../types` → `../../types`, `../constants` → `../../constants`, `../hooks/useContainerSize` → `../../hooks/useContainerSize`).

- [ ] **Step 2: Delete the old FloorplanGrid**

```bash
git rm src/components/FloorplanGrid.tsx
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: type errors from `App.tsx` and `RightPanel.tsx` which still import the old path — these will be fixed in Task 13. Any other unexpected errors must be investigated before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/components/floorplan/FloorplanGrid.tsx
git commit -m "refactor: move FloorplanGrid to floorplan/ subfolder, replace Cancel with Refuse Party"
```

---

## Task 4: MiniGrid component

**Files:**
- Create: `src/components/desk/MiniGrid.tsx`

Reads-only snapshot: only `EMPTY` and `OCCUPIED` states are rendered (no `SELECTED`). Pulls `grid` from `GameContext` directly.

- [ ] **Step 1: Create `src/components/desk/MiniGrid.tsx`**

```tsx
import React from 'react';
import { useGame } from '../../context/GameContext';
import { CellState } from '../../types';
import { GRID_SIZE } from '../../constants';

export const MiniGrid: React.FC = () => {
  const { gameState: { grid } } = useGame();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Floorplan</span>
      <div
        className="grid gap-0.5 bg-stone-300 p-0.5 rounded border border-stone-400"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const isOccupied = cell.state === CellState.OCCUPIED;
            return (
              <div
                key={`mini-${x}-${y}`}
                className={`rounded-sm ${isOccupied ? 'bg-stone-800' : 'bg-white'}`}
                style={{ width: 14, height: 14 }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/desk/MiniGrid.tsx
git commit -m "feat: add MiniGrid read-only floorplan snapshot component"
```

---

## Task 5: BookingLedger component

**Files:**
- Create: `src/components/desk/BookingLedger.tsx`

Pulls all data from `GameContext` directly. Same visual as current `BookingList.tsx`.

- [ ] **Step 1: Create `src/components/desk/BookingLedger.tsx`**

```tsx
import React from 'react';
import { Book, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { formatTime } from '../../utils';

export const BookingLedger: React.FC = () => {
  const { gameState: { reservations, inGameMinutes }, toggleReservationArrived } = useGame();

  return (
    <div className="flex flex-col gap-2 h-full">
      <h3 className="font-serif italic text-lg flex items-center gap-2">
        <Book size={18} />
        Booking Ledger
      </h3>
      <div className="flex-1 overflow-y-auto border border-[#141414] rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#141414] text-[#E4E3E0] text-[10px] uppercase tracking-wider font-bold">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Name</th>
              <th className="p-2">Size</th>
              <th className="p-2 text-center">In</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {reservations.map((res) => {
              const isCurrentTime = Math.abs(inGameMinutes - res.time) <= 30;
              return (
                <tr
                  key={res.id}
                  className={`border-b border-[#141414]/10 transition-colors hover:bg-[#141414]/5 ${
                    isCurrentTime ? 'bg-emerald-50' : ''
                  } ${res.arrived ? 'opacity-40' : ''}`}
                >
                  <td className="p-2 font-bold">{formatTime(res.time)}</td>
                  <td className="p-2">{res.firstName} {res.lastName}</td>
                  <td className="p-2">{res.partySize}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => toggleReservationArrived(res.id)}
                      className={`w-5 h-5 border-2 border-[#141414] rounded flex items-center justify-center transition-colors ${
                        res.arrived ? 'bg-[#141414] text-white' : 'bg-white'
                      }`}
                    >
                      {res.arrived && <Check size={12} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/desk/BookingLedger.tsx
git commit -m "feat: add BookingLedger component (replaces BookingList)"
```

---

## Task 6: PartyTicket component

**Files:**
- Create: `src/components/desk/PartyTicket.tsx`

Houses the current client card: patience bar, guest info, chat history, question buttons, Call Out Lie button, Wait In Line button, and Refuse Entry button. Pulled from `Podium.tsx`. Note: the "Seat Party" button is **removed** — seating is now triggered by the Door in `DeskScene`.

- [ ] **Step 1: Create `src/components/desk/PartyTicket.tsx`**

```tsx
import React from 'react';
import { Users, MessageSquare, Search, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { formatTime } from '../../utils';

export const PartyTicket: React.FC = () => {
  const { gameState: { currentClient }, askQuestion, callOutLie, handleDecision, waitInLine } = useGame();
  const [showLieMenu, setShowLieMenu] = React.useState(false);

  if (!currentClient) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-[#141414] rounded-2xl p-4">
        <Users size={32} />
        <p className="font-bold mt-2 uppercase tracking-widest text-xs">Awaiting next guest...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-white border border-[#141414] rounded-2xl shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] flex flex-col gap-3 relative overflow-hidden p-4">
      {/* Patience Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
        <motion.div
          className={`h-full transition-all duration-500 ${
            currentClient.patience > 50 ? 'bg-emerald-500' :
            currentClient.patience > 20 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${currentClient.patience}%` }}
        />
      </div>

      {/* Guest header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Party Ticket</span>
          <h3 className="text-xl font-bold mt-0.5">
            {currentClient.knownFirstName || '???'} {currentClient.knownLastName || '???'}
          </h3>
          <div className="text-xs opacity-60 mt-0.5 flex flex-wrap items-center gap-x-2">
            <div className="flex items-center gap-0.5 bg-[#141414]/5 px-2 py-0.5 rounded-lg">
              {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
                <span key={i} className="text-xs">👤</span>
              ))}
            </div>
            {currentClient.knownTime !== undefined && (
              <span className="opacity-40">Booked: {formatTime(currentClient.knownTime)}</span>
            )}
          </div>
          {currentClient.isLate && (
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-1">
              <AlertCircle size={10} />
              LATE ARRIVAL
            </div>
          )}
        </div>
        {currentClient.isCaught && (
          <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 flex items-center gap-1">
            <AlertCircle size={10} />
            CAUGHT
          </div>
        )}
      </div>

      {/* Chat history */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f9f9f9] p-3 rounded-xl border border-[#141414] flex flex-col gap-2 font-mono text-xs custom-scrollbar">
        {currentClient.chatHistory.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === 'maitre-d' ? 'items-end' : 'items-start'}`}>
            <span className="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">
              {msg.sender === 'maitre-d' ? "Maître D'" : 'Guest'}
            </span>
            <div className={`px-3 py-1.5 rounded-lg max-w-[90%] border ${
              msg.sender === 'maitre-d'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#141414] border-[#141414]/20'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
      </div>

      {/* Question buttons */}
      <div className="grid grid-cols-3 gap-2">
        {(['firstName', 'lastName', 'time'] as const).map((field) => (
          <button
            key={field}
            onClick={() => askQuestion(field)}
            className="flex flex-col items-center gap-1 p-2 border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-white transition-all group"
          >
            <Search size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-center">
              {field === 'firstName' ? 'First Name' : field === 'lastName' ? 'Last Name' : 'Booking Time'}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowLieMenu(!showLieMenu)}
          className={`col-span-3 flex items-center justify-center gap-2 p-2 border-2 border-orange-600 rounded-xl transition-all group ${
            showLieMenu ? 'bg-orange-600 text-white' : 'text-orange-600 hover:bg-orange-600 hover:text-white'
          }`}
        >
          <AlertCircle size={14} className="group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Call Out Lie</span>
        </button>
      </div>

      {/* Lie menu */}
      <AnimatePresence>
        {showLieMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 bg-orange-50 p-3 rounded-xl border border-orange-200 overflow-hidden"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-800">What are they lying about?</p>
            <div className="flex gap-2">
              {(['size', 'time', 'reservation'] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => { callOutLie(field); setShowLieMenu(false); }}
                  className="flex-1 text-[9px] font-bold uppercase p-2 bg-white border border-orange-300 rounded hover:bg-orange-600 hover:text-white transition-colors"
                >
                  {field === 'size' ? 'Party Size' : field === 'time' ? 'Arriving Late' : 'No Reservation'}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision buttons */}
      <div className="flex gap-2 pt-2 border-t border-[#141414]/10">
        <button
          onClick={waitInLine}
          className="flex-1 bg-amber-500 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-amber-600 transition-colors text-xs shadow-[0px_3px_0px_0px_rgba(217,119,6,1)] active:translate-y-px active:shadow-none"
        >
          <MessageSquare size={14} />
          WAIT IN LINE
        </button>
        <button
          onClick={() => handleDecision(false)}
          className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 hover:bg-red-700 transition-colors text-xs shadow-[0px_3px_0px_0px_rgba(185,28,28,1)] active:translate-y-px active:shadow-none"
        >
          <X size={14} />
          REFUSE
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/desk/PartyTicket.tsx
git commit -m "feat: add PartyTicket component (desk tools panel, no seat button)"
```

---

## Task 7: Clipboard placeholder

**Files:**
- Create: `src/components/desk/Clipboard.tsx`

Placeholder only — interaction behavior is deferred to a future spec (`docs/specs/investigation/investigation-interaction.md`).

- [ ] **Step 1: Create `src/components/desk/Clipboard.tsx`**

```tsx
import React from 'react';
import { Clipboard as ClipboardIcon } from 'lucide-react';

const TABS = ['Menu', 'VIPs', 'Banned'] as const;

export const Clipboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<typeof TABS[number]>('Menu');

  return (
    <div className="flex flex-col gap-1 h-full">
      <div className="flex items-center gap-2">
        <ClipboardIcon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Clipboard</span>
      </div>
      <div className="flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'bg-[#141414]/10 hover:bg-[#141414]/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 border border-[#141414]/20 rounded-lg p-2 text-[10px] opacity-40 italic">
        {activeTab} — coming soon
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/desk/Clipboard.tsx
git commit -m "feat: add Clipboard placeholder component"
```

---

## Task 8: DeskTools layout container

**Files:**
- Create: `src/components/desk/DeskTools.tsx`

Assembles the four desk tools in a 2-column layout.

- [ ] **Step 1: Create `src/components/desk/DeskTools.tsx`**

```tsx
import React from 'react';
import { BookingLedger } from './BookingLedger';
import { Clipboard } from './Clipboard';
import { PartyTicket } from './PartyTicket';
import { MiniGrid } from './MiniGrid';

export const DeskTools: React.FC = () => {
  return (
    <div className="h-full bg-[#E4E3E0] grid grid-cols-[1fr_1fr_1.5fr_auto] gap-4 p-4 overflow-hidden">
      <BookingLedger />
      <Clipboard />
      <PartyTicket />
      <MiniGrid />
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/desk/DeskTools.tsx
git commit -m "feat: add DeskTools layout container"
```

---

## Task 9: DeskScene component

**Files:**
- Create: `src/components/scene/DeskScene.tsx`

2D side-view placeholder of the entrance. The Door is the only interactive element. Pulls `currentClient` and `queue` from context directly.

- [ ] **Step 1: Create `src/components/scene/DeskScene.tsx`**

```tsx
import React from 'react';
import { Users, DoorOpen, DoorClosed } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { PhysicalState } from '../../types';

interface DeskSceneProps {
  onSeatParty: () => void;
}

export const DeskScene: React.FC<DeskSceneProps> = ({ onSeatParty }) => {
  const { gameState: { currentClient, queue } } = useGame();
  const canSeat = currentClient?.physicalState === PhysicalState.AT_DESK;

  return (
    <div className="h-full flex items-end gap-6 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-hidden">
      {/* Door */}
      <button
        onClick={canSeat ? onSeatParty : undefined}
        disabled={!canSeat}
        title={canSeat ? 'Seat this party' : 'No party to seat'}
        className={`flex flex-col items-center gap-1 transition-all ${
          canSeat
            ? 'cursor-pointer opacity-100 hover:scale-105'
            : 'cursor-default opacity-40'
        }`}
      >
        {canSeat ? <DoorOpen size={40} /> : <DoorClosed size={40} />}
        <span className="text-[9px] font-bold uppercase tracking-widest">Door</span>
      </button>

      {/* Maître D' */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-end justify-center text-white text-xs pb-1">
          MD
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Maître D'</span>
      </div>

      {/* Current party at desk */}
      <div className="flex flex-col items-center gap-1 min-w-[60px]">
        {currentClient ? (
          <>
            <div className="flex gap-1">
              {Array.from({ length: currentClient.truePartySize }).map((_, i) => (
                <Users key={i} size={20} className="text-[#141414]" />
              ))}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {currentClient.knownFirstName || '???'}
            </span>
          </>
        ) : (
          <div className="opacity-20 text-[10px] uppercase tracking-widest">— empty —</div>
        )}
      </div>

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
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/DeskScene.tsx
git commit -m "feat: add DeskScene 2D side-view with clickable Door"
```

---

## Task 10: FloorplanScene component

**Files:**
- Create: `src/components/scene/FloorplanScene.tsx`

Shows Maître D', current party with seat highlights, and a count of occupied seats. Pulls data from context.

- [ ] **Step 1: Create `src/components/scene/FloorplanScene.tsx`**

```tsx
import React from 'react';
import { Users } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { CellState } from '../../types';

export const FloorplanScene: React.FC = () => {
  const { gameState: { currentClient, grid } } = useGame();

  const selectedCount = grid.flat().filter(c => c.state === CellState.SELECTED).length;
  const occupiedCount = grid.flat().filter(c => c.state === CellState.OCCUPIED).length;
  const partySize = currentClient?.truePartySize ?? 0;

  return (
    <div className="h-full flex items-end gap-8 px-8 pb-4 border-b border-[#141414] bg-stone-50 overflow-hidden">
      {/* Maître D' */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-10 h-14 bg-[#141414] rounded-t-full flex items-end justify-center text-white text-xs pb-1">
          MD
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Maître D'</span>
      </div>

      {/* Current party being seated — members highlight as placed */}
      {currentClient && (
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex gap-1">
            {Array.from({ length: partySize }).map((_, i) => (
              <Users
                key={i}
                size={20}
                className={i < selectedCount ? 'text-emerald-600' : 'text-[#141414] opacity-30'}
              />
            ))}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">
            {currentClient.trueFirstName} ({selectedCount}/{partySize})
          </span>
        </div>
      )}

      {/* Seated guests indicator */}
      <div className="flex flex-col items-center gap-1 flex-1">
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: occupiedCount }).map((_, i) => (
            <Users key={i} size={14} className="text-stone-400" />
          ))}
        </div>
        {occupiedCount > 0 && (
          <span className="text-[9px] opacity-50 uppercase tracking-widest">{occupiedCount} seated</span>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/FloorplanScene.tsx
git commit -m "feat: add FloorplanScene with party highlight and seated guest count"
```

---

## Task 11: ScenePanel wrapper

**Files:**
- Create: `src/components/ScenePanel.tsx`

Routes to `DeskScene` or `FloorplanScene`. The Maître D' persists visually (present in both scenes, so the transition feels like a context change not a full swap).

- [ ] **Step 1: Create `src/components/ScenePanel.tsx`**

```tsx
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DeskScene } from './scene/DeskScene';
import { FloorplanScene } from './scene/FloorplanScene';

interface ScenePanelProps {
  view: 'desk' | 'floorplan';
  onSeatParty: () => void;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({ view, onSeatParty }) => {
  return (
    <div className="h-[40vh] shrink-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'desk' ? (
          <motion.div
            key="desk-scene"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DeskScene onSeatParty={onSeatParty} />
          </motion.div>
        ) : (
          <motion.div
            key="floorplan-scene"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FloorplanScene />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ScenePanel.tsx
git commit -m "feat: add ScenePanel wrapper with cross-fade between DeskScene and FloorplanScene"
```

---

## Task 12: BottomPanel wrapper

**Files:**
- Create: `src/components/BottomPanel.tsx`

Routes to `DeskTools` or `FloorplanGrid` with an `AnimatePresence` cross-fade. Receives `grid` prop for context (though both child components pull from context themselves — `grid` is not passed down here; the prop in the spec diagram was illustrative of data flow, and both children use context directly).

- [ ] **Step 1: Create `src/components/BottomPanel.tsx`**

```tsx
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DeskTools } from './desk/DeskTools';
import { FloorplanGrid } from './floorplan/FloorplanGrid';

interface BottomPanelProps {
  view: 'desk' | 'floorplan';
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ view }) => {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'desk' ? (
          <motion.div
            key="desk-tools"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DeskTools />
          </motion.div>
        ) : (
          <motion.div
            key="floorplan-grid"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FloorplanGrid />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BottomPanel.tsx
git commit -m "feat: add BottomPanel wrapper routing DeskTools or FloorplanGrid"
```

---

## Task 13: App.tsx rewire + TopBar cleanup + delete old components

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TopBar.tsx`
- Delete: `src/components/Podium.tsx`, `src/components/BookingList.tsx`, `src/components/QueuePreview.tsx`, `src/components/RightPanel.tsx`, `src/hooks/useMediaQuery.ts`

### Rewrite App.tsx

- [ ] **Step 1: Rewrite `src/App.tsx`**

```tsx
import React from 'react';
import { formatTime } from './utils';
import { GameProvider, useGame } from './context/GameContext';
import { PhysicalState } from './types';
import { TopBar } from './components/TopBar';
import { ScenePanel } from './components/ScenePanel';
import { BottomPanel } from './components/BottomPanel';

function GameContent() {
  const { gameState, seatParty, setTimeMultiplier } = useGame();
  const [view, setView] = React.useState<'desk' | 'floorplan'>('desk');

  // Auto-return to desk when floorplan resolution clears the client
  React.useEffect(() => {
    if (view === 'floorplan' && gameState.currentClient?.physicalState !== PhysicalState.SEATING) {
      setView('desk');
    }
  }, [view, gameState.currentClient?.physicalState]);

  const handleSeatParty = () => {
    seatParty();
    setView('floorplan');
  };

  return (
    <div className="h-screen flex flex-col bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      <TopBar
        inGameMinutes={gameState.inGameMinutes}
        rating={gameState.rating}
        cash={gameState.cash}
        morale={gameState.morale}
        timeMultiplier={gameState.timeMultiplier}
        setTimeMultiplier={setTimeMultiplier}
        formatTime={formatTime}
      />
      <ScenePanel view={view} onSeatParty={handleSeatParty} />
      <BottomPanel view={view} />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
```

### Simplify TopBar.tsx

- [ ] **Step 2: Fully replace `src/components/TopBar.tsx`**

Replace the entire file with:

```tsx
import React from 'react';
import { Clock, Star, DollarSign, Play, Pause, FastForward, Heart } from 'lucide-react';

interface TopBarProps {
  inGameMinutes: number;
  rating: number;
  cash: number;
  morale: number;
  timeMultiplier: number;
  setTimeMultiplier: (m: number) => void;
  formatTime: (minutes: number) => string;
}

export const TopBar: React.FC<TopBarProps> = ({
  inGameMinutes,
  rating,
  cash,
  morale,
  timeMultiplier,
  setTimeMultiplier,
  formatTime,
}) => {
  return (
    <header className="border-b border-[#141414] p-4 flex items-center justify-between sticky top-0 bg-[#E4E3E0] z-20 shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <Clock size={20} />
          <span className="font-mono text-xl font-bold">{formatTime(inGameMinutes)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Star size={20} className="text-yellow-600 fill-yellow-600" />
          <span className="font-mono text-xl font-bold">{rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-red-500 fill-red-500" />
          <span className="font-mono text-xl font-bold">{morale}%</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-700" />
          <span className="font-mono text-xl font-bold">{cash}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-[#141414]/10">
        {[0, 1, 2, 3].map(m => (
          <button
            key={m}
            onClick={() => setTimeMultiplier(m)}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              timeMultiplier === m
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'hover:bg-[#141414]/10'
            }`}
          >
            {m === 0 ? <Pause size={14} /> : m === 1 ? <Play size={14} /> : m === 2 ? <FastForward size={14} /> : '3x'}
          </button>
        ))}
      </div>
    </header>
  );
};
```

### Delete old components

- [ ] **Step 3: Delete unused files**

```bash
rm src/components/Podium.tsx
rm src/components/BookingList.tsx
rm src/components/QueuePreview.tsx
rm src/components/RightPanel.tsx
rm src/hooks/useMediaQuery.ts
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors. If there are import errors from deleted files, check if anything still references them and remove those imports.

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- [ ] TopBar visible with clock, rating, morale, cash, time controls
- [ ] ScenePanel shows DeskScene by default (Door, Maître D', empty desk area, queue)
- [ ] BottomPanel shows DeskTools (BookingLedger, Clipboard, PartyTicket, MiniGrid)
- [ ] Door is inert when no client is at the desk
- [ ] When a client arrives and reaches AT_DESK, the Door becomes active
- [ ] Clicking the Door transitions to View B (FloorplanScene + FloorplanGrid)
- [ ] Placing all party members auto-confirms and returns to View A
- [ ] Clicking "Refuse Party" in FloorplanGrid returns to View A with a rating hit
- [ ] MiniGrid in DeskTools reflects current OCCUPIED cells

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/TopBar.tsx
git add -u  # stage deletions
git commit -m "feat: wire up two-view layout — View A (Desk) and View B (Floorplan)"
```

---

## Task 14: Update floor-plan-grid.md spec

**Files:**
- Modify: `docs/specs/layout/floor-plan-grid.md`

Two rules in this spec are now superseded (documented in the layout design spec). Update the floor-plan-grid.md to match reality.

- [ ] **Step 1: Update Section 2 — Undo rule**

In `docs/specs/layout/floor-plan-grid.md`, replace the Undo rule:

> "Undo: Clicking any currently SELECTED cell instantly clears the entire current selection, forcing a fast restart."

With:

> "Undo: Clicking any currently SELECTED cell deselects only that one cell. The remaining selection stays intact."

- [ ] **Step 2: Update Section 3 — Remove Cancel resolution**

Delete the Cancel bullet point from the Resolution & Consequences section. The three resolutions are now: Auto-Validation (Perfect Fit), Manual Cropping (The Sacrifice), and Forced Refuse (via the "Refuse Party" button — player judgment, not automatic detection).

Add a Forced Refuse entry:

> **Forced Refuse:** When the player judges there is no valid placement, a "Refuse Party" button in View B allows refusing the party. Calls `refuseSeatedParty()` in GameContext. Penalty: -1.5 rating, -30 morale (severe, regardless of circumstances — the player accepted the party by clicking the Door).

- [ ] **Step 3: Update the version and last_updated frontmatter**

Set `version: 3.0.0` and `last_updated: 2026-03-22`. Add a changelog entry:
```
- **v3.0.0:** Removed Cancel resolution (no escape from View B). Updated Undo rule to match implementation (toggle single cell, not clear all). Added Forced Refuse resolution.
```

- [ ] **Step 4: Commit**

```bash
git add docs/specs/layout/floor-plan-grid.md
git commit -m "docs: update floor-plan-grid spec — remove Cancel, fix Undo rule, add Forced Refuse"
```

---

## Done

After Tasks 13 and 14, the game runs on the new two-view layout and all specs are consistent. The Podium, BookingList, QueuePreview, RightPanel, and useMediaQuery files are gone. All floorplan logic is unchanged. The only new game logic is `handleSeatingRefusal` / `refuseSeatedParty`.

Next steps (out of scope for this plan):
- Visual polish for DeskScene and FloorplanScene (actual character art, scene dressing)
- DeskTools spatial arrangement spec
- Clipboard interaction (investigation-interaction.md)
