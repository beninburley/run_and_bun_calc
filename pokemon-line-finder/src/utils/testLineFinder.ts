/**
 * Test suite for line-finder validation
 * Run this to ensure the line-finder produces expected results
 */

// Type declaration for Node.js process (used when running tests via tsx)
declare const process: {
  exit: (code: number) => never;
  env?: Record<string, string | undefined>;
  argv?: string[];
};

import { findLines, DEFAULT_SEARCH_OPTIONS } from "../engine/lineFinder";
import {
  createMove,
  createTestPokemon,
  getMockBattle1,
  getMockBattle2,
} from "./testData";
import { LineOfPlay, PokemonInstance, SearchOptions } from "../types";
import { calculateDamageRange } from "../engine/damage";
import { calculateAIDecision } from "../engine/ai";
import { createBattleState } from "../engine/battle";
import { runHazardTests } from "./testHazards";
import { runBattleMechanicsTests } from "./testBattleMechanics";
import { runDataLayerTests } from "./testDataLayer";
import { runLineSummaryTests } from "./testLineSummary";
import { runIntegrationTests } from "./testIntegration";

interface TestCase {
  name: string;
  setup: () => { playerTeam: any[]; opponentTeam: any[] };
  options?: Partial<SearchOptions>;
  expectedBehavior: {
    shouldFindLines: boolean;
    minLines?: number;
    maxLines?: number;
    shouldContainGuaranteedWin?: boolean;
    expectedFirstMove?: string;
    expectedTurnsRange?: [number, number]; // [min, max]
    expectedRngAssessment?: LineOfPlay["rngAssessment"];
    maxSuccessProbability?: number;
  };
}

const TEST_CASES: TestCase[] = [
  {
    name: "Simple 1v1 - Type Advantage (Charizard vs Venusaur)",
    setup: getMockBattle1,
    expectedBehavior: {
      shouldFindLines: true,
      minLines: 1,
      shouldContainGuaranteedWin: true,
      expectedFirstMove: "Air Slash", // Safest line sets up Blaze-boosted Flamethrower
      expectedTurnsRange: [1, 3], // Should be quick with type advantage
    },
  },
  {
    name: "Complex 2v2 - Mixed Matchups",
    setup: getMockBattle2,
    expectedBehavior: {
      shouldFindLines: false,
    },
  },
  {
    name: "Probabilistic mode - RNG required",
    setup: () => {
      const shakyStrike = createMove(
        "Shaky Strike",
        "Normal",
        "physical",
        80,
        80,
      );
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
    },
    options: {
      searchMode: "probabilistic",
      minSuccessProbability: 0,
      allowAccuracyDependence: true,
    },
    expectedBehavior: {
      shouldFindLines: true,
      minLines: 1,
      expectedRngAssessment: "fails-worst-case",
      maxSuccessProbability: 99.9,
    },
  },
];

function isVerboseMode(): boolean {
  if (typeof process === "undefined") {
    return false;
  }

  const envFlag = process.env?.VERBOSE_TESTS;
  if (envFlag && envFlag !== "0") {
    return true;
  }

  return (process.argv || []).some((arg) =>
    ["--verbose", "--debug"].includes(arg),
  );
}

export function runLineFinderTests(): TestResult[] {
  const verbose = isVerboseMode();

  if (verbose) {
    console.log("=== Running Line Finder Tests ===");
  } else {
    console.log("Line Finder Tests");
  }

  const results: TestResult[] = [];

  for (const testCase of TEST_CASES) {
    if (verbose) {
      console.log(`\n📝 Test: ${testCase.name}`);
      console.log("-".repeat(40));
    }

    const result = runSingleTest(testCase);
    results.push(result);

    const guaranteedLines = result.lines.filter(
      (line) => line.guaranteedSuccess && line.victory,
    ).length;

    if (verbose) {
      if (result.passed) {
        console.log("✅ PASSED");
      } else {
        console.log("❌ FAILED");
        result.failures.forEach((failure) => {
          console.log(`   - ${failure}`);
        });
      }
    } else {
      console.log(
        `- ${testCase.name}: ${result.passed ? "PASS" : "FAIL"} | lines ${result.lines.length} | guaranteed ${guaranteedLines} | ${result.executionTime.toFixed(1)}ms`,
      );
      if (!result.passed) {
        result.failures.forEach((failure) => {
          console.log(`  - ${failure}`);
        });
      }
    }
  }

  // Summary
  if (verbose) {
    console.log("\n=== Summary ===");
  } else {
    console.log("\nSummary");
  }
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(
    `Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`,
  );

  if (failed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("⚠️  Some tests failed. Review output above.");
  }

  return results;
}

interface TestResult {
  testName: string;
  passed: boolean;
  failures: string[];
  lines: LineOfPlay[];
  executionTime: number;
}

function runSingleTest(testCase: TestCase): TestResult {
  const failures: string[] = [];
  const startTime = performance.now();
  const verbose = isVerboseMode();

  // Setup
  const { playerTeam, opponentTeam } = testCase.setup();

  // Execute - Enable debug mode for detailed output
  let lines: LineOfPlay[] = [];
  try {
    const mergedOptions: SearchOptions = {
      ...DEFAULT_SEARCH_OPTIONS,
      ...(testCase.options ?? {}),
    };
    lines = findLines(playerTeam, opponentTeam, mergedOptions, verbose);
  } catch (error) {
    failures.push(`Exception thrown: ${error}`);
    return {
      testName: testCase.name,
      passed: false,
      failures,
      lines: [],
      executionTime: performance.now() - startTime,
    };
  }

  const executionTime = performance.now() - startTime;

  if (verbose) {
    console.log(
      `   Found ${lines.length} lines in ${executionTime.toFixed(2)}ms`,
    );
  }

  // Validate expectations
  const exp = testCase.expectedBehavior;

  if (exp.shouldFindLines && lines.length === 0) {
    failures.push("Expected to find lines but got 0");
  }

  if (!exp.shouldFindLines && lines.length > 0) {
    failures.push(`Expected to find no lines but got ${lines.length}`);
  }

  if (exp.minLines !== undefined && lines.length < exp.minLines) {
    failures.push(
      `Expected at least ${exp.minLines} lines but got ${lines.length}`,
    );
  }

  if (exp.maxLines !== undefined && lines.length > exp.maxLines) {
    failures.push(
      `Expected at most ${exp.maxLines} lines but got ${lines.length}`,
    );
  }

  if (lines.length > 0) {
    const bestLine = lines[0];

    if (exp.shouldContainGuaranteedWin) {
      const hasGuaranteed = lines.some(
        (line) => line.guaranteedSuccess && line.victory,
      );
      if (!hasGuaranteed) {
        failures.push("Expected to find at least one guaranteed win line");
      } else {
        if (verbose) {
          console.log("   ✓ Found guaranteed win line");
        }
      }
    }

    if (exp.expectedFirstMove) {
      const firstAction = bestLine.turns[0]?.playerAction;
      if (
        firstAction?.type !== "move" ||
        firstAction.moveName !== exp.expectedFirstMove
      ) {
        const actualMove =
          firstAction?.type === "move" ? firstAction.moveName : "switch";
        failures.push(
          `Expected first move to be ${exp.expectedFirstMove} but got ${actualMove}`,
        );
      } else {
        if (verbose) {
          console.log(`   ✓ First move is ${exp.expectedFirstMove}`);
        }
      }
    }

    if (exp.expectedTurnsRange) {
      const turns = bestLine.turns.length;
      const [min, max] = exp.expectedTurnsRange;
      if (turns < min || turns > max) {
        failures.push(
          `Expected turns in range [${min}, ${max}] but got ${turns}`,
        );
      } else if (verbose) {
        console.log(
          `   ✓ Turn count ${turns} is within expected range [${min}, ${max}]`,
        );
      }
    }

    if (exp.expectedRngAssessment) {
      if (bestLine.rngAssessment !== exp.expectedRngAssessment) {
        failures.push(
          `Expected rngAssessment ${exp.expectedRngAssessment} but got ${bestLine.rngAssessment}`,
        );
      }
    }

    if (exp.maxSuccessProbability !== undefined) {
      if (bestLine.successProbability > exp.maxSuccessProbability) {
        failures.push(
          `Expected successProbability <= ${exp.maxSuccessProbability} but got ${bestLine.successProbability}`,
        );
      }
    }

    if (verbose) {
      console.log(`   Best line (${bestLine.turns.length} turns):`);
      bestLine.turns.forEach((turn, i) => {
        const playerMove =
          turn.playerAction.type === "move"
            ? turn.playerAction.moveName
            : turn.playerAction.type === "switch"
              ? `Switch to ${playerTeam[turn.playerAction.targetIndex!].species}`
              : "Recharge";
        const opponentMove =
          turn.opponentAction.type === "move"
            ? turn.opponentAction.moveName
            : turn.opponentAction.type === "switch"
              ? `Switch to ${opponentTeam[turn.opponentAction.targetIndex!].species}`
              : "Recharge";
        console.log(`     Turn ${i + 1}: ${playerMove} vs ${opponentMove}`);
        if (turn.risksInvolved && turn.risksInvolved.length > 0) {
          console.log(`       Risks in turn ${i + 1}:`);
          turn.risksInvolved.forEach((risk) => {
            console.log(
              `         - ${risk.type}: ${risk.description} (${risk.probability}% prob, ${risk.impact} impact)`,
            );
          });
        }
      });
      console.log(
        `   Risk: ${bestLine.guaranteedSuccess ? "guaranteed" : "probabilistic"} (${bestLine.overallRisk})`,
      );
      console.log(
        `   RequiresCrits: ${bestLine.requiresCrits}, RequiresHits: ${bestLine.requiresHits}`,
      );
      console.log(`   Success Probability: ${bestLine.successProbability}%`);
    }
  }

  return {
    testName: testCase.name,
    passed: failures.length === 0,
    failures,
    lines,
    executionTime,
  };
}

/**
 * Run specific scenario validation
 */
export function validateScenario(
  playerTeam: PokemonInstance[],
  opponentTeam: PokemonInstance[],
  expectedOutcome: "player-wins" | "opponent-wins" | "uncertain",
): boolean {
  const lines = findLines(playerTeam, opponentTeam, DEFAULT_SEARCH_OPTIONS);

  if (lines.length === 0) {
    console.log("⚠️  No lines found");
    return expectedOutcome === "opponent-wins";
  }

  const bestLine = lines[0];
  const playerWon = bestLine.victory;

  if (playerWon) {
    console.log(`✅ Player wins`);
    return expectedOutcome === "player-wins";
  } else {
    console.log("❌ Player loses or uncertain");
    return expectedOutcome !== "player-wins";
  }
}

/**
 * Detailed damage calculation validation
 */
export function validateDamageCalculations(): void {
  const verbose = isVerboseMode();
  if (verbose) {
    console.log("\n=== Validating Damage Calculations ===");
  }

  const { playerTeam, opponentTeam } = getMockBattle1();
  const charizard = playerTeam[0];
  const venusaur = opponentTeam[0];

  const battleState = createBattleState(playerTeam, opponentTeam);
  const flamethrower = charizard.moves.find((m) => m.name === "Flamethrower")!;

  if (verbose) {
    console.log("\n📊 Test: Flamethrower (Fire) on Venusaur (Grass/Poison)");
    console.log(`   Charizard SpA: ${charizard.stats.spa}`);
    console.log(
      `   Venusaur SpD: ${venusaur.stats.spd}, HP: ${venusaur.stats.hp}`,
    );
  }

  // Use calculateDamageRange to get damage details
  const damageRange = calculateDamageRange(
    flamethrower,
    charizard,
    venusaur,
    battleState,
  );

  if (verbose) {
    console.log(`   Damage range: ${damageRange.min} - ${damageRange.max}`);
    console.log(
      `   Damage %: ${damageRange.minPercent.toFixed(1)}% - ${damageRange.maxPercent.toFixed(1)}%`,
    );
    console.log(`   Guaranteed KO: ${damageRange.guaranteedKO ? "Yes" : "No"}`);
    console.log(`   Possible KO: ${damageRange.possibleKO ? "Yes" : "No"}`);
  }

  const minRolls = Math.ceil(venusaur.stats.hp / damageRange.max);
  const maxRolls = Math.ceil(venusaur.stats.hp / damageRange.min);

  if (verbose) {
    console.log(`   Estimated rolls to KO: ${minRolls} - ${maxRolls}`);
  }

  // Validation - Fire is x2 vs Grass, so damage should be significant
  // Charizard has high SpA, Venusaur has decent SpD but weak to Fire
  // Expected: Should OHKO or 2HKO at most
  let passed = true;

  if (maxRolls > 3) {
    if (verbose) {
      console.log(
        `   ❌  Takes too many hits (${maxRolls}), type advantage not working`,
      );
    }
    passed = false;
  }

  if (damageRange.max < venusaur.stats.hp * 0.4) {
    if (verbose) {
      console.log(`   ❌  Damage too low for super-effective STAB move`);
    }
    passed = false;
  }

  if (verbose) {
    if (passed) {
      console.log("   ✅ Damage calculation looks correct");
    }
  } else {
    console.log(`Damage calculations: ${passed ? "OK" : "CHECK"}`);
  }
}

/**
 * Test AI decision logic
 */
export function validateAILogic(): void {
  const verbose = isVerboseMode();
  if (verbose) {
    console.log("\n=== Validating AI Decision Logic ===");
  }

  const { playerTeam, opponentTeam } = getMockBattle1();
  const battleState = createBattleState(playerTeam, opponentTeam);

  if (verbose) {
    console.log("\n🤖 Test: AI should choose highest damage move");
    console.log(`   Opponent: ${battleState.opponentActive.species}`);
    console.log(
      `   Available moves: ${battleState.opponentActive.moves.map((m) => m.name).join(", ")}`,
    );
  }

  const decision = calculateAIDecision(
    battleState.opponentActive,
    battleState.playerActive,
    battleState.opponentTeam,
    battleState,
    "worst-case",
  );

  const actionType = decision.action.type;
  let moveName = "Switch";
  if (actionType === "move") {
    moveName = (decision.action as { type: "move"; moveName: string }).moveName;
  }

  if (verbose) {
    console.log(`   AI chose: ${moveName}`);
    console.log(`   Reasoning: ${decision.chosenScore.reasoning}`);
    console.log(`   Score: ${decision.chosenScore.score}`);
  }

  // AI should choose a damaging move (highest damage according to ai_logic.txt)
  let passed = false;

  if (actionType === "move") {
    const actualMoveName = (
      decision.action as { type: "move"; moveName: string }
    ).moveName;
    const chosenMove = battleState.opponentActive.moves.find(
      (m) => m.name === actualMoveName,
    );
    if (chosenMove && chosenMove.category !== "status") {
      if (verbose) {
        console.log("   ✅ AI chose a damaging move as expected");
      }
      passed = true;
    } else {
      if (verbose) {
        console.log("   ⚠️  AI chose unexpectedly");
      }
    }
  } else {
    if (verbose) {
      console.log("   ⚠️  AI chose to switch");
    }
  }

  if (!verbose) {
    console.log(`AI logic: ${passed ? "OK" : "CHECK"}`);
  }
}

// Export all test functions
export const tests = {
  runLineFinderTests,
  validateScenario,
  validateDamageCalculations,
  validateAILogic,
};

// Run tests when executed directly (Node.js only)
if (typeof process !== "undefined" && process?.argv && process?.exit) {
  const results = runLineFinderTests();
  validateDamageCalculations();
  validateAILogic();
  const hazardResults = runHazardTests();
  const mechanicsResults = runBattleMechanicsTests();
  const dataLayerResults = runDataLayerTests();
  const lineSummaryResults = runLineSummaryTests();
  const integrationResults = runIntegrationTests();

  console.log("\nCondensed Summary");
  console.log(
    `Line Finder: ${results.filter((r) => r.passed).length}/${results.length}`,
  );
  console.log(
    `Mechanics: ${mechanicsResults.passedTests}/${mechanicsResults.totalTests}`,
  );
  console.log(
    `Hazards: ${hazardResults.passedTests}/${hazardResults.totalTests}`,
  );
  console.log(
    `Data Layer: ${dataLayerResults.passedTests}/${dataLayerResults.totalTests}`,
  );
  console.log(
    `Line Summary: ${lineSummaryResults.passedTests}/${lineSummaryResults.totalTests}`,
  );
  console.log(
    `Integration: ${integrationResults.passedTests}/${integrationResults.totalTests}`,
  );

  const failedCount = results.filter((r) => !r.passed).length;
  const failedHazards = hazardResults.totalTests - hazardResults.passedTests;
  const failedMechanics =
    mechanicsResults.totalTests - mechanicsResults.passedTests;
  const failedDataLayer =
    dataLayerResults.totalTests - dataLayerResults.passedTests;
  const failedLineSummary =
    lineSummaryResults.totalTests - lineSummaryResults.passedTests;
  const failedIntegration =
    integrationResults.totalTests - integrationResults.passedTests;

  if (
    failedCount > 0 ||
    failedHazards > 0 ||
    failedMechanics > 0 ||
    failedDataLayer > 0 ||
    failedLineSummary > 0 ||
    failedIntegration > 0
  ) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
