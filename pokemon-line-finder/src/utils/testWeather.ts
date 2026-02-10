/**
 * Weather Effects Test Suite
 * Tests weather damage, weather moves, and weather abilities
 */

import { createBattleState } from "../engine/battle";
import { simulateTurn } from "../engine/battle";
import { createTestPokemon, createMove } from "./testData";

/**
 * Test 1: Sunny Day sets sun weather for 5 turns
 */

export function testSunnyDay(): { passed: boolean; output: string } {
  console.log("=== TEST: Sunny Day ===");

  const charizard = createTestPokemon(
    "Charizard",
    50,
    { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    ["Fire", "Flying"],
    [
      {
        ...createMove("Sunny Day", "Fire", "status", 0, 100),
        weatherEffect: "sun",
      },
      createMove("Flamethrower", "Fire", "special", 90, 100),
    ],
    "Blaze",
  );

  const blastoise = createTestPokemon(
    "Blastoise",
    50,
    { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 },
    ["Water"],
    [createMove("Hydro Pump", "Water", "special", 110, 80)],
    "Torrent",
  );

  const initialState = createBattleState([charizard], [blastoise]);
  console.log("Initial weather:", initialState.weather);

  const turn1 = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Sunny Day" },
    initialState,
  );
  console.log("After Sunny Day:");
  console.log("  Weather:", turn1.resultingState.weather);
  console.log("  Weather turns:", turn1.resultingState.weatherTurns);

  const passed =
    turn1.resultingState.weather === "sun" &&
    turn1.resultingState.weatherTurns === 5;

  if (passed) {
    console.log("✅ Sunny Day correctly set sun weather for 5 turns");
  } else {
    console.log("❌ Sunny Day failed");
  }

  return { passed, output: `Weather: ${turn1.resultingState.weather}` };
}

/**
 * Test 2: Sandstorm deals 1/16 damage per turn
 */
export function testSandstormDamage(): { passed: boolean; output: string } {
  console.log("\n=== TEST: Sandstorm Damage ===");

  const tyranitar = createTestPokemon(
    "Tyranitar",
    50,
    { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 },
    ["Rock", "Dark"],
    [
      {
        ...createMove("Sandstorm", "Rock", "status", 0, 100),
        weatherEffect: "sandstorm",
      },
    ],
    "Sand Stream",
  );

  const charizard = createTestPokemon(
    "Charizard",
    50,
    { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    ["Fire", "Flying"],
    [createMove("Flamethrower", "Fire", "special", 90, 100)],
    "Blaze",
  );
  const initialHp = charizard.currentHp;

  const initialState = createBattleState([tyranitar], [charizard]);
  const turn1 = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Sandstorm" },
    initialState,
  );

  const expectedDamage = Math.floor(charizard.stats.hp / 16);
  const actualDamage =
    initialHp - turn1.resultingState.opponentActive.currentHp;

  console.log("  Expected sandstorm damage:", expectedDamage);
  console.log("  Actual damage:", actualDamage);

  const passed =
    turn1.resultingState.weather === "sandstorm" &&
    actualDamage === expectedDamage;

  if (passed) {
    console.log("✅ Sandstorm correctly dealt 1/16 max HP damage");
  } else {
    console.log("❌ Sandstorm damage incorrect");
  }

  return { passed, output: `Damage: ${actualDamage}/${expectedDamage}` };
}

/**
 * Test 3: Rock-type Pokemon are immune to Sandstorm
 */
export function testSandstormImmunity(): { passed: boolean; output: string } {
  console.log("\n=== TEST: Sandstorm Immunity ===");

  const tyranitar = createTestPokemon(
    "Tyranitar",
    50,
    { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 },
    ["Rock", "Dark"],
    [
      {
        ...createMove("Sandstorm", "Rock", "status", 0, 100),
        weatherEffect: "sandstorm",
      },
    ],
    "Sand Stream",
  );

  const golem = createTestPokemon(
    "Golem",
    50,
    { hp: 80, atk: 120, def: 130, spa: 55, spd: 65, spe: 45 },
    ["Rock", "Ground"],
    [createMove("Tackle", "Normal", "physical", 40, 100)],
    "Sturdy",
  );
  const initialHp = golem.currentHp;

  const initialState = createBattleState([tyranitar], [golem]);
  const turn1 = simulateTurn(
    { type: "move", moveIndex: 0, moveName: "Sandstorm" },
    initialState,
  );

  const actualDamage =
    initialHp - turn1.resultingState.opponentActive.currentHp;
  const passed =
    turn1.resultingState.weather === "sandstorm" && actualDamage === 0;

  if (passed) {
    console.log("✅ Rock-type Pokemon correctly immune to Sandstorm");
  } else {
    console.log("❌ Rock-type immunity failed");
  }

  return { passed, output: `Damage: ${actualDamage} (should be 0)` };
}

/**
 * Run all weather tests
 */
export function runWeatherTests(): {
  totalTests: number;
  passedTests: number;
  results: Array<{ name: string; passed: boolean; output: string }>;
} {
  const results = [];

  results.push({ name: "Sunny Day", ...testSunnyDay() });
  results.push({ name: "Sandstorm Damage", ...testSandstormDamage() });
  results.push({ name: "Sandstorm Immunity", ...testSandstormImmunity() });

  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;

  console.log(`\n======================`);
  console.log(`Weather Tests: ${passedTests}/${totalTests} passed`);
  console.log(`======================`);

  return { totalTests, passedTests, results };
}
