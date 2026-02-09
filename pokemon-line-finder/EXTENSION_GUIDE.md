# Extension Points & Architecture Guide

This document explains how to extend the Pokémon Run & Bun Line Finder for Phase 2 and beyond.

## 🏗️ Architecture Overview

### Data Flow

```
User Input (Team Selection)
         ↓
    findLines() - Line Finder
         ↓
   simulateTurn() - Battle Simulator
    ├─→ calculateAIDecision() - AI Engine
    └─→ processMove() → calculateFullDamage() - Damage Calculator
         ↓
   TurnOutcome - Results
         ↓
    Risk Analysis
         ↓
   LineOfPlay[] - Display to User
```

### Module Responsibilities

| Module                 | Responsibility                | Stateful?                    |
| ---------------------- | ----------------------------- | ---------------------------- |
| `types/`               | Type definitions only         | No                           |
| `data/constants.ts`    | Static game data              | No                           |
| `engine/damage.ts`     | Pure calculation functions    | No                           |
| `engine/ai.ts`         | AI decision logic             | No                           |
| `engine/battle.ts`     | State management & simulation | Yes (creates new states)     |
| `engine/lineFinder.ts` | Search algorithm              | Yes (maintains search state) |
| `utils/testData.ts`    | Mock data generation          | No                           |
| `App.tsx`              | UI & user interaction         | Yes (React state)            |

## 🔌 Extension Points

### 1. Adding New Moves

**File**: Create move data where needed (will eventually come from API)

**Current**: See `testData.ts` `createMove()` function

**To Add Special Effects**:

```typescript
// In types/index.ts - Update Move interface
export interface Move {
  // ... existing properties

  // Add new effect type
  newEffect?: {
    type: "your-effect-name";
    power: number;
    chance?: number;
  };
}
```

```typescript
// In engine/damage.ts - calculateDamage()
// Add effect handling in the modifiers section

if (move.newEffect) {
  // Apply effect logic
  modifiers *= calculateNewEffectModifier(move, attacker, defender);
}
```

```typescript
// In engine/ai.ts - Update AI scoring
function scoreStatusMove(...) {
  // Add scoring for your new move type
  if (moveName === 'your-new-move') {
    score = calculateSpecialScore(...)
    reasoning.push(...)
  }
}
```

### 2. Implementing Abilities

**File**: `src/engine/abilities.ts` (create new)

```typescript
export type AbilityEffect =
  | "damage-modifier"
  | "immunity"
  | "stat-change"
  | "weather-change";

export interface AbilityHandler {
  name: string;
  effects: AbilityEffect[];
  onDamageCalculation?: (calc: DamageCalculation) => DamageCalculation;
  onTurnStart?: (pokemon: PokemonInstance, state: BattleState) => void;
  onSwitch?: (pokemon: PokemonInstance, state: BattleState) => void;
}

// Example: Intimidate
export const INTIMIDATE: AbilityHandler = {
  name: "Intimidate",
  effects: ["stat-change"],
  onSwitch: (pokemon, state) => {
    // Lower opponent's attack by 1 stage
    state.opponentActive.statModifiers.atk = Math.max(
      -6,
      state.opponentActive.statModifiers.atk - 1,
    );
  },
};
```

**Integration**: Modify `engine/damage.ts` and `engine/battle.ts`

```typescript
// In calculateDamage()
import { getAbilityEffects } from "./abilities";

// Before applying modifiers
const abilityMods = getAbilityEffects(attacker, defender, move, battleState);
modifiers *= abilityMods.damageMod;
```

### 3. Adding Held Items

**File**: `src/engine/items.ts` (create new)

```typescript
export interface ItemEffect {
  name: string;
  type: "damage-boost" | "stat-boost" | "survival" | "recovery";

  // Item handlers
  onDamageCalculation?: (calc: DamageCalculation) => DamageCalculation;
  onTakeDamage?: (damage: number, holder: PokemonInstance) => number;
  onTurnEnd?: (holder: PokemonInstance, state: BattleState) => void;
}

// Example: Life Orb
export const LIFE_ORB: ItemEffect = {
  name: "Life Orb",
  type: "damage-boost",
  onDamageCalculation: (calc) => {
    return {
      ...calc,
      damageRange: {
        ...calc.damageRange,
        min: Math.floor(calc.damageRange.min * 1.3),
        max: Math.floor(calc.damageRange.max * 1.3),
      },
      recoilDamage: Math.floor(calc.attacker.stats.hp * 0.1),
    };
  },
};
```

### 4. Integrating Real Pokemon Data

**File**: `src/data/pokemon.ts` (create new)

```typescript
import { PokemonInstance, Stats } from "../types";

interface PokeAPIResponse {
  name: string;
  types: Array<{ type: { name: string } }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  // ...
}

export async function fetchPokemonData(species: string): Promise<{
  baseStats: Stats;
  types: PokemonType[];
  abilities: string[];
}> {
  const response = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${species.toLowerCase()}`,
  );
  const data: PokeAPIResponse = await response.json();

  return {
    baseStats: parseStats(data.stats),
    types: parseTypes(data.types),
    abilities: parseAbilities(data.abilities),
  };
}

// Cache layer
const pokemonCache = new Map<string, ReturnType<typeof fetchPokemonData>>();

export async function getCachedPokemonData(species: string) {
  if (!pokemonCache.has(species)) {
    pokemonCache.set(species, await fetchPokemonData(species));
  }
  return pokemonCache.get(species)!;
}
```

**Usage in UI**:

```typescript
// In App.tsx
const [customTeam, setCustomTeam] = useState<PokemonInstance[]>([]);

async function importPokemon(name: string, level: number) {
  const data = await getCachedPokemonData(name);
  const pokemon = createPokemonInstance({
    species: name,
    level,
    baseStats: data.baseStats,
    types: data.types,
    // ... user provides moves, nature, etc.
  });
  setCustomTeam([...customTeam, pokemon]);
}
```

### 5. Enhancing the Search Algorithm

**File**: `src/engine/lineFinder.ts`

**Adaptive Beam Width**:

```typescript
function getAdaptiveBeamWidth(depth: number, stateComplexity: number): number {
  // Wider beam early, narrow as search deepens
  if (depth < 3) return 5;
  if (depth < 7) return 3;
  return 2;
}

// In searchLines()
const beamWidth = getAdaptiveBeamWidth(
  searchState.depth,
  possibleActions.length,
);
const topActions = scoredActions.slice(0, beamWidth);
```

**Parallel Search** (requires worker threads):

```typescript
// src/engine/workers/searchWorker.ts
import { findLines } from "../lineFinder";

self.onmessage = (e) => {
  const { playerTeam, opponentTeam, options } = e.data;
  const lines = findLines(playerTeam, opponentTeam, options);
  self.postMessage(lines);
};

// In App.tsx
const worker = new Worker("/src/engine/workers/searchWorker.ts");
worker.postMessage({ playerTeam, opponentTeam, options });
worker.onmessage = (e) => {
  setLines(e.data);
};
```

**Better Heuristics**:

```typescript
function calculateHeuristicScore(
  state: BattleState,
  casualties: number,
  options: SearchOptions,
): number {
  let score = 0;

  // Existing scoring...

  // Add: Positional advantage (faster team)
  const playerSpeed = state.playerTeam
    .filter((p) => p.currentHp > 0)
    .reduce((sum, p) => sum + p.stats.spe, 0);
  const opponentSpeed = state.opponentTeam
    .filter((p) => p.currentHp > 0)
    .reduce((sum, p) => sum + p.stats.spe, 0);
  score += (playerSpeed - opponentSpeed) * 2;

  // Add: Type matchup advantage
  const matchupScore = calculateTeamMatchupScore(
    state.playerTeam,
    state.opponentTeam,
  );
  score += matchupScore * 50;

  return score;
}
```

### 6. Adding Item Usage

**File**: `src/types/index.ts` - Update `ItemAction`

```typescript
export interface ItemAction {
  type: "item";
  itemName: string;
  targetIndex?: number;

  // Add item effect info
  effect: "heal" | "stat-boost" | "status-cure" | "revive";
  value?: number; // e.g., HP restored
}
```

**File**: `src/engine/battle.ts` - Handle item actions

```typescript
function processItemAction(
  action: ItemAction,
  team: PokemonInstance[],
  isPlayer: boolean,
): void {
  const target = team[action.targetIndex ?? 0];

  switch (action.effect) {
    case "heal":
      target.currentHp = Math.min(
        target.stats.hp,
        target.currentHp + (action.value ?? 0),
      );
      break;

    case "stat-boost":
      // E.g., X Attack
      target.statModifiers.atk = Math.min(6, target.statModifiers.atk + 2);
      break;

    case "status-cure":
      target.status = "healthy";
      break;

    // ...
  }
}
```

**UI Integration**:

```typescript
// Add to generatePlayerActions() in lineFinder.ts
const playerItems = [
  { name: "Super Potion", effect: "heal", value: 60 },
  { name: "X Attack", effect: "stat-boost", stat: "atk" },
];

if (options.allowItems) {
  playerItems.forEach((item) => {
    actions.push({
      type: "item",
      itemName: item.name,
      effect: item.effect,
      value: item.value,
    });
  });
}
```

### 7. Pre-Damage Scenarios

**File**: `src/types/index.ts` - Add to `SearchOptions`

```typescript
export interface SearchOptions {
  // ... existing options

  preDamageScenario?: {
    opponentDamage: Map<string, number>; // species -> HP damage
    playerDamage: Map<string, number>;
    fieldEffects?: Partial<BattleState["playerHazards"]>;
  };
}
```

**File**: `src/engine/lineFinder.ts` - Apply pre-damage

```typescript
export function findLines(
  playerTeam: PokemonInstance[],
  opponentTeam: PokemonInstance[],
  options: SearchOptions = DEFAULT_SEARCH_OPTIONS,
): LineOfPlay[] {
  // Apply pre-damage if specified
  if (options.preDamageScenario) {
    playerTeam = playerTeam.map((p) => ({
      ...p,
      currentHp: Math.max(
        0,
        p.currentHp -
          (options.preDamageScenario!.playerDamage.get(p.species) ?? 0),
      ),
    }));

    opponentTeam = opponentTeam.map((p) => ({
      ...p,
      currentHp: Math.max(
        0,
        p.currentHp -
          (options.preDamageScenario!.opponentDamage.get(p.species) ?? 0),
      ),
    }));
  }

  const initialState = createBattleState(playerTeam, opponentTeam);

  // Apply field effects
  if (options.preDamageScenario?.fieldEffects) {
    Object.assign(
      initialState.opponentHazards,
      options.preDamageScenario.fieldEffects,
    );
  }

  // Continue with normal search...
}
```

### 8. UI Improvements

**Component Structure**:

```typescript
// src/components/
├── TeamBuilder/
│   ├── PokemonSelector.tsx
│   ├── MoveEditor.tsx
│   └── TeamImporter.tsx
├── BattleSetup/
│   ├── TrainerSelector.tsx
│   ├── FieldConditions.tsx
│   └── OptionsPanel.tsx
├── Results/
│   ├── LineList.tsx
│   ├── LineDetails.tsx
│   └── RiskVisualization.tsx
└── Common/
    ├── PokemonCard.tsx
    ├── MoveDisplay.tsx
    └── DamageCalculator.tsx
```

**Example: Team Builder Component**:

```typescript
// src/components/TeamBuilder/PokemonSelector.tsx
import React, { useState } from 'react';
import { PokemonInstance } from '../../types';
import { getCachedPokemonData } from '../../data/pokemon';

export function PokemonSelector({
  onPokemonAdded
}: {
  onPokemonAdded: (pokemon: PokemonInstance) => void;
}) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState(50);

  const handleAdd = async () => {
    const data = await getCachedPokemonData(search);
    // Show move selector, nature selector, etc.
    // Then call onPokemonAdded(completePokemon)
  };

  return (
    <div className="pokemon-selector">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pokemon name..."
      />
      <input
        type="number"
        value={level}
        onChange={(e) => setLevel(parseInt(e.target.value))}
        min="1"
        max="100"
      />
      <button onClick={handleAdd}>Add to Team</button>
    </div>
  );
}
```

## 🔍 Debugging Tips

### Logging Search Progress

```typescript
// In lineFinder.ts searchLines()
if (process.env.NODE_ENV === "development") {
  console.log(`Depth ${searchState.depth}:`, {
    actions: possibleActions.length,
    topScores: topActions.map((a) => a.score),
    casualties: searchState.playerCasualties,
  });
}
```

### Visualizing the Search Tree

Create a debug mode that outputs dot graph:

```typescript
let dotGraph = 'digraph SearchTree {\n';

function searchLines(..., parentId?: string) {
  const nodeId = `node_${searchState.depth}_${Math.random()}`;

  if (parentId) {
    dotGraph += `  ${parentId} -> ${nodeId};\n`;
  }

  // ... search logic

  searchLines(..., nodeId);  // Pass nodeId as parent
}

// After search completes:
console.log(dotGraph + '}');
// Paste into https://dreampuf.github.io/GraphvizOnline/
```

### Damage Calculation Validation

Compare against reference calculator:

```typescript
import { calculateDamage } from '@smogon/calc';  // If available

function validateDamage(move, attacker, defender, battleState) {
  const ourResult = calculateFullDamage(...);
  const smogonResult = calculateDamage(...);

  if (Math.abs(ourResult.min - smogonResult.min) > 2) {
    console.warn('Damage mismatch:', { ourResult, smogonResult });
  }
}
```

## 📊 Performance Optimization

### Memoization

```typescript
import { useMemo } from "react";

// In App.tsx
const memoizedLines = useMemo(
  () => findLines(playerTeam, opponentTeam, options),
  [playerTeam, opponentTeam, options], // Only recompute when these change
);
```

### State Comparison Optimization

```typescript
// Current: JSON.stringify() is slow
const stateSignature = JSON.stringify({...});

// Better: Hash function
import { hash } from 'fast-hash';

const stateSignature = hash({
  playerHP: searchState.battleState.playerActive.currentHp,
  opponentHP: searchState.battleState.opponentActive.currentHp,
  // Only essential fields
});
```

### Pruning Aggressiveness

```typescript
// Add option to control pruning
export interface SearchOptions {
  // ... existing
  pruningAggressiveness: "conservative" | "balanced" | "aggressive";
}

// Adjust beam width based on aggressiveness
function getBeamWidth(aggressiveness: string): number {
  switch (aggressiveness) {
    case "conservative":
      return 5;
    case "balanced":
      return 3;
    case "aggressive":
      return 1;
  }
}
```

## 🧪 Testing Strategy

### Unit Tests

```typescript
// __tests__/engine/damage.test.ts
import { calculateDamage } from '../src/engine/damage';
import { createTestPokemon, createMove } from '../src/utils/testData';

describe('Damage Calculator', () => {
  it('calculates STAB correctly', () => {
    const charizard = createTestPokemon(...);
    const venusaur = createTestPokemon(...);
    const flamethrower = createMove('Flamethrower', 'Fire', 'special', 90);

    const damage = calculateDamage(
      flamethrower,
      charizard,
      venusaur,
      mockBattleState
    );

    // Charizard is Fire type, should get STAB
    expect(damage).toBeGreaterThan(baseDamage * 1.5);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/battle.test.ts
import { simulateTurn } from '../src/engine/battle';

describe('Battle Simulation', () => {
  it('applies hazard damage on switch', () => {
    const state = createBattleStateWithStealth Rock();
    const switchAction = { type: 'switch', targetIndex: 1 };

    const result = simulateTurn(switchAction, state);

    expect(result.resultingState.playerActive.currentHp).toBeLessThan(
      result.resultingState.playerActive.stats.hp
    );
  });
});
```

## 🚀 Deployment

### Build Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          engine: ['./src/engine/damage.ts', './src/engine/ai.ts', ...],
          react: ['react', 'react-dom']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### Environment Variables

```typescript
// .env
VITE_API_BASE_URL=https://pokeapi.co/api/v2
VITE_RUN_BUN_DATA_URL=https://may8th1995.github.io/RBDex

// In src/config.ts
export const CONFIG = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  runBunDataUrl: import.meta.env.VITE_RUN_BUN_DATA_URL
};
```

---

## Summary

The architecture is designed for:

- **Modularity**: Each component has clear responsibilities
- **Testability**: Pure functions where possible
- **Extensibility**: Clear extension points for new features
- **Type Safety**: Comprehensive TypeScript types
- **Performance**: Optimizable search with configurable parameters

Start with small extensions and test thoroughly before moving to larger features!
