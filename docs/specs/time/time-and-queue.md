---
title: Time Engine & The Queue
version: 1.0.2
last_updated: 2026-03-22
status: active
---

# Feature Spec: Time Management & Punctuality

## 1. The Dual-Time System
To ensure the game is fair to both the player and the customer, time is tracked via two distinct metrics:
- **The Master Clock:** The continuous in-game time of the shift (e.g., 19:30 to 23:30).
- **The Arrival Ticket:** A physical timestamp generated the exact millisecond a customer spawns into the queue.

## 2. Time Flow (The Relentless Clock)
The game utilizes a continuous real-time system. The Master Clock never pauses during the shift.
- **The Queue (Time-Drain):** Every time the Master Clock ticks, the patience of every customer standing in the queue drains. 
- **The Desk (Action-Drain):** When a customer steps up to the desk, their *time-based* patience drain STOPS. They will patiently wait while you look at your clipboards. However, they lose patience based on your *actions* (e.g., asking redundant questions, false accusations).
- **The Floorplan:** Because the Master Clock never stops, tables currently eating will continue to progress toward finishing their meals even while the player is interrogating someone at the desk.

## 3. Punctuality (The Fairness Rule)
The player is punished for being slow; the customer is punished for being late. These two concepts must never cross.
- **Player Slowness:** If the player takes too long interrogating someone (or intentionally stalls to wait for a table to clear), the queue outside continues to bake. Customers will eventually reach the desk with almost 0 Patience, leaving the player no room for error during investigation.
- **Customer Lateness (Time Crime):** A customer is ONLY considered "Late" if their printed `Arrival Ticket` time is >30 in-game minutes past their `Booked Time`. 
- **The Trap:** If a customer booked for 20:00 arrives at 20:00, but doesn't reach the desk until 20:45 due to a slow queue, accusing them of being late based on the Master Clock results in a massive False Accusation penalty.

---

## V1.0.1
# Feature Spec: Time Engine & The Queue

## 1. The Time Engine (The Heartbeat)
- **Time State:** The game runs on a central time engine (`inGameMinutes`), starting at `1170` (19:30).
- **Time Controls:** The player controls a `timeMultiplier` (Paused, Normal, Fast, Very Fast).
- **The Tick:** A single `tickTime()` function drives the game. All patience drains and meal durations are synced to this in-game tick.

## 2. The Queue (Waiting Line)
- **Spawning:** Customers spawn at intervals and are pushed to a `queue` array outside the restaurant.
- **Patience Drain (Time-Based):** Every tick, customers in the `queue` lose Patience. If patience hits 0, they storm out (Rating penalty).
- **The Fairness Rule (`spawnTime`):** When a customer spawns, the game takes a snapshot of the time (`spawnTime`). All "Late" calculations are strictly based on `spawnTime`. Customers are never penalized for spending 40 minutes waiting in a slow line caused by the player.
- **Movement:** When the Desk is empty, the customer at index 0 of the queue steps up to the Desk.

---
## Changelog
- **V1.0.2** Introduce concept of arrival in the queue vs real time
- **v1.0.1:** Clean slate reset. Replaced real-time ticking with `inGameMinutes`. Introduced the `spawnTime` Fairness Rule.
- **v1.0.0:** Initial draft (Deprecated).
