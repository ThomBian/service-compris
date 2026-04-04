---
title: Clipboard — VIPs & Banned List
version: 1.1.0
last_updated: 2026-03-24
status: active
---

# Feature Spec: Clipboard — VIPs & Banned List

## 1. Overview
The Clipboard is a physical UI element residing on the desk. It acts as the Maître D's primary reference tool for daily special rules. It features three interactive, clickable tabs: **Menu**, **VIPs**, and **Banned**. 

To prevent the spatial disconnect observed in playtesting, the Clipboard should dynamically slide out or remain visually anchored near the Customer Avatar and Party Ticket during the Desk Phase.

## 2. UI Layout & Interactions
- **The Tabs:** The player clicks a tab to bring that specific sheet of paper to the front of the clipboard.
- **The Menu Tab:** Lists tonight's special. (Out of scope)
- **The Banned Tab:** Displays crude, hand-drawn sketches or visual clues of troublemakers. (Out of scopes)
- **The VIP Tab (The Dossier):** Lists the aliases, visual clues, or specific demands of highly important guests expected that night (e.g., *"Food Critic: Wearing a red scarf, allergic to peanuts"* or *"Mayor's Son: Booking under the fake name 'Smith', party of 4"*).


## 3. The VIP Mechanic (Undercover Deduction)
VIPs will not announce themselves. They will often break standard rules (arrive very late, bring extra people, or use a fake name). The player must actively deduce their hidden identity *before* accidentally refusing them.
- **The Setup:** A customer arrives and commits a "Time Crime" (40 minutes late). The player's first instinct is to refuse them. But wait—they are wearing a red scarf. 
- **The Tactile Action:** The player opens the VIP Tab and **clicks the specific VIP Clue** (e.g., *"Red Scarf"*).
- **The Reveal (Success):** - The Maître D' says: *"Ah, an honor to have you tonight. Right this way."* - The customer's "VIP" status is revealed. 
  - The `[REFUSE]` button becomes visually locked/greyed out. The player *must* now accommodate their broken rules and seat them on the Floorplan.
- **The Failure State (The Landmine):** - If the player fails to identify the VIP and clicks the arrival time to accuse them of being late (or simply clicks `[REFUSE]`), the VIP drops their disguise. 
  - *"DO YOU KNOW WHO I AM?!"* - **Penalty:** Devastating loss of Stars or an instant Game Over (Fired), depending on the VIP's rank.

## 4. Store / Data Model Updates (Zustand)
To support this, the `useGameStore` needs the following state additions:
- `dailyMenu: { type: 'SEAFOOD' | 'VEGAN' | 'STEAKHOUSE' }`
- `vipList: { id: string, clueText: string, visualTrait?: string, fakeName?: string }[]`
- `bannedList: BannedVisualTraits[]`
- `Customer` type expanded to include `isVIP: boolean`, `isVIPRevealed: boolean`, `isBanned: boolean`, and `visualTraits: string[]`.

## 5. Dependencies
- Sub-project 1 (Tactile Party Ticket UI) must be fully implemented.
- The single-click accusation engine must be running to support the VIP reveal logic.