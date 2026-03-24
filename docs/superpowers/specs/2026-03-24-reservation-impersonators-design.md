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
When a scammer spawns, roll 10%:
- Filter reservations to those where `res.time + 45 <= currentInGameMinutes` (reservation window has passed — ensures the impersonator always arrives late)
- If any qualifying reservations exist, pick one at random and set `claimedReservationId`
- Set `isLate = true` explicitly on the resulting client

If no qualifying reservations exist, the scammer spawns normally with no claimed reservation.

---

## Question Responses

When a player asks an impersonator (`claimedReservationId` set) about their details, they lie using the stolen reservation's data:

| Field | Response |
|---|---|
| `firstName` | Stolen reservation's `firstName` |
| `lastName` | Stolen reservation's `lastName` |
| `time` | Stolen reservation's `time` |

These responses update `knownFirstName`, `knownLastName`, and `knownTime` on the client as usual.

For non-impersonator scammers, behaviour is unchanged.

---

## Accusation Logic

No new accusation types. Both existing accusations already catch impersonators:

| Accusation | Why it works |
|---|---|
| "No reservation" | `client.type === SCAMMER` — true for all scammers |
| "Time" | `client.isLate === true` — set explicitly on impersonators at spawn |

---

## Visual Highlight (Booking Ledger)

In `BookingLedger`, after the player has questioned the current desk client:

- Compare `currentClient.knownFirstName` + `currentClient.knownLastName` against all reservations
- If any reservation matches AND `res.arrived === true` → apply a red highlight to that row (e.g. red border, pulsing ring, or alert icon)
- No highlight if the reservation is not yet marked arrived — the player's checkbox habit determines whether this cue fires

This teaches the habit naturally: players who check off arrivals get a clear visual payoff when an impersonator appears.

---

## Detection Paths Summary

| Situation | Player action | Cue | Correct accusation |
|---|---|---|---|
| Impersonator, real party already marked arrived | Question name → check ledger | Red highlight on arrived row | "No reservation" |
| Impersonator, real party not marked | Question time → compare to clock | Large timing gap (45+ min late) | "Time" |
| Regular scammer (no claimed reservation) | Cross-reference ledger | Name matches no reservation | "No reservation" |

---

## Out of Scope

- "Too early" timing detection (kept simple — scammers are only late)
- Pre-scheduled scammer/reservation pairs (randomness at spawn is sufficient)
- New accusation types
