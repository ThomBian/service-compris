---
title: Silent Legitimate Arrival
date: 2026-03-24
status: approved
---

# Silent Legitimate Arrival

## Context

Impersonator scammers (`claimedReservationId` set) never announce their name on arrival — the name field stays empty until the player asks. This is correct behaviour. However, it creates a trivial tell: any client who arrives without announcing their name is guaranteed to be an impersonator. This makes impersonators trivially identifiable without investigation, undermining the investigation mechanic introduced in the Tactile Party Ticket sub-project.

## Goal

Make silent arrival non-diagnostic by having ~35% of `LEGITIMATE` reservation clients also not announce their name on arrival. The player must now investigate every reservation client to determine whether silence is suspicious or coincidental.

---

## What Changes

### `prepareClientForDesk` in `src/logic/gameLogic.ts`

One line changes in the existing guard block (lines 167–170):

**Before:**
```ts
if (!preparedClient.claimedReservationId) {
  preparedClient.knownFirstName = preparedClient.trueFirstName;
  if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;
}
```

**After:**
```ts
if (!preparedClient.claimedReservationId) {
  const shouldAnnounce = preparedClient.type !== ClientType.LEGITIMATE || Math.random() < 0.65;
  if (shouldAnnounce) {
    preparedClient.knownFirstName = preparedClient.trueFirstName;
  }
  if (Math.random() > 0.5) preparedClient.knownPartySize = preparedClient.truePartySize;
}
```

### Announcement behaviour by client type

| Client type | Announces name on arrival? |
|---|---|
| `WALK_IN` | Always (unchanged) |
| `LEGITIMATE` (reservation, honest or size-liar) | 65% of the time; 35% arrive silently |
| `SCAMMER` (no `claimedReservationId`) | Always (unchanged) |
| Impersonator (`claimedReservationId` set) | Never (unchanged — excluded by outer guard) |

### No data model changes

`knownFirstName` is already `string | undefined` on `Client`. No new fields, no schema migration.

---

## Out of Scope

- `knownLastName` pre-population (not currently pre-populated on arrival; unchanged)
- Party size pre-population (`knownPartySize` 50% roll — unchanged)
- Any UI change — the `TicketField` empty state already handles `undefined` correctly

---

## Notes on the condition

`preparedClient.type !== ClientType.LEGITIMATE || Math.random() < 0.65` short-circuits on the first operand for `WALK_IN` and `SCAMMER` — `Math.random()` is never called for those types. This means the 65% roll is exclusive to `LEGITIMATE` clients, which is the intended behaviour.

The `knownPartySize` 50% roll sits outside the `if (shouldAnnounce)` block and still applies even when the name is withheld. A client can arrive silently but with party size pre-populated. This is intentional — only name announcement is gated.

---

## Testing

Three test cases in `src/logic/__tests__/gameLogic.test.ts`, mocking `Math.random`:

1. **LEGITIMATE client, random < 0.65** → `knownFirstName` is set on arrival
2. **LEGITIMATE client, random ≥ 0.65** → `knownFirstName` is `undefined` on arrival
3. **WALK_IN client** → `knownFirstName` is always set on arrival (regression guard)

The existing impersonator test (covering `claimedReservationId` path where `knownFirstName` stays unset) is unaffected.
