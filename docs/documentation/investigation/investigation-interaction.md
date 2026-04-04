---
title: Tactile Investigation (The Single-Click System)
version: 1.0.0
last_updated: 2026-03-22
status: active
---

# Feature Spec: Tactile Investigation & Social Rules

## 1. The Single-Click Mechanic
There are no generic "Interrogate" or "Accuse" buttons or menus. The UI is completely tactile. The player investigates and accuses by clicking directly on physical UI elements on the desk.

### Gathering Information
- Clicking an empty line on the customer's "Party Ticket" (e.g., `[Name: _______]`) prompts the Maître D' to ask for that specific information, draining standard patience and filling the ticket.

### The Accusation (Gotcha!)
To call out a lie, the player clicks the suspicious element. The game engine automatically evaluates if the accusation is mathematically true based on the customer's hidden stats.
- **Size Lie:** Click the **2D Avatars** standing at the desk. (Triggers if `trueSize` > Booked Size).
- **Time Crime:** Click the **Party Ticker -> Arrival Time**. (Triggers if Arrival Time is >30 mins late).
- **Dietary Mismatch:** Click the **2D Avatars -> Buble with Allergy** . (Triggers if the customer's stated diet is incompatible with tonight's menu items).
- **Banned List:** Click the **Banned Sketch** on the clipboard. (Triggers if the customer is flagged as a banned NPC).

## 2. False Accusations
Players cannot "spam click" the desk to blindly fish for lies. 
- If the player clicks an element to accuse the customer, but the customer is innocent (e.g., clicking the Arrival Ticket when they were actually on time), it triggers a **False Accusation**.
- **Consequence:** The customer is deeply insulted. Massive patience penalty (-30)

## 3. The VIP Exception
- VIPs are listed on a dedicated clipboard tab. 
- **The Rule:** VIPs cannot be refused, even if they are late, bring extra people, or violate the dress code. 
- If a player tries to click an element to accuse a VIP, the game prevents the Justified Refusal and instead forces the player to accommodate them (often requiring the player to brutally crop them on the Floorplan grid to make them fit).