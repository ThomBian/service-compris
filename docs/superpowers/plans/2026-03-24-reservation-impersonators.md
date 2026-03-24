# Reservation Impersonators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 10% of scammer spawns claim a stolen reservation identity, giving the "Arrived" checkbox real detection value via a ledger highlight and timing accusation.

**Architecture:** A single optional field `claimedReservationId` on `Client` threads through spawn logic, desk preparation, question responses, and the Booking Ledger. No new accusation types — existing `'reservation'` and `'time'` accusations already catch impersonators.

**Tech Stack:** React 19, TypeScript, Vitest (tests run with `npm run test`)

**Spec:** `docs/superpowers/specs/2026-03-24-reservation-impersonators-design.md`

---

## File Map

| File | Change |
|---|---|
| `src/types.ts` | Add `claimedReservationId?: string` to `Client` |
| `src/logic/gameLogic.ts` | Update `generateClientData`, `createNewClient`, `prepareClientForDesk`, `handleFieldQuestion` |
| `src/hooks/useClientSpawner.ts` | Pass `prev.inGameMinutes` as third arg to `generateClientData` |
| `src/components/desk/BookingLedger.tsx` | Add red highlight row when name matches an `arrived: true` reservation |
| `src/logic/__tests__/gameLogic.test.ts` | Add tests for all logic changes; update fixtures |

---

## Task 1: Add `claimedReservationId` to the Client type

**Files:**
- Modify: `src/types.ts`
- Modify: `src/logic/__tests__/gameLogic.test.ts` (update `makeClient` fixture)

- [ ] **Step 1: Add the field to `Client` in `src/types.ts`**

In `src/types.ts`, add after `trueReservationId`:

```ts
claimedReservationId?: string; // Reservation they're impersonating (impersonators only)
```

- [ ] **Step 2: Update the `makeClient` fixture in tests to include the new optional field**

In `src/logic/__tests__/gameLogic.test.ts`, the `makeClient` helper already uses `...overrides` so no field additions needed. But update `makeClientData` to reflect the new return type from `generateClientData` once that changes. For now just verify the type compiles.

- [ ] **Step 3: Run type-check to confirm no errors**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add claimedReservationId field to Client type"
```

---

## Task 2: Update `generateClientData` — remove stolen-name logic, add impersonator roll

**Files:**
- Modify: `src/logic/gameLogic.ts` (lines 44–100)
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write failing tests**

Add this `describe` block in `src/logic/__tests__/gameLogic.test.ts` after the existing `generateClientData` describe:

```ts
describe('generateClientData — impersonator logic', () => {
  const res1 = makeReservation({ id: 'res-1', firstName: 'Sophie', lastName: 'Blanc', time: 1200 });
  const res2 = makeReservation({ id: 'res-2', firstName: 'Marc', lastName: 'Dupont', time: 1210 });
  const allRes = [res1, res2];
  // currentInGameMinutes = 1260 means res.time + 45 <= 1260 for both (1245 and 1255)
  const currentMinutes = 1260;

  it('scammer true name is never a reservation name', () => {
    const reservationNames = allRes.map(r => r.firstName);
    const results = Array.from({ length: 200 }, () =>
      generateClientData(undefined, allRes, currentMinutes)
    );
    const scammers = results.filter(r => r.type === ClientType.SCAMMER);
    scammers.forEach(r => {
      expect(reservationNames).not.toContain(r.trueFirstName);
    });
  });

  it('impersonator rate is ~10% among scammers when qualifying reservations exist', () => {
    const results = Array.from({ length: 500 }, () =>
      generateClientData(undefined, allRes, currentMinutes)
    );
    const scammers = results.filter(r => r.type === ClientType.SCAMMER);
    const impersonators = scammers.filter(r => r.claimedReservationId !== undefined);
    const rate = impersonators.length / scammers.length;
    expect(rate).toBeGreaterThanOrEqual(0.04);
    expect(rate).toBeLessThanOrEqual(0.18);
  });

  it('claimedReservationId always points to a qualifying reservation', () => {
    const results = Array.from({ length: 200 }, () =>
      generateClientData(undefined, allRes, currentMinutes)
    );
    const impersonators = results.filter(r => r.claimedReservationId !== undefined);
    impersonators.forEach(r => {
      const match = allRes.find(res => res.id === r.claimedReservationId);
      expect(match).toBeDefined();
      expect(match!.time + 45).toBeLessThanOrEqual(currentMinutes);
    });
  });

  it('no impersonator is assigned when no qualifying reservations exist (all too recent)', () => {
    const recentRes = [makeReservation({ id: 'r', time: 1250 })]; // time + 45 = 1295 > 1260
    const results = Array.from({ length: 100 }, () =>
      generateClientData(undefined, recentRes, currentMinutes)
    );
    const impersonators = results.filter(r => r.claimedReservationId !== undefined);
    expect(impersonators.length).toBe(0);
  });

  it('no impersonator is assigned when currentInGameMinutes is not provided', () => {
    const results = Array.from({ length: 100 }, () =>
      generateClientData(undefined, allRes)
    );
    const impersonators = results.filter(r => r.claimedReservationId !== undefined);
    expect(impersonators.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose 2>&1 | head -40
```

Expected: test failures on the impersonator tests (function signature mismatch or missing property).

- [ ] **Step 3: Implement the changes in `generateClientData`**

In `src/logic/gameLogic.ts`, replace the `generateClientData` function:

```ts
export const generateClientData = (res?: Reservation, allReservations: Reservation[] = [], currentInGameMinutes?: number): {
  type: ClientType;
  trueFirstName: string;
  trueLastName: string;
  truePartySize: number;
  trueReservationId?: string;
  lieType: LieType.NONE | LieType.SIZE | LieType.IDENTITY;
  claimedReservationId?: string;
} => {
  let type: ClientType;
  let trueFirstName: string;
  let trueLastName: string;
  let truePartySize: number;
  let trueReservationId: string | undefined;
  let lieType: LieType.NONE | LieType.SIZE | LieType.IDENTITY = LieType.NONE;
  let claimedReservationId: string | undefined;

  if (res) {
    type = ClientType.LEGITIMATE;
    trueFirstName = res.firstName;
    trueLastName = res.lastName;
    trueReservationId = res.id;
    truePartySize = res.partySize;

    const roll = Math.random();
    if (roll < 0.3) {
      lieType = LieType.SIZE;
      truePartySize = res.partySize + Math.floor(Math.random() * 2) + 1;
    }
  } else {
    const typeRoll = Math.random();
    if (typeRoll < 0.6) {
      type = ClientType.WALK_IN;
      trueFirstName = getRandom(FIRST_NAMES);
      trueLastName = getRandom(LAST_NAMES);
      truePartySize = Math.floor(Math.random() * 4) + 1;
      lieType = LieType.NONE;
    } else {
      type = ClientType.SCAMMER;
      lieType = LieType.IDENTITY;
      // True identity is always random — impersonation is in what they *claim*
      trueFirstName = getRandom(FIRST_NAMES);
      trueLastName = getRandom(LAST_NAMES);
      truePartySize = Math.floor(Math.random() * 4) + 2;

      // 10% chance to impersonate a reservation whose window has passed
      if (currentInGameMinutes !== undefined && Math.random() < 0.1) {
        const qualifying = allReservations.filter(r => r.time + 45 <= currentInGameMinutes);
        if (qualifying.length > 0) {
          claimedReservationId = getRandom(qualifying).id;
        }
      }
    }
  }

  return { type, trueFirstName, trueLastName, truePartySize, trueReservationId, lieType, claimedReservationId };
};
```

- [ ] **Step 4: Update the `makeClientData` fixture to include the new field**

In `src/logic/__tests__/gameLogic.test.ts`, update `makeClientData`:

```ts
const makeClientData = (overrides?: Partial<ReturnType<typeof generateClientData>>): ReturnType<typeof generateClientData> => ({
  type: ClientType.LEGITIMATE,
  trueFirstName: 'John',
  trueLastName: 'Smith',
  truePartySize: 2,
  trueReservationId: 'res-1',
  lieType: LieType.NONE as const,
  claimedReservationId: undefined,
  ...overrides,
});
```

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/logic/gameLogic.ts src/logic/__tests__/gameLogic.test.ts
git commit -m "feat: add impersonator roll to generateClientData, remove stolen true-name logic"
```

---

## Task 3: Update `createNewClient` — copy `claimedReservationId`, set `isLate`

**Files:**
- Modify: `src/logic/gameLogic.ts` (lines 102–140)
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `describe('createNewClient', ...)` in `src/logic/__tests__/gameLogic.test.ts`:

```ts
it('impersonator data produces a client with claimedReservationId set', () => {
  const data = makeClientData({
    type: ClientType.SCAMMER,
    lieType: LieType.IDENTITY,
    claimedReservationId: 'res-1',
  });
  const client = createNewClient({ data, currentMinutes: 1200 });
  expect(client.claimedReservationId).toBe('res-1');
});

it('impersonator client has isLate set to true', () => {
  const data = makeClientData({
    type: ClientType.SCAMMER,
    lieType: LieType.IDENTITY,
    claimedReservationId: 'res-1',
  });
  const client = createNewClient({ data, currentMinutes: 1200 });
  expect(client.isLate).toBe(true);
});

it('non-impersonator scammer does not get isLate forced to true', () => {
  const data = makeClientData({
    type: ClientType.SCAMMER,
    lieType: LieType.IDENTITY,
    claimedReservationId: undefined,
  });
  const client = createNewClient({ data, currentMinutes: 1200 });
  expect(client.isLate).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A 3 "impersonator data\|impersonator client\|non-impersonator"
```

Expected: 3 failures.

- [ ] **Step 3: Replace `createNewClient` in `src/logic/gameLogic.ts` (lines 102–140) with the complete function below**

Note: `claimedReservationId` is accessed via `data.claimedReservationId` directly (not destructured alongside the other fields) since it's new — do not add it to the destructuring on line 1 of the function body.

Full replacement:

```ts
export const createNewClient = ({
  data,
  currentMinutes,
  res
}: {
  data: ReturnType<typeof generateClientData>;
  currentMinutes: number;
  res?: Reservation;
}): Client => {
  const { type, trueFirstName, trueLastName, truePartySize, trueReservationId, lieType } = data;
  let finalIsLate = res ? (currentMinutes - res.time > 30) : false;

  let finalLieType: LieType = lieType;
  if (type === ClientType.LEGITIMATE && finalIsLate && finalLieType === LieType.NONE) {
    finalLieType = LieType.TIME;
  }

  // Impersonators always arrive late
  if (data.claimedReservationId) {
    finalIsLate = true;
  }

  const client: Client = {
    id: Math.random().toString(36).substr(2, 9),
    type,
    patience: 100,
    physicalState: PhysicalState.IN_QUEUE,
    dialogueState: DialogueState.AWAITING_GREETING,
    spawnTime: currentMinutes,
    trueFirstName,
    trueLastName,
    truePartySize,
    trueReservationId,
    claimedReservationId: data.claimedReservationId,
    isLate: finalIsLate,
    lieType: finalLieType,
    hasLied: finalLieType !== LieType.NONE,
    isCaught: false,
    lastMessage: 'Waiting in line...',
    chatHistory: [],
  };

  return client;
};
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/gameLogic.ts src/logic/__tests__/gameLogic.test.ts
git commit -m "feat: copy claimedReservationId to client and force isLate for impersonators"
```

---

## Task 4: Update `prepareClientForDesk` — suppress pre-population for impersonators

**Files:**
- Modify: `src/logic/gameLogic.ts` (lines 144–166)
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `describe('prepareClientForDesk', ...)`:

```ts
it('impersonator has no knownFirstName pre-populated at desk entry', () => {
  const client = makeClient({
    type: ClientType.SCAMMER,
    claimedReservationId: 'res-1',
  });
  const result = prepareClientForDesk(client);
  expect(result.knownFirstName).toBeUndefined();
});

it('impersonator has no knownLastName pre-populated at desk entry', () => {
  // knownLastName is never set by prepareClientForDesk for any client type,
  // but this test locks in that behaviour for impersonators explicitly.
  const client = makeClient({
    type: ClientType.SCAMMER,
    claimedReservationId: 'res-1',
  });
  const result = prepareClientForDesk(client);
  expect(result.knownLastName).toBeUndefined();
});

it('impersonator has no knownPartySize pre-populated at desk entry', () => {
  const client = makeClient({
    type: ClientType.SCAMMER,
    claimedReservationId: 'res-1',
  });
  const result = prepareClientForDesk(client);
  expect(result.knownPartySize).toBeUndefined();
});

it('regular scammer (no claimedReservationId) still gets knownFirstName set', () => {
  const client = makeClient({
    type: ClientType.SCAMMER,
    trueFirstName: 'FakeGuy',
  });
  const result = prepareClientForDesk(client);
  expect(result.knownFirstName).toBe('FakeGuy');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A 3 "impersonator has no"
```

Expected: 2 failures (knownFirstName and knownPartySize tests). The regular scammer test likely passes already.

- [ ] **Step 3: Update `prepareClientForDesk` in `src/logic/gameLogic.ts`**

Replace the two lines at the end of `prepareClientForDesk` (currently lines 162–163):

```ts
preparedClient.knownFirstName = preparedClient.trueFirstName;
if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;
```

With:

```ts
if (!preparedClient.claimedReservationId) {
  preparedClient.knownFirstName = preparedClient.trueFirstName;
  if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/gameLogic.ts src/logic/__tests__/gameLogic.test.ts
git commit -m "feat: suppress name/partySize pre-population for impersonators at desk entry"
```

---

## Task 5: Update `handleFieldQuestion` — impersonators respond with stolen reservation data

**Files:**
- Modify: `src/logic/gameLogic.ts` (lines 251–292)
- Modify: `src/logic/__tests__/gameLogic.test.ts`

- [ ] **Step 1: Write failing tests**

Add a new `describe` block in `src/logic/__tests__/gameLogic.test.ts`. Note: `handleFieldQuestion` is not exported — test it through the exported `generateQuestionResponse`:

```ts
import {
  // ... existing imports ...
  generateQuestionResponse,
} from '../gameLogic';
```

Then add:

```ts
describe('generateQuestionResponse — impersonator lies', () => {
  const stolenRes = makeReservation({
    id: 'stolen-res',
    firstName: 'Sophie',
    lastName: 'Blanc',
    time: 1200,
  });

  const impersonator = makeClient({
    type: ClientType.SCAMMER,
    claimedReservationId: 'stolen-res',
    trueFirstName: 'RandomFake',
    trueLastName: 'Nobody',
  });

  it('impersonator returns stolen firstName when asked', () => {
    const result = generateQuestionResponse({
      field: 'firstName',
      client: impersonator,
      reservations: [stolenRes],
      inGameMinutes: 1260,
    });
    expect(result.revealedInfo.knownFirstName).toBe('Sophie');
    expect(result.guestResponse).toContain('Sophie');
  });

  it('impersonator returns stolen lastName when asked', () => {
    const result = generateQuestionResponse({
      field: 'lastName',
      client: impersonator,
      reservations: [stolenRes],
      inGameMinutes: 1260,
    });
    expect(result.revealedInfo.knownLastName).toBe('Blanc');
    expect(result.guestResponse).toContain('Blanc');
  });

  it('impersonator returns stolen reservation time (not a fabricated offset)', () => {
    const result = generateQuestionResponse({
      field: 'time',
      client: impersonator,
      reservations: [stolenRes],
      inGameMinutes: 1260,
    });
    expect(result.revealedInfo.knownTime).toBe(1200);
  });

  it('non-impersonator scammer returns their true name when asked', () => {
    const regularScammer = makeClient({
      type: ClientType.SCAMMER,
      trueFirstName: 'TrueFake',
      claimedReservationId: undefined,
    });
    const result = generateQuestionResponse({
      field: 'firstName',
      client: regularScammer,
      reservations: [stolenRes],
      inGameMinutes: 1260,
    });
    expect(result.revealedInfo.knownFirstName).toBe('TrueFake');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A 3 "impersonator returns stolen\|non-impersonator scammer"
```

Expected: 3–4 failures.

- [ ] **Step 3: Replace the entire `handleFieldQuestion` function in `src/logic/gameLogic.ts` (lines 251–292)**

The impersonator branch is fully self-contained and returns early. The original `alreadyKnown` declaration at the bottom of the function is in a different execution path — there is no duplicate variable. Replace the whole function to make this unambiguous:

```ts
function handleFieldQuestion(
  field: QuestionField,
  client: Client,
  reservations: Reservation[],
  inGameMinutes: number
) {
  // Impersonators lie using the stolen reservation's data
  if (client.claimedReservationId) {
    const stolenRes = reservations.find(r => r.id === client.claimedReservationId);
    if (stolenRes) {
      const alreadyKnownForImpersonator =
        (field === 'firstName' && client.knownFirstName) ||
        (field === 'lastName' && client.knownLastName) ||
        (field === 'time' && client.knownTime);

      if (alreadyKnownForImpersonator) {
        return {
          patiencePenalty: 20,
          logMsg: `Client is frustrated. You already asked that.`,
          guestResponse: "I already told you that!",
          revealedInfo: {}
        };
      }

      if (field === 'firstName') {
        return {
          patiencePenalty: 10,
          logMsg: '',
          guestResponse: `My name is ${stolenRes.firstName}.`,
          revealedInfo: { knownFirstName: stolenRes.firstName }
        };
      }
      if (field === 'lastName') {
        return {
          patiencePenalty: 10,
          logMsg: '',
          guestResponse: `My last name is ${stolenRes.lastName}.`,
          revealedInfo: { knownLastName: stolenRes.lastName }
        };
      }
      if (field === 'time') {
        return {
          patiencePenalty: 10,
          logMsg: '',
          guestResponse: `Our reservation was for ${formatTime(stolenRes.time)}.`,
          revealedInfo: { knownTime: stolenRes.time }
        };
      }
    }
  }

  // Original logic for all other clients
  const alreadyKnown = (field === 'firstName' && client.knownFirstName) ||
                       (field === 'lastName' && client.knownLastName) ||
                       (field === 'time' && client.knownTime);

  if (alreadyKnown) {
    return {
      patiencePenalty: 20,
      logMsg: `Client is frustrated. You already asked that.`,
      guestResponse: "I already told you that!",
      revealedInfo: {}
    };
  }

  let revealedInfo: Partial<Client> = {};
  let guestResponse = '';

  if (field === 'firstName') {
    revealedInfo = { knownFirstName: client.trueFirstName };
    guestResponse = `My name is ${client.trueFirstName}.`;
  } else if (field === 'lastName') {
    revealedInfo = { knownLastName: client.trueLastName };
    guestResponse = `My last name is ${client.trueLastName}.`;
  } else if (field === 'time') {
    const res = reservations.find(r => r.id === client.trueReservationId);
    const trueTime = res ? res.time : (inGameMinutes - 10);
    revealedInfo = { knownTime: trueTime };
    guestResponse = `Our reservation was for ${formatTime(trueTime)}.`;
  }

  return {
    patiencePenalty: 10,
    logMsg: '',
    guestResponse,
    revealedInfo
  };
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/logic/gameLogic.ts src/logic/__tests__/gameLogic.test.ts
git commit -m "feat: impersonators respond with stolen reservation data when questioned"
```

---

## Task 6: Update `useClientSpawner` — pass `currentInGameMinutes` to `generateClientData`

**Files:**
- Modify: `src/hooks/useClientSpawner.ts`

- [ ] **Step 1: Update the `generateClientData` call**

In `src/hooks/useClientSpawner.ts`, update line 14:

```ts
// Before
const clientData = generateClientData(res, prev.reservations);

// After
const clientData = generateClientData(res, prev.reservations, prev.inGameMinutes);
```

Note: use `prev.inGameMinutes` (the state snapshot inside the `setGameState` callback), NOT `gameState.inGameMinutes` from the outer closure — the outer reference can be stale due to React's batching.

- [ ] **Step 2: Run type-check and tests**

```bash
npm run lint && npm run test
```

Expected: no errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useClientSpawner.ts
git commit -m "feat: pass inGameMinutes to generateClientData for impersonator timing"
```

---

## Task 7: Add arrived-conflict highlight to `BookingLedger`

**Files:**
- Modify: `src/components/desk/BookingLedger.tsx`

This is a UI change — no automated tests. Manually verify in the browser.

- [ ] **Step 1: Update `BookingLedger` to accept `currentClient` and highlight conflict rows**

In `src/components/desk/BookingLedger.tsx`, update the component:

```tsx
export const BookingLedger: React.FC = () => {
  const { gameState: { reservations, inGameMinutes, currentClient }, toggleReservationArrived } = useGame();

  const conflictReservationId = (() => {
    if (!currentClient?.knownFirstName || !currentClient?.knownLastName) return null;
    const match = reservations.find(
      r =>
        r.arrived &&
        r.firstName === currentClient.knownFirstName &&
        r.lastName === currentClient.knownLastName
    );
    return match?.id ?? null;
  })();

  // ... inside the <tr> className:
  // add: conflictReservationId === res.id ? 'bg-red-100 ring-2 ring-red-500' : ''
```

Full updated `<tr>` className (this project uses Tailwind CSS 4 — avoid the `!` important prefix modifier as it behaves differently; instead conditionally exclude `opacity-40` when a conflict is active):

```tsx
className={`border-b border-[#141414]/10 transition-colors hover:bg-[#141414]/5 ${
  isCurrentTime && conflictReservationId !== res.id ? 'bg-emerald-50' : ''
} ${
  res.arrived && conflictReservationId !== res.id ? 'opacity-40' : ''
} ${
  conflictReservationId === res.id ? 'bg-red-100 ring-2 ring-red-500 ring-inset' : ''
}`}
```

Add an alert icon next to the name cell when conflicting:

```tsx
<td className="p-2">
  {res.firstName} {res.lastName}
  {conflictReservationId === res.id && (
    <span className="ml-1 text-red-600 font-bold text-[10px]">⚠ ALREADY IN</span>
  )}
</td>
```

- [ ] **Step 2: Run type-check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Manually verify in the browser**

```bash
npm run dev
```

Test scenario:
1. Wait for a reservation party to appear in the queue
2. Accept and seat them
3. Manually check the "Arrived" checkbox in the Booking Ledger for that reservation
4. Wait for or observe if a scammer claims the same name (may need to fast-forward time)
5. Question the scammer for their first and last name
6. Confirm the ledger row pulses red with "⚠ ALREADY IN"

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/BookingLedger.tsx
git commit -m "feat: highlight arrived reservation conflict in Booking Ledger"
```

---

## Final Verification

- [ ] **Run full test suite one last time**

```bash
npm run test && npm run lint
```

Expected: all tests pass, no type errors.

- [ ] **Smoke test in browser**

Fast-forward the clock past 21:00 (so qualifying reservations exist at time + 45 min). Watch for scammers. If one impersonates a reservation, question them — their name should match a real ledger entry. If that entry is marked Arrived, the conflict highlight appears.
