import { findLines, DEFAULT_SEARCH_OPTIONS } from "../engine/lineFinder";
import { createMove, createTestPokemon } from "./testData";
import { SearchOptions } from "../types";

interface TestResult {
  name: string;
  passed: boolean;
  output: string;
}

function buildShakyStrikeScenario(): {
  playerTeam: ReturnType<typeof createTestPokemon>[];
  opponentTeam: ReturnType<typeof createTestPokemon>[];
} {
  const shakyStrike = createMove("Shaky Strike", "Normal", "physical", 80, 80);
  const splash = createMove("Splash", "Normal", "status", 0);

  const player = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [shakyStrike],
  );
  const opponent = createTestPokemon(
    "Magikarp",
    50,
    { hp: 20, atk: 10, def: 55, spa: 15, spd: 20, spe: 80 },
    ["Water"],
    [splash],
  );

  return { playerTeam: [player], opponentTeam: [opponent] };
}

function testWorstCaseVsProbabilistic(): TestResult {
  const { playerTeam, opponentTeam } = buildShakyStrikeScenario();

  const worstCaseOptions: SearchOptions = {
    ...DEFAULT_SEARCH_OPTIONS,
    maxDepth: 6,
    maxLines: 5,
    searchMode: "worst-case",
  };
  const probOptions: SearchOptions = {
    ...DEFAULT_SEARCH_OPTIONS,
    maxDepth: 6,
    maxLines: 5,
    searchMode: "probabilistic",
    allowAccuracyDependence: true,
    minSuccessProbability: 0,
  };

  const worstCaseLines = findLines(playerTeam, opponentTeam, worstCaseOptions);
  const probLines = findLines(playerTeam, opponentTeam, probOptions);

  const passed = worstCaseLines.length === 0 && probLines.length > 0;

  return {
    name: "Worst-case vs probabilistic",
    passed,
    output: `Worst-case lines=${worstCaseLines.length}, Prob lines=${probLines.length}`,
  };
}

function testMultiTurnIntegration(): TestResult {
  const solarBeam = createMove("Solar Beam", "Grass", "special", 120, 100, 0, {
    multiTurn: { kind: "charge" },
  });
  const splash = createMove("Splash", "Normal", "status", 0);

  const player = createTestPokemon(
    "Sceptile",
    50,
    { hp: 70, atk: 85, def: 65, spa: 105, spd: 85, spe: 120 },
    ["Grass"],
    [solarBeam],
  );
  const opponent = createTestPokemon(
    "Magikarp",
    50,
    { hp: 20, atk: 10, def: 55, spa: 15, spd: 20, spe: 80 },
    ["Water"],
    [splash],
  );

  const options: SearchOptions = {
    ...DEFAULT_SEARCH_OPTIONS,
    maxDepth: 3,
    maxLines: 3,
    searchMode: "worst-case",
  };

  const lines = findLines([player], [opponent], options);
  const bestLine = lines[0];
  const firstMove =
    bestLine?.turns[0]?.playerAction.type === "move"
      ? bestLine.turns[0].playerAction.moveName
      : "";

  const passed = Boolean(bestLine && bestLine.turns.length === 2 && firstMove);

  return {
    name: "Multi-turn line integration",
    passed,
    output: `Lines=${lines.length}, firstMove=${firstMove}, turns=${bestLine?.turns.length ?? 0}`,
  };
}

export function runIntegrationTests(): {
  totalTests: number;
  passedTests: number;
  results: TestResult[];
} {
  const tests: Array<() => TestResult> = [
    testWorstCaseVsProbabilistic,
    testMultiTurnIntegration,
  ];

  const results = tests.map((fn) => fn());
  const passedTests = results.filter((r) => r.passed).length;

  results.forEach((result) => {
    if (!result.passed) {
      console.log(`Integration test failed: ${result.name}`);
      console.log(`  ${result.output}`);
    }
  });

  return {
    totalTests: results.length,
    passedTests,
    results,
  };
}
