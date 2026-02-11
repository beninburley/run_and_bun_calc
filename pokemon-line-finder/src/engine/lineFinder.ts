/**
 * Line-finding algorithm
 * Uses heuristic-guided search with pruning to find viable battle strategies
 */

import {
  BattleState,
  PokemonInstance,
  LineOfPlay,
  SearchOptions,
  SearchState,
  TurnOutcome,
  BattleAction,
  Risk,
  Move,
} from "../types";

import {
  simulateTurn,
  isBattleOver,
  cloneBattleState,
  createBattleState,
} from "./battle";

import { calculateAIDecision } from "./ai";

import { calculateFullDamage, getEffectiveStat } from "./damage";

import { getItem, getItemStatMultiplier } from "../data/items";
import { getWeatherSpeedMultiplier } from "../data/weather";
import { getTerrainSpeedMultiplier } from "../data/terrain";

/**
 * Default search options for MVP
 */
export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  maxDepth: 20, // Maximum 20 turns
  maxLines: 10, // Return top 10 lines

  // RNG mode
  searchMode: "worst-case",

  // Risk tolerance (Nuzlocke-safe by default)
  allowDeaths: false,
  maxDeaths: 0,
  allowCritDependence: false,
  allowAccuracyDependence: false, // Moves < 100% accuracy
  minSuccessProbability: 95, // Require 95%+ success chance

  // Optimization
  prioritize: "safety",

  // MVP constraints
  allowItems: false,
  allowPreDamage: false,
  allowPPStall: false,
};

interface MoveBranchOverride {
  hit?: boolean;
  crit?: boolean;
  damageRoll?: number;
  secondaryApplies?: boolean;
}

interface BranchOutcome {
  outcome: TurnOutcome;
  probability: number;
}

const MAX_PROBABILISTIC_BRANCHES = 24;

function getStatusSpeedMultiplier(status: PokemonInstance["status"]): number {
  if (status === "paralysis") {
    return 0.5;
  }
  return 1;
}

function getSpeedValue(
  pokemon: PokemonInstance,
  battleState: BattleState,
): number {
  return Math.floor(
    getEffectiveStat(pokemon.stats.spe, pokemon.statModifiers.spe) *
      getItemStatMultiplier(getItem(pokemon.item), "spe") *
      getWeatherSpeedMultiplier(pokemon, battleState.weather) *
      getTerrainSpeedMultiplier(pokemon, battleState.terrain) *
      getStatusSpeedMultiplier(pokemon.status),
  );
}

function createMoveBranches(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  battleState: BattleState,
): Array<{ override: MoveBranchOverride; probability: number }> {
  const damageCalc = calculateFullDamage(move, attacker, defender, battleState);
  const accuracy = Math.max(0, Math.min(100, damageCalc.accuracy)) / 100;
  const critChance = Math.max(0, Math.min(100, damageCalc.critChance)) / 100;
  const secondaryChance =
    damageCalc.secondaryEffectChance !== undefined
      ? Math.max(0, Math.min(100, damageCalc.secondaryEffectChance)) / 100
      : 0;
  const koChance =
    damageCalc.damageRange.koChance !== undefined
      ? Math.max(0, Math.min(100, damageCalc.damageRange.koChance)) / 100
      : damageCalc.damageRange.guaranteedKO
        ? 1
        : 0;

  let branches: Array<{ override: MoveBranchOverride; probability: number }> = [
    { override: {}, probability: 1 },
  ];

  if (accuracy < 1) {
    const hitBranch = branches.map((b) => ({
      override: { ...b.override, hit: true },
      probability: b.probability * accuracy,
    }));
    const missBranch = branches.map((b) => ({
      override: { ...b.override, hit: false },
      probability: b.probability * (1 - accuracy),
    }));
    branches = [...hitBranch, ...missBranch];
  }

  if (critChance > 0 && critChance < 1) {
    branches = branches.flatMap((b) => {
      if (b.override.hit === false) {
        return [b];
      }
      return [
        {
          override: { ...b.override, crit: true },
          probability: b.probability * critChance,
        },
        {
          override: { ...b.override, crit: false },
          probability: b.probability * (1 - critChance),
        },
      ];
    });
  }

  if (secondaryChance > 0 && secondaryChance < 1) {
    branches = branches.flatMap((b) => {
      if (b.override.hit === false) {
        return [b];
      }
      return [
        {
          override: { ...b.override, secondaryApplies: true },
          probability: b.probability * secondaryChance,
        },
        {
          override: { ...b.override, secondaryApplies: false },
          probability: b.probability * (1 - secondaryChance),
        },
      ];
    });
  }

  if (koChance > 0 && koChance < 1) {
    branches = branches.flatMap((b) => {
      if (b.override.hit === false) {
        return [b];
      }
      return [
        {
          override: { ...b.override, damageRoll: 100 },
          probability: b.probability * koChance,
        },
        {
          override: { ...b.override, damageRoll: 85 },
          probability: b.probability * (1 - koChance),
        },
      ];
    });
  }

  return branches.filter((b) => b.probability > 0);
}

function createProbabilisticOutcomes(
  action: BattleAction,
  state: BattleState,
): BranchOutcome[] {
  const opponentAction = calculateAIDecision(
    state.opponentActive,
    state.playerActive,
    state.opponentTeam,
    state,
    "random",
  ).action;

  const playerMoveBranches =
    action.type === "move"
      ? createMoveBranches(
          state.playerActive.moves[action.moveIndex],
          state.playerActive,
          state.opponentActive,
          state,
        )
      : [{ override: {}, probability: 1 }];

  const opponentMoveBranches =
    opponentAction.type === "move"
      ? createMoveBranches(
          state.opponentActive.moves[opponentAction.moveIndex],
          state.opponentActive,
          state.playerActive,
          state,
        )
      : [{ override: {}, probability: 1 }];

  const playerSpeed = getSpeedValue(state.playerActive, state);
  const opponentSpeed = getSpeedValue(state.opponentActive, state);
  const speedTieBranches: Array<{
    winner?: "player" | "opponent";
    prob: number;
  }> =
    action.type === "move" &&
    opponentAction.type === "move" &&
    state.playerActive.moves[action.moveIndex].priority ===
      state.opponentActive.moves[opponentAction.moveIndex].priority &&
    playerSpeed === opponentSpeed
      ? [
          { winner: "player", prob: 0.5 },
          { winner: "opponent", prob: 0.5 },
        ]
      : [{ winner: undefined, prob: 1 }];

  const outcomes: BranchOutcome[] = [];

  playerMoveBranches.forEach((playerBranch) => {
    opponentMoveBranches.forEach((opponentBranch) => {
      speedTieBranches.forEach((speedBranch) => {
        const probability =
          playerBranch.probability *
          opponentBranch.probability *
          speedBranch.prob;
        if (probability <= 0) {
          return;
        }

        const outcome = simulateTurn(
          action,
          cloneBattleState(state),
          "random",
          opponentAction,
          {
            speedTieWinner: speedBranch.winner,
            playerMove: playerBranch.override,
            opponentMove: opponentBranch.override,
          },
        );

        outcomes.push({ outcome, probability });
      });
    });
  });

  outcomes.sort((a, b) => b.probability - a.probability);
  return outcomes.slice(0, MAX_PROBABILISTIC_BRANCHES);
}

/**
 * Generate possible player actions for current state
 */
function generatePlayerActions(
  state: BattleState,
  _options: SearchOptions,
): BattleAction[] {
  const actions: BattleAction[] = [];
  const activeMon = state.playerActive;

  if (activeMon.rechargeTurns && activeMon.rechargeTurns > 0) {
    return [{ type: "recharge" }];
  }

  if (activeMon.chargingMove) {
    return [
      {
        type: "move",
        moveIndex: activeMon.chargingMove.moveIndex,
        moveName: activeMon.chargingMove.moveName,
      },
    ];
  }

  // If active Pokemon is fainted, MUST switch (no move actions allowed)
  if (activeMon.currentHp <= 0) {
    const aliveCount = state.playerTeam.filter((p) => p.currentHp > 0).length;
    if (aliveCount > 0) {
      state.playerTeam.forEach((mon, index) => {
        if (mon.currentHp > 0 && mon !== state.playerActive) {
          actions.push({
            type: "switch",
            targetIndex: index,
            targetName: mon.species,
          });
        }
      });
    }
    return actions; // Only switch actions when fainted
  }

  // Move actions (only if Pokemon is alive)
  activeMon.moves.forEach((move, index) => {
    if (activeMon.currentPP[index] > 0) {
      actions.push({
        type: "move",
        moveIndex: index,
        moveName: move.name,
      });
    }
  });

  // Switch actions (only if not the only remaining Pokemon)
  const aliveCount = state.playerTeam.filter((p) => p.currentHp > 0).length;
  if (aliveCount > 1) {
    state.playerTeam.forEach((mon, index) => {
      // Can switch to any alive mon that isn't currently active
      if (mon.currentHp > 0 && mon !== state.playerActive) {
        actions.push({
          type: "switch",
          targetIndex: index,
          targetName: mon.species,
        });
      }
    });
  }

  // TODO: Item actions if allowed

  return actions;
}

/**
 * Evaluate a line's risk level
 */
function evaluateLineRisk(
  turns: TurnOutcome[],
  options: SearchOptions,
  initialState: BattleState,
  lineProbability: number,
): {
  overallRisk: LineOfPlay["overallRisk"];
  guaranteedSuccess: boolean;
  successProbability: number;
  requiresCrits: boolean;
  requiresHits: boolean;
  requiresSecondaryEffects: boolean;
  rngAssessment: LineOfPlay["rngAssessment"];
  rngAssessmentLabel: string;
  rngAssessmentNotes: string[];
} {
  const worstCaseVictory = checkWorstCaseVictory(initialState, turns);
  const allRisks = turns.flatMap((t) => t.risksInvolved);

  // Check for specific dependencies
  const requiresCrits = allRisks.some(
    (r) => r.type === "crit" && r.impact === "severe",
  );
  const requiresHits = allRisks.some(
    (r) => r.type === "accuracy" && r.impact !== "minor",
  );
  const requiresSecondaryEffects = allRisks.some(
    (r) => r.type === "secondary-effect",
  );

  // Calculate success probability (simplified)
  // In reality, this would need to account for independent vs dependent probabilities
  let successProbability = 100;

  for (const risk of allRisks) {
    if (risk.impact === "catastrophic" || risk.impact === "severe") {
      // Multiply probabilities (simplified)
      successProbability *= 1 - risk.probability / 100;
    }
  }

  const guaranteedSuccess = worstCaseVictory;
  if (options.searchMode === "probabilistic") {
    successProbability = Math.max(0, Math.min(100, lineProbability * 100));
  }
  const rngAssessment: LineOfPlay["rngAssessment"] = guaranteedSuccess
    ? "guaranteed"
    : "fails-worst-case";
  const rngAssessmentLabel = guaranteedSuccess
    ? "Guaranteed under worst-case RNG"
    : "Requires favorable rolls";
  const rngAssessmentNotes: string[] = guaranteedSuccess
    ? []
    : ["Fails under worst-case RNG"];

  // Determine overall risk level
  let overallRisk: LineOfPlay["overallRisk"] = "none";

  if (!guaranteedSuccess) {
    allRisks.reduce(
      (max, r) => {
        const impacts = ["minor", "moderate", "severe", "catastrophic"];
        const currentLevel = impacts.indexOf(r.impact);
        const maxLevel = impacts.indexOf(max);
        return currentLevel > maxLevel ? r.impact : max;
      },
      "minor" as Risk["impact"],
    );

    if (successProbability >= 95) {
      overallRisk = "low";
    } else if (successProbability >= 80) {
      overallRisk = "medium";
    } else if (successProbability >= 50) {
      overallRisk = "high";
    } else {
      overallRisk = "extreme";
    }
  }

  return {
    overallRisk,
    guaranteedSuccess,
    successProbability: guaranteedSuccess ? 100 : successProbability,
    requiresCrits,
    requiresHits,
    requiresSecondaryEffects,
    rngAssessment,
    rngAssessmentLabel,
    rngAssessmentNotes,
  };
}

function checkWorstCaseVictory(
  initialState: BattleState,
  turns: TurnOutcome[],
): boolean {
  let state = cloneBattleState(initialState);

  for (const turn of turns) {
    const outcome = simulateTurn(
      turn.playerAction,
      state,
      "worst-case",
      turn.opponentAction,
    );
    state = outcome.resultingState;

    const battleStatus = isBattleOver(state);
    if (battleStatus.isOver) {
      return battleStatus.winner === "player";
    }
  }

  const battleStatus = isBattleOver(state);
  return battleStatus.isOver && battleStatus.winner === "player";
}

/**
 * Check if a line should be pruned
 */
function shouldPrune(
  searchState: SearchState,
  options: SearchOptions,
): { prune: boolean; reason?: string } {
  // Depth limit
  if (searchState.depth >= options.maxDepth) {
    return { prune: true, reason: "Max depth reached" };
  }

  // Deaths limit
  if (searchState.playerCasualties > options.maxDeaths) {
    return { prune: true, reason: "Too many casualties" };
  }

  if (!options.allowDeaths && searchState.playerCasualties > 0) {
    return { prune: true, reason: "Deaths not allowed" };
  }

  // Check if player team is wiped
  const playerAlive = searchState.battleState.playerTeam.filter(
    (p) => p.currentHp > 0,
  ).length;
  if (playerAlive === 0) {
    return { prune: true, reason: "Player team defeated" };
  }

  // Risk threshold
  if (searchState.totalRisk > 100 - options.minSuccessProbability) {
    return { prune: true, reason: "Risk too high" };
  }

  return { prune: false };
}

/**
 * Heuristic score for prioritizing search paths
 * Higher score = more promising
 */
function calculateHeuristicScore(
  state: BattleState,
  casualties: number,
  options: SearchOptions,
): number {
  let score = 0;

  // Opponent Pokemon defeated (highly valuable)
  const opponentDefeated = state.opponentTeam.filter(
    (p) => p.currentHp === 0,
  ).length;
  score += opponentDefeated * 1000;

  // Opponent active HP (lower is better)
  const opponentHPPercent =
    (state.opponentActive.currentHp / state.opponentActive.stats.hp) * 100;
  score += (100 - opponentHPPercent) * 10;

  // Player casualties (negative)
  score -= casualties * 500;

  // Player active HP (higher is better)
  const playerHPPercent =
    (state.playerActive.currentHp / state.playerActive.stats.hp) * 100;
  score += playerHPPercent * 5;

  // Alive team members (higher is better)
  const playerAlive = state.playerTeam.filter((p) => p.currentHp > 0).length;
  score += playerAlive * 100;

  // Prioritization adjustments
  if (options.prioritize === "speed") {
    score += (20 - state.turn) * 50; // Favor shorter battles
  }

  return score;
}

/**
 * Recursive search for viable lines
 */
function searchLines(
  searchState: SearchState,
  options: SearchOptions,
  foundLines: LineOfPlay[],
  visitedStates: Set<string>,
  debugMode: boolean = false,
  initialState: BattleState,
): void {
  // Debug logging
  if (debugMode) {
    console.log(
      `[Search] Depth ${searchState.depth}, Casualties: ${searchState.playerCasualties}`,
    );
    console.log(
      `  Player: ${searchState.battleState.playerActive.species} (${searchState.battleState.playerActive.currentHp}/${searchState.battleState.playerActive.stats.hp} HP)`,
    );
    console.log(
      `  Opponent: ${searchState.battleState.opponentActive.species} (${searchState.battleState.opponentActive.currentHp}/${searchState.battleState.opponentActive.stats.hp} HP)`,
    );
  }

  // Check pruning conditions
  const pruneCheck = shouldPrune(searchState, options);
  if (pruneCheck.prune) {
    if (debugMode) {
      console.log(`  [PRUNED] ${pruneCheck.reason}`);
    }
    return;
  }

  // Check if battle is over
  const battleStatus = isBattleOver(searchState.battleState);
  if (debugMode) {
    console.log(
      `  Battle over: ${battleStatus.isOver}, Winner: ${battleStatus.winner}`,
    );
  }
  if (battleStatus.isOver) {
    if (battleStatus.winner === "player") {
      if (debugMode) {
        console.log(
          `  [VICTORY FOUND] Player wins in ${searchState.depth} turns!`,
        );
      }
      // Found a winning line!
      const lineRisk = evaluateLineRisk(
        searchState.actionsThisLine,
        options,
        initialState,
        searchState.probability,
      );

      // Filter based on risk preferences
      if (!options.allowCritDependence && lineRisk.requiresCrits) {
        if (debugMode) {
          console.log(`  [FILTERED] Requires crits`);
        }
        return;
      }
      if (!options.allowAccuracyDependence && lineRisk.requiresHits) {
        if (debugMode) {
          console.log(`  [FILTERED] Requires accuracy hits`);
        }
        return;
      }
      if (lineRisk.successProbability < options.minSuccessProbability) {
        if (debugMode) {
          console.log(
            `  [FILTERED] Success probability ${lineRisk.successProbability}% < ${options.minSuccessProbability}%`,
          );
        }
        return;
      }

      const casualties = searchState.battleState.playerTeam
        .filter((p) => p.currentHp === 0)
        .map((p) => p.species);

      const opponentCasualties = searchState.battleState.opponentTeam
        .filter((p) => p.currentHp === 0)
        .map((p) => p.species);

      const explanation = searchState.actionsThisLine.map((turn, i) => {
        const playerActionDesc =
          turn.playerAction.type === "move"
            ? `Use ${turn.playerAction.moveName}`
            : turn.playerAction.type === "switch"
              ? `Switch to ${turn.playerAction.targetName}`
              : turn.playerAction.type === "recharge"
                ? "Recharge"
                : "Use item";

        const opponentActionDesc =
          turn.opponentAction.type === "move"
            ? `Opponent uses ${turn.opponentAction.moveName}`
            : turn.opponentAction.type === "switch"
              ? `Opponent switches to ${turn.opponentAction.targetName}`
              : turn.opponentAction.type === "recharge"
                ? "Opponent recharges"
                : "Opponent uses item";

        const firstAction =
          turn.firstMover === "player" ? playerActionDesc : opponentActionDesc;
        const secondAction =
          turn.firstMover === "player" ? opponentActionDesc : playerActionDesc;

        return `Turn ${i + 1}: ${firstAction}, then ${secondAction}`;
      });

      const line: LineOfPlay = {
        id: `line_${Date.now()}_${Math.random()}`,
        turns: searchState.actionsThisLine,
        victory: true,
        playerCasualties: casualties,
        opponentCasualties: opponentCasualties,
        ...lineRisk,
        keyRisks: searchState.actionsThisLine
          .flatMap((t) => t.risksInvolved)
          .filter((r) => r.impact === "severe" || r.impact === "catastrophic"),
        explanation,
      };

      foundLines.push(line);
    }
    return;
  }

  // Generate and evaluate possible actions
  const possibleActions = generatePlayerActions(
    searchState.battleState,
    options,
  );

  if (debugMode) {
    console.log(
      `  [Actions] Generated ${possibleActions.length} possible actions`,
    );
    if (possibleActions.length === 0) {
      console.log(
        `  [ERROR] No actions generated! Active mon: ${searchState.battleState.playerActive.species}`,
      );
      console.log(
        `    Moves:`,
        searchState.battleState.playerActive.moves.map(
          (m, i) =>
            `${m.name} (PP: ${searchState.battleState.playerActive.currentPP[i]})`,
        ),
      );
      console.log(
        `    Alive count: ${searchState.battleState.playerTeam.filter((p) => p.currentHp > 0).length}`,
      );
    } else {
      possibleActions.forEach((action) => {
        if (action.type === "move") {
          console.log(
            `    - ${action.moveName} (PP: ${searchState.battleState.playerActive.currentPP[action.moveIndex]})`,
          );
        } else if (action.type === "switch") {
          console.log(`    - Switch to ${action.targetName}`);
        } else if (action.type === "recharge") {
          console.log("    - Recharge");
        }
      });
    }
  }

  // Create state signature for deduplication
  const stateSignature = JSON.stringify({
    playerHP: searchState.battleState.playerActive.currentHp,
    opponentHP: searchState.battleState.opponentActive.currentHp,
    turn: searchState.battleState.turn,
    playerActive: searchState.battleState.playerActive.species,
    opponentActive: searchState.battleState.opponentActive.species,
  });

  if (visitedStates.has(stateSignature)) {
    if (debugMode) {
      console.log(`  [DUPLICATE STATE] Already visited this state`);
    }
    return; // Already explored this state
  }
  visitedStates.add(stateSignature);

  // Score and sort actions by heuristic
  const rngMode = options.searchMode === "worst-case" ? "worst-case" : "random";

  const scoredActions = possibleActions.map((action) => {
    const simState = cloneBattleState(searchState.battleState);
    const outcome = simulateTurn(action, simState, rngMode);
    const score = calculateHeuristicScore(
      outcome.resultingState,
      searchState.playerCasualties + (outcome.playerFainted ? 1 : 0),
      options,
    );

    return { action, outcome, score };
  });

  // Sort by score (descending)
  scoredActions.sort((a, b) => b.score - a.score);

  // Explore top actions (beam search width - take top 3)
  const beamWidth = 3;
  const topActions = scoredActions.slice(0, beamWidth);

  if (debugMode && topActions.length > 0) {
    console.log(`  [Beam] Exploring top ${topActions.length} actions:`);
    topActions.forEach(({ action, score }) => {
      const desc =
        action.type === "move"
          ? action.moveName
          : action.type === "switch"
            ? `Switch to ${action.targetName}`
            : "Use item";
      console.log(`    - ${desc} (score: ${score.toFixed(2)})`);
    });
  }

  for (const { outcome, action } of topActions) {
    // Stop if we've found enough lines
    if (foundLines.length >= options.maxLines) {
      return;
    }

    if (options.searchMode === "probabilistic") {
      const probabilisticOutcomes = createProbabilisticOutcomes(
        action,
        searchState.battleState,
      );

      for (const branch of probabilisticOutcomes) {
        if (foundLines.length >= options.maxLines) {
          return;
        }

        const newCasualties =
          searchState.playerCasualties + (branch.outcome.playerFainted ? 1 : 0);
        const newSearchState: SearchState = {
          battleState: branch.outcome.resultingState,
          depth: searchState.depth + 1,
          actionsThisLine: [...searchState.actionsThisLine, branch.outcome],
          totalRisk: searchState.totalRisk,
          playerCasualties: newCasualties,
          probability: searchState.probability * branch.probability,
        };

        searchLines(
          newSearchState,
          options,
          foundLines,
          visitedStates,
          debugMode,
          initialState,
        );
      }
    } else {
      const newCasualties =
        searchState.playerCasualties + (outcome.playerFainted ? 1 : 0);

      const newSearchState: SearchState = {
        battleState: outcome.resultingState,
        depth: searchState.depth + 1,
        actionsThisLine: [...searchState.actionsThisLine, outcome],
        totalRisk: searchState.totalRisk, // TODO: Accumulate risk properly
        playerCasualties: newCasualties,
        probability: searchState.probability,
      };

      searchLines(
        newSearchState,
        options,
        foundLines,
        visitedStates,
        debugMode,
        initialState,
      );
    }
  }
}

/**
 * Find viable lines of play
 */
export function findLines(
  playerTeam: PokemonInstance[],
  opponentTeam: PokemonInstance[],
  options: SearchOptions = DEFAULT_SEARCH_OPTIONS,
  debugMode: boolean = false,
): LineOfPlay[] {
  const initialState = createBattleState(playerTeam, opponentTeam);

  const searchState: SearchState = {
    battleState: initialState,
    depth: 0,
    actionsThisLine: [],
    totalRisk: 0,
    playerCasualties: 0,
    probability: 1,
  };

  const foundLines: LineOfPlay[] = [];
  const visitedStates = new Set<string>();

  if (debugMode) {
    console.log("\n[Line Finder] Starting line search...");
    console.log(`Player team: ${playerTeam.map((p) => p.species).join(", ")}`);
    console.log(
      `Opponent team: ${opponentTeam.map((p) => p.species).join(", ")}`,
    );
    console.log("Search options:", options);
  }

  searchLines(
    searchState,
    options,
    foundLines,
    visitedStates,
    debugMode,
    initialState,
  );

  if (debugMode) {
    console.log(`Found ${foundLines.length} viable lines`);
  }

  // Sort lines by risk and casualties
  foundLines.sort((a, b) => {
    // Prioritize guaranteed success
    if (a.guaranteedSuccess && !b.guaranteedSuccess) return -1;
    if (!a.guaranteedSuccess && b.guaranteedSuccess) return 1;

    // Then by casualties
    if (a.playerCasualties.length !== b.playerCasualties.length) {
      return a.playerCasualties.length - b.playerCasualties.length;
    }

    // Then by success probability
    if (a.successProbability !== b.successProbability) {
      return b.successProbability - a.successProbability;
    }

    // Then by length (shorter is better)
    return a.turns.length - b.turns.length;
  });

  return foundLines;
}
