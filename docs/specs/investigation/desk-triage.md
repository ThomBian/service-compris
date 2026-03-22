---
title: Customer Triage & Investigation
version: 2.0.0
last_updated: 2026-03-21
status: active
---

# Feature Spec: Customer Triage & Investigation

## 1. Customer Archetypes & The Booking List
The `reservations` array is the ultimate source of truth.
- **Walk-ins:** Honest by default. State party size upfront. No investigation needed.
- **Legit Reservations:** Exist in the book. 
  - *Time Crime:* Their `spawnTime` is > 30 in-game minutes past their booked time.
  - *Size Lie:* They brought strictly *more* people than they booked for.
- **Scammers:** Claim to have a reservation but are using a fake name or stealing a real one. Not in the book.

## 2. The Desk Phase
When a customer is at the Desk, time-based patience STOPS. Action-based patience begins.
- **Investigation:** The player asks questions to cross-reference the Booking List.
- **The Vibes (Consequences):**
  - *Clarification:* Valid missing info revealed. Slight patience drop (-10).
  - *Frustration:* Asking for info already given. Heavy patience drop (-20).
  - *Gotcha:* Exposing a contradiction (e.g., booked 2, brought 4). The 'LIE' flag is revealed. No patience drop (0).

## 3. The Triage Decisions
After investigating, the player has three choices at the Desk:
- **Refuse (The Judge):** - *Justified (0 Penalty):* Player caught a Size Lie, Scammer, or Time Crime.
  - *Unjustified (-0.5 ⭐ Penalty):* Player turned away an honest, on-time client.
- **Wait in Line (Purgatory):** Customer steps backward into the Queue. Action-patience stops, time-patience resumes. The Desk opens for the next person.
- **Seat Party:** Triggers the Floorplan Grid phase.

---
## Changelog
- **v2.0.0:** Stripped out bar logic and automatic table assignments. Clarified Scammer logic. Added "Wait in Line" fallback action.
- **v1.0.0:** Initial draft (Deprecated).
