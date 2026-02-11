/**
 * Battle mechanics test suite
 * Validates status timing, secondary effects, items, multi-turn moves, and speed ties
 */

// Type declaration for Node.js process (used when running tests via tsx)
declare const process: {
  env?: Record<string, string | undefined>;
  argv?: string[];
};

import { createTestPokemon, createMove } from "./testData";
import { createBattleState, simulateTurn } from "../engine/battle";
import { PokemonInstance } from "../types";

interface TestResult {
  name: string;
  passed: boolean;
  output: string;
}

function isVerboseMode(): boolean {
  const envFlag = process.env?.VERBOSE_TESTS;
  if (envFlag && envFlag !== "0") {
    return true;
  }

  return (process.argv || []).some((arg) =>
    ["--verbose", "--debug"].includes(arg),
  );
}

function basicTeams(
  player: PokemonInstance,
  opponent: PokemonInstance,
): [PokemonInstance[], PokemonInstance[]] {
  return [[player], [opponent]];
}

function testSleepCountdown(): TestResult {
  const tackle = createMove("Tackle", "Normal", "physical", 40);
  const splash = createMove("Splash", "Normal", "status", 0);

  const player = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [tackle],
  );
  const opponent = createTestPokemon(
    "Magikarp",
    50,
    { hp: 20, atk: 10, def: 55, spa: 15, spd: 20, spe: 80 },
    ["Water"],
    [splash],
  );

  player.status = "sleep";
  player.sleepTurnsRemaining = 2;

  let state = createBattleState(...basicTeams(player, opponent));

  const first = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Tackle" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Splash" },
  );
  state = first.resultingState;

  const afterFirst = state.playerActive.sleepTurnsRemaining;
  const didDamageFirst = state.opponentActive.currentHp < opponent.stats.hp;

  const second = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Tackle" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Splash" },
  );

  const wokeUp =
    second.resultingState.playerActive.status === "healthy" &&
    second.resultingState.opponentActive.currentHp < opponent.stats.hp;

  const passed = afterFirst === 1 && !didDamageFirst && wokeUp;
  return {
    name: "Sleep countdown",
    passed,
    output: `After turn1 sleep=${afterFirst}, damage=${didDamageFirst}, woke=${wokeUp}`,
  };
}

function testFreezeThaw(): TestResult {
  const tackle = createMove("Tackle", "Normal", "physical", 40);
  const player = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [tackle],
  );
  const opponent = createTestPokemon(
    "Pidgey",
    50,
    { hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56 },
    ["Normal", "Flying"],
    [tackle],
  );

  player.status = "freeze";

  const originalRandom = Math.random;
  Math.random = () => 0.1; // Force thaw (20% chance)

  const state = createBattleState(...basicTeams(player, opponent));
  const outcome = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Tackle" },
    state,
    "random",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  Math.random = originalRandom;

  const thawed = outcome.resultingState.playerActive.status === "healthy";

  return {
    name: "Freeze thaw",
    passed: thawed,
    output: `Status=${outcome.resultingState.playerActive.status}`,
  };
}

function testFreezeThawOnFireHit(): TestResult {
  const ember = createMove("Ember", "Fire", "special", 40);
  const splash = createMove("Splash", "Normal", "status", 0);

  const player = createTestPokemon(
    "Bulbasaur",
    50,
    { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
    ["Grass", "Poison"],
    [splash],
  );
  const opponent = createTestPokemon(
    "Charmander",
    50,
    { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
    ["Fire"],
    [ember],
  );

  player.status = "freeze";

  const state = createBattleState(...basicTeams(player, opponent));
  const outcome = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Splash" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Ember" },
  );

  const thawed = outcome.resultingState.playerActive.status === "healthy";

  return {
    name: "Freeze thaw on fire hit",
    passed: thawed,
    output: `Status=${outcome.resultingState.playerActive.status}`,
  };
}

function testFullParalysis(): TestResult {
  const tackle = createMove("Tackle", "Normal", "physical", 40);

  const player = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [tackle],
  );
  const opponent = createTestPokemon(
    "Rattata",
    50,
    { hp: 30, atk: 56, def: 35, spa: 25, spd: 35, spe: 72 },
    ["Normal"],
    [tackle],
  );

  player.status = "paralysis";

  const state = createBattleState(...basicTeams(player, opponent));
  const outcome = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Tackle" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  const opponentHp = outcome.resultingState.opponentActive.currentHp;
  const passed = opponentHp === opponent.stats.hp;

  return {
    name: "Full paralysis turn loss",
    passed,
    output: `Opponent HP ${opponentHp}/${opponent.stats.hp}`,
  };
}

function testToxicScaling(): TestResult {
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

  player.status = "badly-poison";
  player.toxicCounter = 1;

  let state = createBattleState(...basicTeams(player, opponent));

  const first = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Splash" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Splash" },
  );
  state = first.resultingState;

  const expectedFirst = Math.max(1, Math.floor(player.stats.hp / 16));
  const firstDelta = player.stats.hp - state.playerActive.currentHp;

  const second = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Splash" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Splash" },
  );

  const expectedSecond = Math.max(1, Math.floor((player.stats.hp * 2) / 16));
  const secondDelta =
    state.playerActive.currentHp - second.resultingState.playerActive.currentHp;

  const passed = firstDelta === expectedFirst && secondDelta === expectedSecond;

  return {
    name: "Toxic scaling damage",
    passed,
    output: `Damage ${firstDelta}/${expectedFirst}, ${secondDelta}/${expectedSecond}`,
  };
}

function testSecondaryEffectsWorstCase(): TestResult {
  const burnMove = createMove("Ember", "Fire", "special", 40, 100, 0, {
    secondaryEffects: [
      { type: "status", status: "burn", chance: 30, target: "opponent" },
    ],
  });
  const poisonMove = createMove("Sludge", "Poison", "special", 40, 100, 0, {
    secondaryEffects: [
      { type: "status", status: "poison", chance: 30, target: "opponent" },
    ],
  });

  const player = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [poisonMove],
  );
  const opponent = createTestPokemon(
    "Charmander",
    50,
    { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
    ["Fire"],
    [burnMove],
  );

  const state = createBattleState(...basicTeams(player, opponent));

  const outcome = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Sludge" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Ember" },
  );

  const playerBurned = outcome.resultingState.playerActive.status === "burn";
  const opponentPoisoned =
    outcome.resultingState.opponentActive.status === "poison";

  const passed = playerBurned && !opponentPoisoned;

  return {
    name: "Worst-case secondary effects",
    passed,
    output: `Player burned=${playerBurned}, Opponent poisoned=${opponentPoisoned}`,
  };
}

function testEndOfTurnItems(): TestResult {
  const splash = createMove("Splash", "Normal", "status", 0);

  const player = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [splash],
    "Overgrow",
    "Sitrus Berry",
  );
  const opponent = createTestPokemon(
    "Magikarp",
    50,
    { hp: 20, atk: 10, def: 55, spa: 15, spd: 20, spe: 80 },
    ["Water"],
    [splash],
  );

  player.currentHp = Math.floor(player.stats.hp * 0.4);

  let state = createBattleState(...basicTeams(player, opponent));

  const sitrus = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Splash" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Splash" },
  );

  const sitrusHealed =
    sitrus.resultingState.playerActive.currentHp > player.currentHp;
  const sitrusConsumed = !sitrus.resultingState.playerActive.item;

  const orbHolder = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [splash],
    "Overgrow",
    "Toxic Orb",
  );

  state = createBattleState(...basicTeams(orbHolder, opponent));

  const orbOutcome = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Splash" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Splash" },
  );

  const orbStatus = orbOutcome.resultingState.playerActive.status;

  const leftoversHolder = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [splash],
    "Overgrow",
    "Leftovers",
  );
  leftoversHolder.status = "burn";

  state = createBattleState(...basicTeams(leftoversHolder, opponent));

  const leftoversOutcome = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Splash" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Splash" },
  );

  const hpDelta =
    leftoversHolder.stats.hp -
    leftoversOutcome.resultingState.playerActive.currentHp;

  const passed =
    sitrusHealed &&
    sitrusConsumed &&
    orbStatus === "badly-poison" &&
    hpDelta === 0;

  return {
    name: "End-of-turn items",
    passed,
    output: `Sitrus healed=${sitrusHealed}, consumed=${sitrusConsumed}, orb=${orbStatus}, burn delta=${hpDelta}`,
  };
}

function testMultiTurnMoves(): TestResult {
  const solarBeam = createMove("Solar Beam", "Grass", "special", 120, 100, 0, {
    multiTurn: { kind: "charge" },
  });
  const fly = createMove("Fly", "Flying", "physical", 90, 100, 0, {
    multiTurn: { kind: "semi-invulnerable" },
  });
  const hyperBeam = createMove("Hyper Beam", "Normal", "special", 150, 100, 0, {
    multiTurn: { kind: "recharge" },
  });
  const tackle = createMove("Tackle", "Normal", "physical", 40);

  const player = createTestPokemon(
    "Sceptile",
    50,
    { hp: 70, atk: 85, def: 65, spa: 105, spd: 85, spe: 120 },
    ["Grass"],
    [solarBeam, fly, hyperBeam],
  );
  const opponent = createTestPokemon(
    "Pidgey",
    50,
    { hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56 },
    ["Normal", "Flying"],
    [tackle],
  );

  let state = createBattleState(...basicTeams(player, opponent));

  const chargeTurn = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Solar Beam" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  const chargeNoDamage =
    chargeTurn.resultingState.opponentActive.currentHp === opponent.stats.hp;

  const chargeResolve = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Solar Beam" },
    chargeTurn.resultingState,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  const chargedDidDamage =
    chargeResolve.resultingState.opponentActive.currentHp < opponent.stats.hp;

  state = createBattleState(...basicTeams(player, opponent));

  const rechargeHit = simulateTurn(
    { type: "move", moveIndex: 2, moveName: "Hyper Beam" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  const needsRecharge =
    (rechargeHit.resultingState.playerActive.rechargeTurns || 0) > 0;

  const rechargeTurn = simulateTurn(
    { type: "move", moveIndex: 2, moveName: "Hyper Beam" },
    rechargeHit.resultingState,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  const rechargeNoDamage =
    rechargeTurn.resultingState.opponentActive.currentHp ===
    rechargeHit.resultingState.opponentActive.currentHp;

  state = createBattleState(...basicTeams(player, opponent));
  player.stats.spe = 200;

  const flyTurn = simulateTurn(
    { type: "move", moveIndex: 1, moveName: "Fly" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  const dodged =
    flyTurn.resultingState.playerActive.currentHp === player.stats.hp;

  const flyHit = simulateTurn(
    { type: "move", moveIndex: 1, moveName: "Fly" },
    flyTurn.resultingState,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  const flyDamage =
    flyHit.resultingState.opponentActive.currentHp < opponent.stats.hp;

  const passed =
    chargeNoDamage &&
    chargedDidDamage &&
    needsRecharge &&
    rechargeNoDamage &&
    dodged &&
    flyDamage;

  return {
    name: "Multi-turn moves",
    passed,
    output: `Charge=${chargeNoDamage}/${chargedDidDamage}, Recharge=${needsRecharge}/${rechargeNoDamage}, Fly=${dodged}/${flyDamage}`,
  };
}

function testSpeedTieWorstCase(): TestResult {
  const tackle = createMove("Tackle", "Normal", "physical", 40);

  const player = createTestPokemon(
    "Eevee",
    50,
    { hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55 },
    ["Normal"],
    [tackle],
  );
  const opponent = createTestPokemon(
    "Rattata",
    50,
    { hp: 30, atk: 56, def: 35, spa: 25, spd: 35, spe: 55 },
    ["Normal"],
    [tackle],
  );

  const state = createBattleState(...basicTeams(player, opponent));
  const outcome = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Tackle" },
    state,
    "worst-case",
    { type: "move", moveIndex: 0, moveName: "Tackle" },
  );

  const passed = outcome.firstMover === "opponent";
  return {
    name: "Speed tie worst-case",
    passed,
    output: `First mover=${outcome.firstMover}`,
  };
}

export function runBattleMechanicsTests(): {
  totalTests: number;
  passedTests: number;
  results: TestResult[];
} {
  const tests: Array<() => TestResult> = [
    testSleepCountdown,
    testFreezeThaw,
    testFreezeThawOnFireHit,
    testFullParalysis,
    testToxicScaling,
    testSecondaryEffectsWorstCase,
    testEndOfTurnItems,
    testMultiTurnMoves,
    testSpeedTieWorstCase,
  ];

  const results = tests.map((fn) => {
    const result = fn();
    const verbose = isVerboseMode();
    if (verbose) {
      console.log(`\n=== TEST: ${result.name} ===`);
      console.log(result.passed ? "✅ PASSED" : "❌ FAILED");
      console.log(`   ${result.output}`);
    }
    return result;
  });
  const passedTests = results.filter((r) => r.passed).length;

  return {
    totalTests: results.length,
    passedTests,
    results,
  };
}
