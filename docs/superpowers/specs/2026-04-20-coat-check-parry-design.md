# COAT_CHECK — Parry / Duchess Thrower (Revision)

**Date:** 2026-04-20  
**Status:** approved (direction locked)  
**Parent:** [2026-04-13-boss-encounters-design.md](./2026-04-13-boss-encounters-design.md)

---

## Summary

Replace the **basket + falling items** prototype with a **parry** mini-game framed as **The Duchess** at the top of the screen **moving and throwing** objects toward the player’s zone. The player **taps/clicks** to **parry** each threat in time. **Three misses** (items reach the floor / danger zone without a successful parry) → **lose**. **Survive the full round** without three misses → **win**.

**Round length:** **20 seconds** (aligned with boss encounter time budget in the parent spec).

---

## Fantasy & Lore

- **The Duchess** (`aristocrat` in `bossRoster`) is the antagonist of the encounter; existing copy already ties **the floor** and the **poodle** to failure.
- She is not “dropping laundry”—she is **dispatching entourage debris** (fan, ribbon, accessory, calling card, etc.) as **social pressure**.
- The player is **the house**: parries read as **refusal**, **composure**, or **denying** her chaos before it **touches the floor** (failure state).

---

## Core Loop

1. **Phase:** Single continuous round (~20s). No separate waves unless we add polish later.
2. **Duchess presentation:** A **visible figure or silhouette** at the **top** of the playfield **moves horizontally** (patrol, strafe, or smooth ping-pong) so throws feel **aimed**, not random rain.
3. **Throws:** Items **spawn near the Duchess** and travel **downward** (or toward a clear **danger line** at the bottom). Spawn timing can vary (rhythm + slight randomness) to stay readable.
4. **Parry:** Player **clicks/taps** the item (or a parry zone overlapping it) while it is inside a **parry window** (hitbox + optional forgiving timing).
  - **Success:** Item is **destroyed / batted away** with clear **VFX** (particles, flash, stamp, “denied” micro-copy optional).
  - **Failure:** Item crosses the **danger line** or **lands** → **+1 miss**. At **3 misses** → **onLose** immediately (or after short feedback—implementation detail).
5. **Win:** Timer reaches **0** with **misses < 3** → **onWin**.

---

## Win / Lose


| Outcome  | Condition                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Win**  | 20s elapsed and **miss count < 3**                                                                                                  |
| **Lose** | **Miss count === 3** at any time, **or** optional **timer expire** with same lose if we ever add fail-on-time (not required for v1) |


**v1 default:** Timer expiry with **< 3 misses** = win. Timer expiry is not a separate lose unless design changes.

---

## Interaction & Feel

- **Primary input:** Pointer **down** on target (desktop + touch). Reuse **pointer capture** patterns where needed for touch reliability.
- **No basket slider** in v1 (replaces prior mechanic). Positioning skill is replaced by **timing + targeting**.
- **Juice:** Screen-safe **shake** or **chromatic** on miss; **crisp** audio on parry; **muted thud** on miss—tone: club / social horror, not cartoon shooter.

---

## Technical Notes (for implementation plan)

- `**BossEncounterOverlay`:** `DURATIONS.COAT_CHECK` must be **20000** ms to match the 20s design (currently 12000 in code—update when implementing).
- `**CoatCheckGame`:** Rebuild or refactor into **Duchess entity + projectile pool + miss counter + timer**; remove basket-specific physics unless reused for visuals only.
- **i18n:** New/updated keys for **instruction**, optional **parry success** flavor (short), and **miss** feedback if shown in UI (EN + FR).
- **Tests:** Pure helpers (hit tests, miss counting) unit-testable; timer integration can be light.

---

## Out of Scope (v1)

- Hybrid basket + parry
- Difficulty tiers / accessibility sliders (can be a fast follow)
- Full narrative VO or multi-phase waves

---

## Open Questions (non-blocking)

- Exact **throw density** curve over 20s (flat vs. ramp-up)—tune in playtest.
- **Duchess** art: reuse **PixelAvatar** + label vs. minimal silhouette—either is fine for v1 if motion reads.