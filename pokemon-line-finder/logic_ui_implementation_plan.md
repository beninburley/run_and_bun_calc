# Logic + UI Implementation Plan

This guide is for implementing Phase 6 logic and UI enhancements without breaking existing systems. It assumes minimal familiarity with the codebase and focuses on where changes belong and how to validate them.

## 1. Relevant Context

### Battle Engine High-Level Flow

- The core battle simulator is in [src/engine/battle.ts](src/engine/battle.ts). It creates and clones battle state, resolves turns, applies damage, statuses, hazards, weather, terrain, and end-of-turn effects.
- Turn resolution happens in the simulateTurn function. It normalizes actions, determines move order, executes actions, applies end-of-turn effects, and returns a TurnOutcome with a resulting BattleState.
- Faint checks happen during and after move resolution, then again after end-of-turn effects. Active Pokemon and team arrays are kept in sync after actions.

### Line Search and Battle State Structure

- Lines are computed by findLines in [src/engine/lineFinder.ts](src/engine/lineFinder.ts). The search stores actions as TurnOutcome entries.
- SearchState includes battleState, depth, probability, and actionsThisLine. Lines are sorted by guaranteed success, casualties, success probability, and length.
- Battle state is a serializable object: no classes, no external references, and cloning uses JSON stringify/parse.

### UI Rendering of Lines

- The UI is in [src/App.tsx](src/App.tsx). It renders lines and uses helper summaries from [src/utils/lineSummary.ts](src/utils/lineSummary.ts).
- Lines are shown as cards with summary metadata (risk, turns, casualties). A comparison view shows end-state summaries for selected lines.

### Constraints and Invariants

- Worst-case mode must remain deterministic (no RNG branches, no probabilistic success calculations).
- BattleState must remain JSON-serializable and free of global mutable state.
- Battle flow should not rely on browser or Node globals; tests and UI must remain separate.
- Manual switches consume a turn; forced replacements after a faint must not consume a turn.

## 2. Objective 1: Battle Logic Fix – Faint Replacement Timing

### Required Behavior

- When a Pokemon faints, a replacement is selected and sent in at the end of the current turn.
- The replacement does not consume a turn. Both Pokemon act normally on the next turn.
- Manual switching remains a normal action at the start of a turn and consumes the player action.

### Where Faint Resolution Happens Now

- In [src/engine/battle.ts](src/engine/battle.ts), simulateTurn sets playerFainted and opponentFainted flags during move execution and after end-of-turn effects.
- The function ends with both actives still as the fainted Pokemon (unless a manual switch action occurred that turn).

### What to Add

- Add a pending replacement concept to BattleState, for example:
  - playerPendingReplacement: boolean or index
  - opponentPendingReplacement: boolean or index
- When an active Pokemon hits 0 HP during a turn, set pending replacement for that side.
- At the end of simulateTurn, after end-of-turn effects and final faint checks, resolve pending replacements:
  - Choose the first alive Pokemon in team order (or a deterministic selector) for both player and opponent.
  - Apply switch-in hazards and switch-in abilities for the replacement.
  - Do not mark the next turn as a switch action. The new active Pokemon should be ready to act.

### Exact Insertion Points

- In [src/engine/battle.ts](src/engine/battle.ts), add pending replacement tracking immediately after any faint detection in executeAction and after end-of-turn damage.
- Insert replacement resolution after end-of-turn effects and before incrementing turn and returning TurnOutcome.

### Interaction with Speed Ties and Multi-Turn Moves

- Speed ties and move order are evaluated at the start of the next turn. Replacement should not alter the previous turn’s move order.
- If the attacker was charging a multi-turn move and fainted, clear its charging state when it becomes a fainted active.
- If the defender faints mid-move, do not allow the attacker to target a replacement within the same turn.

### Interaction with End-of-Turn Effects

- Replacement should happen after end-of-turn status damage, weather, terrain, and item effects are applied to the original active Pokemon.
- Hazards should be applied to the replacement at the moment it enters (end of turn).

### Tests to Add

- Unit tests in [src/utils/testBattleMechanics.ts](src/utils/testBattleMechanics.ts):
  - Faint replacement occurs without consuming a turn.
  - The replacement’s hazards and switch-in abilities apply at end of turn.
  - Manual switching still consumes the action and happens at start of turn.
- Integration tests in [src/utils/testIntegration.ts](src/utils/testIntegration.ts):
  - A KO on turn 1 leads to replacement at end of turn 1 and both act on turn 2.
  - Double faint results in both replacements entering (or battle ending if no replacements).

## 3. Objective 2: UI Decision Flow Improvements

### Goal

Render a horizontal, tree-style decision view of battle lines where nodes represent turns and branches represent decisions or RNG outcomes.

### React Component Structure

- DecisionTree: top-level component that receives a tree structure and renders the root row.
- TurnNode: renders a single turn node with actions and outcome summary.
- BranchContainer: renders child nodes aligned horizontally, with connectors.
- ExpandButton: inline control to toggle child visibility.

### Expected Data Shape

- A tree node should include:
  - nodeId
  - turnIndex
  - playerActionSummary
  - opponentActionSummary
  - outcomeSummary (damage, faint, status, RNG)
  - children: array of nodes
  - branchType: player-decision, opponent-decision, rng-branch

### Mapping Line Finder Output to a Tree

- Lines are currently arrays of TurnOutcome in LineOfPlay.
- Build a tree by merging common prefixes of lines:
  - For each line, walk from root and reuse existing nodes if the TurnOutcome matches.
  - If a mismatch occurs, create a new child node and continue.
- TurnOutcome matching should compare action types, move names, and key outcome markers (KO, status, and RNG risks).

### Expansion State

- Track expansion state locally in DecisionTree using a map of nodeId to boolean.
- Default to collapsed beyond depth 2 to avoid huge DOM trees.
- When in probabilistic mode, allow expanding RNG branches separately from decision branches.

### Performance Considerations

- Avoid rendering the entire tree at once for large line sets.
- Only render children when their parent is expanded.
- Use memoization for node rendering and summary calculations.

### Worst-Case vs Probabilistic Modes

- Worst-case should show a single path by default with minimal branching.
- Probabilistic mode should show multiple RNG branches under a node.
- Keep RNG labels distinct so it’s obvious why branches exist.

### Separation of Concerns

- The UI should only transform line outputs into a tree for display.
- The battle engine and line finder should not be aware of tree rendering.

## 4. Testing and Validation

### Unit Tests for Faint Replacement

- Confirm replacement occurs at end of turn, not as a next-turn action.
- Confirm replacement receives hazard damage and switch-in ability effects.
- Confirm no replacement occurs if no alive Pokemon remain.

### Integration Tests for Turn Flow

- Test: KO in turn 1, replacement appears end of turn, both act on turn 2.
- Test: simultaneous KO (double faint) resolves both replacements correctly.

### UI Tests

- Component test for DecisionTree expansion toggles.
- Snapshot test for tree layout with two branching lines.

### Edge Cases

- Double faint from recoil or end-of-turn status damage.
- Last Pokemon faints: battle ends without replacement.
- Forced switch moves (Roar, Whirlwind) should still consume a turn and are separate from faint replacement logic.

## 5. Implementation Order

1. Refactor battle loop if needed to support pending replacement state.
2. Implement faint replacement timing in simulateTurn.
3. Add unit tests for faint replacement and hazard/ability application on replacement.
4. Add integration tests for turn flow correctness.
5. Update line finder handling if new battle state fields require cloning or serialization updates.
6. Build tree data transformer in a UI utility module.
7. Implement DecisionTree UI components and expansion logic.
8. Add UI tests and confirm npm test output remains concise and deterministic.
