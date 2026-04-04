---
title: Dietary Mismatch
version: 0.1.0
last_updated: 2026-03-24
status: planned
---

# Feature Spec: Dietary Mismatch

> **Status: PLANNED — Not yet designed.**
> This spec is a placeholder. Full design to be done in a future brainstorm session.

## Overview

Customers may have dietary restrictions that are incompatible with tonight's menu. Clicking the allergy bubble on a 2D avatar triggers a dietary mismatch accusation.

## Rough Scope
- Nightly menu data model (dishes + allergens)
- Customer dietary restriction field (hidden truth vs. stated)
- Allergy bubble on 2D avatars (clickable accusation target)
- Accusation logic: stated diet incompatible with menu items → justified refusal

## Dependencies
- Sub-project 1 (Tactile Party Ticket) must ship first
- Sub-project 2 (2D Avatars) must ship first (avatars needed for allergy bubbles)
- Sub-project 3 (Clipboard) must ship first (Menu tab needed to show tonight's menu)
