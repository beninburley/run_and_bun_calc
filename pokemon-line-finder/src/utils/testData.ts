/**
 * Test utilities and mock data for development
 */

import { PokemonInstance, Move, Stats, PokemonType } from "../types";
import { NATURES } from "../data/constants";
import { createInitialStatModifiers } from "../engine/battle";
import { calculateStats } from "../engine/damage";

/**
 * Create a basic attacking move
 */
export function createMove(
  name: string,
  type: PokemonType,
  category: "physical" | "special" | "status",
  power: number,
  accuracy: number = 100,
  priority: number = 0,
): Move {
  return {
    name,
    type,
    category,
    power,
    accuracy,
    pp: 16,
    priority,
    critChance: "normal",
  };
}

/**
 * Create a test Pokemon instance
 */
export function createTestPokemon(
  species: string,
  level: number,
  baseStats: Stats,
  types: [PokemonType] | [PokemonType, PokemonType],
  moves: Move[],
  ability: string = "Overgrow",
  item?: string,
): PokemonInstance {
  // Use max IVs and neutral EVs for simplicity
  const ivs: Stats = {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
  };

  const evs: Stats = {
    hp: 0,
    atk: 252,
    def: 0,
    spa: 0,
    spd: 4,
    spe: 252,
  };

  const nature = NATURES.Adamant;

  const stats = calculateStats(baseStats, level, ivs, evs, nature);

  return {
    species,
    level,
    baseStats,
    ivs,
    evs,
    nature,
    stats,
    ability,
    item,
    moves,
    types,
    currentHp: stats.hp,
    currentPP: moves.map((m) => m.pp),
    status: "healthy",
    statModifiers: createInitialStatModifiers(),
    canDie: false,
  };
}

/**
 * Example mock battles for testing
 */
export function getMockBattle1(): {
  playerTeam: PokemonInstance[];
  opponentTeam: PokemonInstance[];
} {
  // Player: Single Charizard
  const charizard = createTestPokemon(
    "Charizard",
    50,
    { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    ["Fire", "Flying"],
    [
      createMove("Flamethrower", "Fire", "special", 90, 100),
      createMove("Air Slash", "Flying", "special", 75, 95),
      createMove("Dragon Pulse", "Dragon", "special", 85, 100),
      createMove("Heat Wave", "Fire", "special", 95, 90),
    ],
    "Blaze",
  );

  // Opponent: Weaker Grass type
  const venusaur = createTestPokemon(
    "Venusaur",
    48,
    { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 },
    ["Grass", "Poison"],
    [
      createMove("Sludge Bomb", "Poison", "special", 90, 100),
      createMove("Energy Ball", "Grass", "special", 90, 100),
      createMove("Earthquake", "Ground", "physical", 100, 100),
      createMove("Sleep Powder", "Grass", "status", 0, 75),
    ],
    "Overgrow",
  );

  return {
    playerTeam: [charizard],
    opponentTeam: [venusaur],
  };
}

/**
 * More complex mock battle
 */
export function getMockBattle2(): {
  playerTeam: PokemonInstance[];
  opponentTeam: PokemonInstance[];
} {
  // Player team: 2 Pokemon
  const lucario = createTestPokemon(
    "Lucario",
    55,
    { hp: 70, atk: 110, def: 70, spa: 115, spd: 70, spe: 90 },
    ["Fighting", "Steel"],
    [
      createMove("Close Combat", "Fighting", "physical", 120, 100),
      createMove("Flash Cannon", "Steel", "special", 80, 100),
      createMove("Extreme Speed", "Normal", "physical", 80, 100, 2), // Priority +2
      createMove("Bullet Punch", "Steel", "physical", 40, 100, 1), // Priority +1
    ],
    "Inner Focus",
  );

  const garchomp = createTestPokemon(
    "Garchomp",
    58,
    { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    ["Dragon", "Ground"],
    [
      createMove("Earthquake", "Ground", "physical", 100, 100),
      createMove("Dragon Claw", "Dragon", "physical", 80, 100),
      createMove("Stone Edge", "Rock", "physical", 100, 80),
      createMove("Fire Fang", "Fire", "physical", 65, 95),
    ],
    "Rough Skin",
  );

  // Opponent team: 2 Pokemon
  const steelix = createTestPokemon(
    "Steelix",
    56,
    { hp: 75, atk: 85, def: 200, spa: 55, spd: 65, spe: 30 },
    ["Steel", "Ground"],
    [
      createMove("Iron Tail", "Steel", "physical", 100, 75),
      createMove("Earthquake", "Ground", "physical", 100, 100),
      createMove("Rock Slide", "Rock", "physical", 75, 90),
      createMove("Stealth Rock", "Rock", "status", 0, 100),
    ],
    "Sturdy",
  );

  const alakazam = createTestPokemon(
    "Alakazam",
    54,
    { hp: 55, atk: 50, def: 45, spa: 135, spd: 95, spe: 120 },
    ["Psychic"],
    [
      createMove("Psychic", "Psychic", "special", 90, 100),
      createMove("Focus Blast", "Fighting", "special", 120, 70),
      createMove("Shadow Ball", "Ghost", "special", 80, 100),
      createMove("Dazzling Gleam", "Fairy", "special", 80, 100),
    ],
    "Magic Guard",
  );

  return {
    playerTeam: [lucario, garchomp],
    opponentTeam: [steelix, alakazam],
  };
}
