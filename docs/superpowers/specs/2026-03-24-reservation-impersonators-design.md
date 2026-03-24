---
title: Reservation Impersonators & Arrived Highlight
date: 2026-03-24
status: approved
---

# Reservation Impersonators & Arrived Highlight

## Context

Playtesting revealed the "Arrived" checkbox in the Booking Ledger was never used — no guests were impersonating reservations, so the mechanic had no consequence. This spec makes reservation impersonators an active part of the game and gives the checkbox real detection value.

## Goal

- Make 10% of scammer spawns claim a stolen reservation identity
- Give players two reliable ways to catch these impersonators: the Arrived checkbox and a timing accusation
- Reward players who habitually mark reservations as arrived

---

## Data Model

Add one field to `Client` in `src/types.ts`:

```ts
claimedReservationId?: string; // Reservation they're impersonating (impersonators only)
```

This is distinct from `trueReservationId`, which only legitimate clients possess. An impersonator has a random true name and uses `claimedReservationId` to track the reservation they lie about.

---

## Spawn Logic

### Scammer true identity
Remove the existing 50% logic where a scammer's `trueFirstName`/`trueLastName` is set to a stolen reservation name. A scammer's true name is always random going forward.

### Impersonator assignment (10% chance)
The impersonator roll and `claimedReservationId` assignment live inside `generateClientData`, which must be extended to accept `currentInGameMinutes: number` as an additional parameter. The return type is extended to include `claimedReservationId?: string`.

The updated signature:

```ts
generateClientData(res?: Reservation, allReservations?: Reservation[], currentInGameMinutes?: number)
```

`currentInGameMinutes` is optional — it is only used on the scammer path. Call sites must pass `prev.inGameMinutes` as the third argument.

When a scammer is being generated:
- Roll 10%
- Filter `allReservations` to those where `res.time + 45 <= currentInGameMinutes` (ensures the reservation window is well past — the impersonator always arrives late by at least 45 minutes, clearly outside the 30-minute legitimate late window)
- If qualifying reservations exist, pick one at random and include `claimedReservationId` in the returned data
- If no qualifying reservations exist, proceed with no `claimedReservationId`

In `createNewClient`, if the generated data includes `claimedReservationId`:
- Copy `data.claimedReservationId` onto `client.claimedReservationId`
- Set `client.isLate = true` explicitly

---

## Desk Preparation (`prepareClientForDesk`)

For impersonators (`claimedReservationId` set):
- Do NOT pre-populate `knownFirstName` or `knownLastName` — leave them unset. (This differs from the default path where `knownFirstName = trueFirstName` is set unconditionally.) The stolen name is only revealed when the player explicitly asks; see Question Responses for how `handleFieldQuestion` resolves those fields for impersonators. Both changes — suppressing pre-population here and changing name resolution in `handleFieldQuestion` — must be made together.
- Do NOT pre-populate `knownPartySize`. Suppressing the random 50% reveal prevents the impersonator's mismatched party size from leaking before the player has questioned them.

The highlight in the Booking Ledger only fires after the name is questioned and `knownFirstName`/`knownLastName` are set. If the player checks the ledger before asking the name, no highlight appears — this is correct and intentional. Do not work around it by pre-populating the name.

For non-impersonator scammers and all other client types, `prepareClientForDesk` is unchanged.

---

## Question Responses

`handleFieldQuestion` must branch on `claimedReservationId` for impersonators. When the player asks an impersonator about their details, the response is resolved from the stolen reservation, not from the `true*` fields:

| Field | Impersonator response | Source |
|---|---|---|
| `firstName` | Stolen reservation's `firstName` | `claimedReservationId` lookup |
| `lastName` | Stolen reservation's `lastName` | `claimedReservationId` lookup |
| `time` | Stolen reservation's `time` | `claimedReservationId` lookup — set `knownTime = stolenReservation.time` (not a fabricated offset) |
| `partySize` | Impersonator's own `truePartySize` | Not stolen — remains the scammer's random value |

`partySize` is intentionally not stolen. The mismatch between what they claim and the reservation's booked size is a secondary detection signal, but is not a primary path.

These responses update `knownFirstName`, `knownLastName`, and `knownTime` on the client as usual.

For non-impersonator scammers, behaviour is unchanged.

---

## Accusation Logic

No new accusation types. Both existing `AccusationField` values already catch impersonators:

| `AccusationField` | Why it works |
|---|---|
| `'reservation'` | `client.type === SCAMMER` — true for all scammers including impersonators |
| `'time'` | `client.isLate === true` — set explicitly on impersonators at spawn; also catches any legitimate client >30 min late |

Note: `'time'` is not exclusive to impersonators — it catches any client with `isLate === true`. The detection paths below are illustrative of the two most common impersonator-specific paths, not an exhaustive list.

---

## Accept & Refuse Outcomes for Impersonators

**Accept (not caught):** Impersonators who are accepted without being caught follow the same path as regular scammers in `handleAcceptedClient`: treated as "FOOLED" (`type === SCAMMER`, `hasLied === true`, `isCaught === false`), producing the full scammer penalty (`-$50`, `-1.0 rating`, `-20 morale`). No special-case outcome is needed.

**Accept (caught):** If the player successfully accuses the impersonator (via `'reservation'` or `'time'`) and then seats them anyway, the existing Grateful Liar path applies — `isCaught === true` triggers the 2.5x cash bonus, `+0.8 rating`, `+10 morale`. This is intentional: catching and seating any scammer is a high-skill, high-reward play regardless of scammer subtype.

**Refuse:** Impersonators have `type === SCAMMER`, so `handleRefusedClient` treats their refusal as justified (`isJustified === true`), awarding `+0.2 rating`, `+5 morale`. No code change needed.

---

## Visual Highlight (Booking Ledger)

In `BookingLedger`, when there is a current desk client with known name info:

- Compare `currentClient.knownFirstName` + `currentClient.knownLastName` against all reservations
- If any reservation matches AND `res.arrived === true` → apply a red highlight to that row (e.g. red border, pulsing ring, or alert icon)
- No highlight if the reservation is not yet marked arrived — the player's checkbox habit determines whether this cue fires

This teaches the habit naturally: players who check off arrivals get a clear visual payoff when an impersonator appears.

---

## Detection Paths Summary

| Situation | Player action | Cue | `AccusationField` |
|---|---|---|---|
| Impersonator, real party already marked arrived | Question name → check ledger | Red highlight on arrived row | `'reservation'` |
| Impersonator, real party not marked | Question time → compare to clock | Large timing gap (45+ min late) | `'time'` |
| Regular scammer (no claimed reservation) | Cross-reference ledger | Name matches no reservation | `'reservation'` |

---

## Out of Scope

- "Too early" timing detection (kept simple — scammers are only late)
- Pre-scheduled scammer/reservation pairs (randomness at spawn is sufficient)
- New accusation types
- Different penalty tiers for impersonators vs. regular scammers
