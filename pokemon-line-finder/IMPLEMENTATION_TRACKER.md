# Implementation Tracker

This document tracks remaining work after Phase 1 mechanics.

## Phase 2 - Line Finder and Risk Model

- Add search mode toggle: worst-case vs probabilistic.
- Keep worst-case path single-branch and deterministic.
- Add probabilistic branching and expected win probability aggregation.
- Add line metadata labels: guaranteed, requires favorable rolls, fails worst-case.
- Add explanation metadata per line for risk reasoning.
- If performance degrades, add:
  - Adaptive beam width scaling.
  - State dedup pruning upgrades.
  - Hash-based battle state caching.

## Phase 3 - Data Layer Unification

- Replace mock move definitions with structured data schema.
- Build importer for PokeAPI and Run & Bun data.
- Normalize raw data into internal schema.
- Keep separation between raw data and simulation logic.
- Unify trainer data source and remove duplicate parsing paths.

## Phase 4 - Abilities and Items Expansion

- Abilities: Intimidate, Levitate, Guts, Mold Breaker, Clear Body.
- Items: Focus Sash, Choice lock behavior, Life Orb recoil.
- Add healing item usage action and X-item boost action.
- Add event-based ability and item hooks (avoid hardcoded per-ability in main engine).
- Tests:
  - Intimidate trigger on switch-in.
  - Focus Sash survival.
  - Choice lock enforcement.

## Phase 5 - UI Improvements

- Hazard display.
- Status display.
- Field effects display.
- Search mode toggle (worst-case/probabilistic).
- Line comparison view.
- UI must consume battle state rather than recomputing logic.

## Phase 6 - Test Expansion

- Unit tests for each new mechanic.
- Integration tests:
  - Worst-case vs probabilistic.
  - Multi-turn logic.
  - Item triggers.
- Keep default test output concise and deterministic.
