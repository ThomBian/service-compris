# Silent Legitimate Arrival Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ~35% of LEGITIMATE reservation clients arrive without announcing their name, so that silent arrival is no longer a reliable tell for impersonators.

**Architecture:** One-line change in `prepareClientForDesk` in `src/logic/gameLogic.ts`: the unconditional `knownFirstName` assignment for non-impersonator clients is wrapped in a condition that passes through for `WALK_IN` and `SCAMMER` always, and for `LEGITIMATE` clients 65% of the time.

**Tech Stack:** TypeScript, Vitest

---

## File Structure

| File | Change |
|---|---|
| `src/logic/gameLogic.ts` | Modify `prepareClientForDesk` (lines 167–170) |
| `src/logic/__tests__/gameLogic.test.ts` | Add 3 new test cases in the existing `prepareClientForDesk` describe block |

No new files. No data model changes (`knownFirstName` is already `string | undefined`).

---

## Task 1: Add tests then implement the silent arrival condition

**Files:**
- Modify: `src/logic/__tests__/gameLogic.test.ts` (after line 339, inside `describe('prepareClientForDesk', ...)`)
- Modify: `src/logic/gameLogic.ts` (lines 167–170, inside `prepareClientForDesk`)

### Context

`prepareClientForDesk` in `src/logic/gameLogic.ts` currently reads:

```ts
if (!preparedClient.claimedReservationId) {
  preparedClient.knownFirstName = preparedClient.trueFirstName;
  if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;
}
```

The goal is to change it to:

```ts
if (!preparedClient.claimedReservationId) {
  const shouldAnnounce = preparedClient.type !== ClientType.LEGITIMATE || Math.random() < 0.65;
  if (shouldAnnounce) {
    preparedClient.knownFirstName = preparedClient.trueFirstName;
  }
  if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;
}
```

Note: `ClientType` is already imported at line 2 of `gameLogic.ts`.

`Math.random` is mocked in tests using `vi.spyOn(Math, 'random')`. Look at how existing tests in the file use `vi.spyOn` and `afterEach(() => vi.restoreAllMocks())` — follow the same pattern exactly.

- [ ] **Step 1: Write three failing tests**

Open `src/logic/__tests__/gameLogic.test.ts`. Locate the `describe('prepareClientForDesk', ...)` block (around line 276). Add these three tests **inside** that block, after the existing `'regular scammer (no claimedReservationId) still gets knownFirstName set'` test (after line 339):

```ts
  it('LEGITIMATE client announces name when random < 0.65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // < 0.65 → shouldAnnounce
    const client = makeClient({
      type: ClientType.LEGITIMATE,
      trueFirstName: 'Alice',
    });
    const result = prepareClientForDesk(client);
    expect(result.knownFirstName).toBe('Alice');
  });

  it('LEGITIMATE client does NOT announce name when random >= 0.65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7); // >= 0.65 → silent
    const client = makeClient({
      type: ClientType.LEGITIMATE,
      trueFirstName: 'Alice',
    });
    const result = prepareClientForDesk(client);
    expect(result.knownFirstName).toBeUndefined();
  });

  it('WALK_IN always announces name regardless of random value', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // would suppress LEGITIMATE, but not WALK_IN
    const client = makeClient({
      type: ClientType.WALK_IN,
      trueFirstName: 'Bob',
      trueReservationId: undefined,
      claimedReservationId: undefined,
    });
    const result = prepareClientForDesk(client);
    expect(result.knownFirstName).toBe('Bob');
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm run test -- --reporter=verbose`

Expected: The three new tests FAIL (knownFirstName is set unconditionally today, so the "silent" test will fail). All previously-passing tests should still pass.

- [ ] **Step 3: Implement the change**

In `src/logic/gameLogic.ts`, find the block inside `prepareClientForDesk` (around line 167):

```ts
  if (!preparedClient.claimedReservationId) {
    preparedClient.knownFirstName = preparedClient.trueFirstName;
    if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;
  }
```

Replace it with:

```ts
  if (!preparedClient.claimedReservationId) {
    const shouldAnnounce = preparedClient.type !== ClientType.LEGITIMATE || Math.random() < 0.65;
    if (shouldAnnounce) {
      preparedClient.knownFirstName = preparedClient.trueFirstName;
    }
    if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;
  }
```

- [ ] **Step 4: Run all tests to confirm everything passes**

Run: `npm run test`

Expected: all tests pass (68 + 3 new = 71 total), no failures.

- [ ] **Step 5: Run lint**

Run: `npm run lint`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/logic/gameLogic.ts src/logic/__tests__/gameLogic.test.ts
git commit -m "feat: 35% of legitimate clients arrive without announcing name"
```
