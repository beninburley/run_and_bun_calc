/**
 * Entry Hazard Test Suite
 * Validates damage calculations and effects for hazards when switching in
 */

import { createTestPokemon } from "./testData";
import {
  calculateHazardDamageWithItems,
  getToxicSpikesEffect,
  appliesStickyWeb,
  Hazards,
} from "../data/hazards";

function baseHazards(): Hazards {
  return {
    stealthRock: false,
    spikes: 0,
    toxicSpikes: 0,
    stickyWeb: false,
  };
}

export function testStealthRockDamage(): { passed: boolean; output: string } {
  console.log("=== TEST: Stealth Rock Damage ===");

  const charizard = createTestPokemon(
    "Charizard",
    50,
    { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    ["Fire", "Flying"],
    [],
    "Blaze",
  );

  const hazards = baseHazards();
  hazards.stealthRock = true;

  const result = calculateHazardDamageWithItems(charizard, hazards);
  const expected = Math.floor((charizard.stats.hp / 8) * 4); // 4× weakness

  console.log("  Expected damage:", expected);
  console.log("  Actual damage:", result.stealthRockDamage);

  const passed =
    result.stealthRockDamage === expected && result.damage === expected;

  if (passed) {
    console.log("✅ Stealth Rock dealt 4× damage to Fire/Flying target");
  } else {
    console.log("❌ Stealth Rock damage incorrect");
  }

  return {
    passed,
    output: `Damage ${result.stealthRockDamage}/${expected}`,
  };
}

export function testSpikesLayers(): { passed: boolean; output: string } {
  console.log("\n=== TEST: Spikes Layers ===");

  const blastoise = createTestPokemon(
    "Blastoise",
    50,
    { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 },
    ["Water"],
    [],
    "Torrent",
  );

  const hazards = baseHazards();
  hazards.spikes = 3; // Max layers

  const result = calculateHazardDamageWithItems(blastoise, hazards);
  const expected = Math.floor(blastoise.stats.hp / 4); // 1/4 HP at 3 layers

  console.log("  Expected damage:", expected);
  console.log("  Actual spikes damage:", result.spikesDamage);

  const passed = result.spikesDamage === expected && result.damage === expected;

  if (passed) {
    console.log("✅ Spikes dealt correct 1/4 HP at 3 layers");
  } else {
    console.log("❌ Spikes damage incorrect");
  }

  return {
    passed,
    output: `Damage ${result.spikesDamage}/${expected}`,
  };
}

export function testToxicSpikesEffects(): {
  passed: boolean;
  output: string;
} {
  console.log("\n=== TEST: Toxic Spikes Effects ===");

  const garchomp = createTestPokemon(
    "Garchomp",
    50,
    { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    ["Dragon", "Ground"],
    [],
    "Rough Skin",
  );

  const effect = getToxicSpikesEffect(garchomp, 2);
  console.log("  Toxic Spikes effect on Garchomp:", effect);

  const poisonPassed = effect === "badly-poison";

  const roserade = createTestPokemon(
    "Roserade",
    50,
    { hp: 60, atk: 70, def: 65, spa: 125, spd: 105, spe: 90 },
    ["Grass", "Poison"],
    [],
    "Natural Cure",
  );

  const absorbEffect = getToxicSpikesEffect(roserade, 2);
  console.log("  Toxic Spikes effect on Roserade:", absorbEffect);

  const absorbPassed = absorbEffect === "absorb";

  if (poisonPassed && absorbPassed) {
    console.log(
      "✅ Toxic Spikes poisoned grounded target and were absorbed by Poison-type",
    );
  } else {
    console.log("❌ Toxic Spikes effect logic incorrect");
  }

  return {
    passed: poisonPassed && absorbPassed,
    output: `Effects: ${effect} / ${absorbEffect}`,
  };
}

export function testHeavyDutyBoots(): { passed: boolean; output: string } {
  console.log("\n=== TEST: Heavy-Duty Boots ===");

  const charizard = createTestPokemon(
    "Charizard",
    50,
    { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    ["Fire", "Flying"],
    [],
    "Blaze",
    "Heavy-Duty Boots",
  );

  const hazards = baseHazards();
  hazards.stealthRock = true;
  hazards.spikes = 2;
  hazards.stickyWeb = true;
  hazards.toxicSpikes = 2;

  const result = calculateHazardDamageWithItems(charizard, hazards);

  console.log("  Boots negated:", result.bootsNegated);
  console.log("  Total damage:", result.damage);
  console.log("  Sticky Web applies:", result.stickyWebApplies);
  console.log("  Toxic Spikes effect:", result.toxicSpikesEffect);

  const passed =
    result.bootsNegated &&
    result.damage === 0 &&
    result.stickyWebApplies === false &&
    result.toxicSpikesEffect === "none";

  if (passed) {
    console.log("✅ Heavy-Duty Boots negated all hazard effects");
  } else {
    console.log("❌ Heavy-Duty Boots interaction incorrect");
  }

  return {
    passed,
    output: `Boots ${result.bootsNegated}, damage ${result.damage}`,
  };
}

export function testStickyWebGrounding(): {
  passed: boolean;
  output: string;
} {
  console.log("\n=== TEST: Sticky Web Grounding ===");

  const galvantula = createTestPokemon(
    "Galvantula",
    50,
    { hp: 70, atk: 77, def: 60, spa: 97, spd: 60, spe: 108 },
    ["Bug", "Electric"],
    [],
    "Compound Eyes",
  );

  const charizard = createTestPokemon(
    "Charizard",
    50,
    { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    ["Fire", "Flying"],
    [],
    "Blaze",
  );

  const grounded = appliesStickyWeb(galvantula);
  const flying = appliesStickyWeb(charizard);

  console.log("  Grounded target affected:", grounded);
  console.log("  Flying target affected:", flying);

  const passed = grounded && !flying;

  if (passed) {
    console.log("✅ Sticky Web only lowers Speed of grounded Pokemon");
  } else {
    console.log("❌ Sticky Web grounding logic incorrect");
  }

  return {
    passed,
    output: `Grounded ${grounded} / Flying ${flying}`,
  };
}

export function runHazardTests(): {
  totalTests: number;
  passedTests: number;
  results: Array<{ name: string; passed: boolean; output: string }>;
} {
  const results = [];

  results.push({ name: "Stealth Rock Damage", ...testStealthRockDamage() });
  results.push({ name: "Spikes Layers", ...testSpikesLayers() });
  results.push({ name: "Toxic Spikes Effects", ...testToxicSpikesEffects() });
  results.push({ name: "Heavy-Duty Boots", ...testHeavyDutyBoots() });
  results.push({ name: "Sticky Web Grounding", ...testStickyWebGrounding() });

  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;

  console.log(`\n======================`);
  console.log(`Hazard Tests: ${passedTests}/${totalTests} passed`);
  console.log(`======================`);

  return { totalTests, passedTests, results };
}
