/**
 * Data layer normalization tests
 */

// Type declaration for Node.js process (used when running tests via tsx)
declare const process: {
  env?: Record<string, string | undefined>;
  argv?: string[];
};

import { buildMove, buildPokemon, normalizeMoveData } from "../data/normalize";
import { calculateStats } from "../engine/damage";
import type { MoveData } from "../data/pokeapi";

function isVerboseMode(): boolean {
  const envFlag = process.env?.VERBOSE_TESTS;
  if (envFlag && envFlag !== "0") {
    return true;
  }

  return (process.argv || []).some((arg) =>
    ["--verbose", "--debug"].includes(arg),
  );
}

export function runDataLayerTests(): {
  totalTests: number;
  passedTests: number;
  results: Array<{ name: string; passed: boolean; output: string }>;
} {
  const verbose = isVerboseMode();
  const results: Array<{ name: string; passed: boolean; output: string }> = [];

  const move = buildMove({ name: "Test Move" });
  const movePassed =
    move.type === "Normal" &&
    move.category === "physical" &&
    move.power === 50 &&
    move.accuracy === 100 &&
    move.pp === 10;
  results.push({
    name: "Move defaults",
    passed: movePassed,
    output: `type=${move.type}, power=${move.power}, acc=${move.accuracy}`,
  });

  const baseStats = { hp: 50, atk: 60, def: 70, spa: 80, spd: 90, spe: 100 };
  const pokemon = buildPokemon({
    species: "Testmon",
    level: 50,
    baseStats,
    types: ["Normal"],
    moves: [{ name: "Test Move" }],
    nature: "Hardy",
  });
  const expectedStats = calculateStats(
    baseStats,
    50,
    { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    pokemon.nature,
  );
  const pokemonPassed = pokemon.stats.hp === expectedStats.hp;
  results.push({
    name: "Pokemon stats normalization",
    passed: pokemonPassed,
    output: `hp=${pokemon.stats.hp}, expected=${expectedStats.hp}`,
  });

  const mockMoveData: MoveData = {
    name: "test-move",
    displayName: "Test Move",
    type: "Normal",
    category: "physical",
    power: 40,
    accuracy: 95,
    pp: 15,
    priority: 1,
    description: "",
  };
  const normalized = normalizeMoveData(mockMoveData);
  const normalizedPassed =
    normalized.name === "Test Move" &&
    normalized.power === 40 &&
    normalized.accuracy === 95 &&
    normalized.priority === 1;
  results.push({
    name: "Move data normalization",
    passed: normalizedPassed,
    output: `power=${normalized.power}, acc=${normalized.accuracy}`,
  });

  if (verbose) {
    console.log("=== Data Layer Tests ===");
    results.forEach((result) => {
      console.log(
        `${result.passed ? "✅" : "❌"} ${result.name}: ${result.output}`,
      );
    });
  }

  const passedTests = results.filter((r) => r.passed).length;
  return {
    totalTests: results.length,
    passedTests,
    results,
  };
}
