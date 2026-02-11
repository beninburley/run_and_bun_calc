import { createBattleState, simulateTurn } from "../engine/battle";
import { LineOfPlay, TurnOutcome } from "../types";
import { createMove, createTestPokemon } from "./testData";
import {
  getLineFinalState,
  getHazardSummary,
  getFieldEffectSummary,
  getStatusSummary,
} from "./lineSummary";

interface TestResult {
  name: string;
  passed: boolean;
  output: string;
}

function buildTestLine(outcome: TurnOutcome): LineOfPlay {
  return {
    id: "line_summary_test",
    turns: [outcome],
    victory: false,
    playerCasualties: [],
    opponentCasualties: [],
    overallRisk: "none",
    guaranteedSuccess: true,
    successProbability: 100,
    rngAssessment: "guaranteed",
    rngAssessmentLabel: "Guaranteed",
    rngAssessmentNotes: [],
    requiresCrits: false,
    requiresHits: false,
    requiresSecondaryEffects: false,
    keyRisks: [],
    explanation: ["Test"],
  };
}

function testLineSummaryFromBattleState(): TestResult {
  const splash = createMove("Splash", "Normal", "status", 0);
  const player = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [splash],
  );
  const opponent = createTestPokemon(
    "Magikarp",
    50,
    { hp: 20, atk: 10, def: 55, spa: 15, spd: 20, spe: 80 },
    ["Water"],
    [splash],
  );

  player.status = "burn";
  opponent.status = "poison";

  const state = createBattleState([player], [opponent]);
  state.weather = "rain";
  state.weatherTurns = 3;
  state.terrain = "grassy";
  state.terrainTurns = 2;
  state.trickRoom = 4;
  state.tailwind.player = 2;
  state.playerScreens.reflect = 3;
  state.opponentScreens.lightScreen = 1;
  state.playerHazards.spikes = 2;
  state.playerHazards.stealthRock = true;
  state.opponentHazards.toxicSpikes = 1;

  const outcome = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Splash" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Splash" },
  );

  const line = buildTestLine(outcome);
  const finalState = getLineFinalState(line);
  if (!finalState) {
    return {
      name: "Line summary final state",
      passed: false,
      output: "No final state returned",
    };
  }

  const playerHazards = getHazardSummary(finalState, "player");
  const opponentHazards = getHazardSummary(finalState, "opponent");
  const field = getFieldEffectSummary(finalState);
  const status = getStatusSummary(finalState);

  const passed =
    playerHazards.includes("Stealth Rock") &&
    playerHazards.includes("Spikes x2") &&
    opponentHazards.includes("Toxic Spikes x1") &&
    field.global.some((effect) => effect.includes("Weather: Rain")) &&
    field.global.some((effect) => effect.includes("Terrain: Grassy")) &&
    field.global.some((effect) => effect.includes("Trick Room")) &&
    field.playerSide.some((effect) => effect.includes("Tailwind")) &&
    field.playerSide.some((effect) => effect.includes("Reflect")) &&
    status.playerStatus === "Burn" &&
    status.opponentStatus === "Poison";

  return {
    name: "Line summary from battle state",
    passed,
    output: `Player hazards=${playerHazards.join(", ")}, Opponent hazards=${opponentHazards.join(", ")}, Player status=${status.playerStatus}, Opponent status=${status.opponentStatus}`,
  };
}

export function runLineSummaryTests(): {
  totalTests: number;
  passedTests: number;
  results: TestResult[];
} {
  const tests: Array<() => TestResult> = [testLineSummaryFromBattleState];

  const results = tests.map((fn) => fn());
  const passedTests = results.filter((r) => r.passed).length;

  results.forEach((result) => {
    if (!result.passed) {
      console.log(`Line summary test failed: ${result.name}`);
      console.log(`  ${result.output}`);
    }
  });

  return {
    totalTests: results.length,
    passedTests,
    results,
  };
}
