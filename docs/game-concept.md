---
title: Overall Game Concept & Core Loop
version: 2.0.0
last_updated: 2026-03-21
status: active
---

# Game Concept: The Maître D' Simulator

## 1. The Premise
You are the Maître D' at a highly sought-after, overbooked restaurant. Your job is to manage the door, maximize profits, and keep the restaurant's star rating high. 

However, the customers are ruthless. They will lie about their reservations, bring extra people, show up late, or try to steal other people's tables. You must act as a detective at the desk and a spatial genius on the floorplan to survive the shift.

## 2. The Core Gameplay Loop
The game is played in continuous real-time (with pause/fast-forward controls) and consists of three interconnected phases:

### Phase 1: The Queue (Pressure)
Customers spawn outside the restaurant. As time ticks by, their patience drains. If you take too long dealing with the person at the desk, the people outside will storm out, tanking your restaurant's rating.

### Phase 2: The Desk (Investigation & Triage)
When a customer steps up to the podium, you must cross-reference their claims against the official Booking List. 
- You spend the customer's patience to ask investigation questions.
- You must actively spot Liars (brought too many people), Time Crimes (arrived >30 mins late), and Scammers (fake reservations).
- You decide to either **Refuse** them (judged silently by the game for fairness), tell them to **Wait in Line**, or **Seat** them.

### Phase 3: The Floorplan (Restaurant Tetris)
If you choose to seat a party, the game shifts to a 2D grid puzzle.
- You must physically "paint" their table onto an NxN grid.
- Tables must be contiguous blocks. 
- You must balance the physical space: Do you perfectly fit a party of 4, or do you violently "crop" them down to 2 people to fit them in a corner (taking a massive rating penalty but securing the cash)?
- Once seated, they occupy that space for a set `mealDuration` before leaving and freeing up the grid for the next rush.

## 3. Win / Loss Conditions (The Shift)
- **Goal:** Survive the night (e.g., from 19:30 to 23:30) while maximizing **Cash** and maintaining a high **Star Rating**.
- **The Risk/Reward:** Seating a known liar grants a massive "Grateful Liar" bonus, but risks clogging up your Tetris grid and forcing you to turn away an honest reservation later—which carries a devastating penalty.

---
## Changelog
- **v2.0.0:** Pivoted the concept from a pure UI clicker to a deep "Triage + Spatial Puzzle" game. Introduced the "Restaurant Tetris" floorplan and the "Omniscient Judge" refusal system.
- **v1.0.0:** Initial concept (Deprecated).
