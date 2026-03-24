---
title: Clipboard — VIPs & Banned List
version: 0.1.0
last_updated: 2026-03-24
status: planned
---

# Feature Spec: Clipboard — VIPs & Banned List

> **Status: PLANNED — Not yet designed.**
> This spec is a placeholder. Full design to be done in a future brainstorm session.

## Overview

A physical clipboard UI element on the desk with tabbed sections. The player flips between Menu, VIP list, and Banned List. VIPs cannot be refused regardless of violations; the Banned List sketch triggers an accusation if matched.

## Rough Scope
- Clipboard UI widget with tab navigation (Menu / VIPs / Banned)
- VIP data model + VIP exception logic (cannot accuse, must accommodate)
- Banned List data model + accusation trigger via clicking a sketch
- Forced accommodation mechanic for VIPs (crop on floorplan rather than refuse)

## Dependencies
- Sub-project 1 (Tactile Party Ticket) must ship first
