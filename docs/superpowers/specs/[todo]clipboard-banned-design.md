---
title: Clipboard — Banned List
date: 2026-03-25
status: todo
---

# Clipboard — Banned List

> **Status: TODO — Not yet designed.**
> This spec is a placeholder. Full design to be done in a future brainstorm session.

## Overview

The Banned tab on the Clipboard shows crude hand-drawn sketches of known troublemakers. Clicking a sketch on the clipboard when the matching client is at the desk accuses them of being banned — consistent with the single-click accusation mechanic used for other lie types.

## Rough Scope

- Banned character definitions (visual sketches referencing `VisualTraits`)
- `bannedList` in `GameState` — today's banned characters
- Accusation flow: clicking the matching sketch fires a ban check; false accusation applies patience penalty
- Consequence for seating a banned client (inverse of VIP — you should have refused them)

## Dependencies

- Sub-project 2 (2D Party Avatars) — `VisualTraits` and `ClientAvatar` must be in place ✅
- Sub-project 3 (Clipboard VIP) — Clipboard component structure must be in place
