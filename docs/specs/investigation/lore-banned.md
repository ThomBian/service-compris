---
title: The Banned List & Rogues Gallery
version: 1.1.0
last_updated: 2026-03-28
status: active
---

# Feature Spec: Banned List & Rogues Gallery

## 1. The Core Banned Mechanic
Banned characters are active saboteurs. They attempt to sneak into the restaurant using fake names, disguises, or hiding within legitimate parties.
- **The Interaction:** The player must open the **Banned Tab** on the clipboard and click the specific **Sketch** that matches the customer at the desk.
- **The Result:** This triggers an instant, Justified Refusal. The Maître D' delivers a custom voice line kicking them out, granting a Cash or Morale Bounty to the player.
- **The Failure State:** If the player fails to recognize them and seats them, a unique disaster occurs on the Floorplan grid.

## 2. The Rogues Roster & Disasters

### Supreme Leader Jin Kong-Il (Dictator)
- **Entering the Game:** Books under the incredibly fake name "Dave." 
- **Visual Clue:** A distinct, blocky trapezoid haircut and oversized black sunglasses.
- **Banned Sketch:** A crude drawing of a trapezoid hair shape.
- **Game Impact (If Seated):** He is heavily sanctioned. If seated, international authorities shut down the restaurant. Instant **Game Over**.
- **Custom Interaction (If Caught):** *"Nice try, 'Dave'. Leave before I call the UN."*

### Sodium Bae (Fake Influencer)
- **Entering the Game:** Claims to be a VIP, but his name is conspicuously missing from the VIP Tab.
- **Visual Clue:** Standing at the desk with his arm raised in a ridiculous "salt sprinkle" pose.
- **Banned Sketch:** A drawing of a hand sprinkling salt.
- **Game Impact (If Seated):** He will go table-to-table sprinkling salt on other guests' food, causing them to leave early without paying.
- **Custom Interaction (If Caught):** *"You are not on the list. Take your sunglasses off indoors and get out."*

### The Phantom Eater (Serial Scammer)
- **Entering the Game:** Appears on multiple different nights, wearing a slightly different disguise each time (fake mustache, wig, health inspector badge).
- **Visual Clue:** Regardless of the disguise, he always has a sparkling **chipped gold tooth**.
- **Banned Sketch:** A drawing of a smiling mouth with one gold tooth.
- **Game Impact (If Seated):** He will eat for the maximum meal duration, take up a massive table, and leave exactly $0. 
- **Custom Interaction (If Caught):** *"I know it's you, Phantom. Not tonight."*

### Chef Balzac (The Saboteur)
- **Entering the Game:** Does not book his own table. He spawns as an extra `+1` member attached to a completely innocent, legitimate reservation (e.g., A real booking for 3 arrives with 4 people).
- **Visual Clue:** He is the 4th avatar standing in the back, wearing a fake nose and glasses.
- **Banned Sketch:** A drawing of a chef's hat with a crossed-out red line.
- **Game Impact (If Seated):** If the player just accuses the party of a standard "Size Lie," the whole party leaves. But if the player clicks Balzac's sketch on the Banned List, the Maître D' extracts Balzac, kicks him out, and seats the innocent party of 3, earning a massive **Sabotage Prevented Bonus**.