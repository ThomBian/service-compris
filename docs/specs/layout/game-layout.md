---
title: Game Layout, Vibe & Atmosphere
version: 1.0.0
last_updated: 2026-03-22
status: active
---

# Feature Spec: Game Layout, Vibe & Atmosphere

## 1. The Vibe: "Bureaucratic Hospitality"
The game should feel like a high-stress border checkpoint disguised as a luxury restaurant. The player is not a friendly host; they are a gatekeeper. 
- **Visuals:** Muted, elegant colors (dark woods, gold accents, dim lighting) contrasting with harsh, bureaucratic UI elements (stamps, ledgers, clipboards).
- **Audio:** A stark contrast between the muffled, elegant jazz playing inside the dining room, and the chaotic ambient noise of the street/queue outside. Actions should have heavy, tactile sound effects (paper shuffling, heavy thud of a rubber stamp, the scratch of a pen).

## 2. The Screen Layout (Two Main Views)
The player toggles between two primary screens. They cannot look at both simultaneously, creating deliberate blind spots.

### View A: The Desk (Investigation Phase)
A first-person perspective of the Maître D' podium.
- **Up (The Queue):** 
    - The Maite D' at a Desk in front of the door
    - The Door of the restaurants, Clicking on them open the View B
    - The silhouettes of 2D people showing in the line building up outside.
- **Bottom (The Tools):** 
  - The heavy, physical **Booking Ledger** with list of reservations confirmed for tonight (full name, party, hour, arrived?)
  - The **Clipboard** (When Open the Player can see Menu, VIPs, Banned List)
  - The **Party Ticket** (fills out during chat) with Arrival in the queue and Full name if given
- **Top bar:** The Master Clock, the Restaurant Star Rating, The Restaurant Money, the Staff Moral

### View B: The Floorplan (Tetris Phase)
Triggered when the player clicks on the Door.
- The desk dims or slides down.
- A glowing NxN grid appears over a blueprint-style background of the restaurant.
- The UI shifts from "investigator" to "architect." 
- `OCCUPIED` tables slowly drain of color as their meal timer ticks down.

## 3. UI Feedback Mechanics
- **Patience:** Instead of a standard health bar, patience is shown via the customer's expression and the color/shake of their text bubbles. 