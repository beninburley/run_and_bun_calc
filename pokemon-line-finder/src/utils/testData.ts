/**
 * Test utilities and mock data for development
 */

import { PokemonInstance, Move, Stats, PokemonType } from "../types";
import { NATURES } from "../data/constants";
import { createInitialStatModifiers } from "../engine/battle";
import { calculateStats } from "../engine/damage";
import {
  buildMove,
  buildPokemon,
  MoveSpec,
  PokemonSpec,
} from "../data/normalize";

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
  extras: Partial<Move> = {},
): Move {
  const spec: MoveSpec = {
    name,
    type,
    category,
    power,
    accuracy,
    pp: 16,
    priority,
    critChance: "normal",
    recoil: extras.recoil,
    drain: extras.drain,
    flinchChance: extras.flinchChance,
    statChanges: extras.statChanges,
    statusChance: extras.statusChance,
    secondaryEffects: extras.secondaryEffects,
    weatherEffect: extras.weatherEffect,
    terrainEffect: extras.terrainEffect,
    hazardEffect: extras.hazardEffect,
    hits: extras.hits,
    multiTurn: extras.multiTurn,
  };

  return buildMove(spec);
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

  const spec: PokemonSpec = {
    species,
    level,
    baseStats,
    types,
    moves: moves.map((move) => ({
      name: move.name,
      type: move.type,
      category: move.category,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      priority: move.priority,
      critChance: move.critChance,
      recoil: move.recoil,
      drain: move.drain,
      flinchChance: move.flinchChance,
      statChanges: move.statChanges,
      statusChance: move.statusChance,
      secondaryEffects: move.secondaryEffects,
      weatherEffect: move.weatherEffect,
      terrainEffect: move.terrainEffect,
      hazardEffect: move.hazardEffect,
      hits: move.hits,
      multiTurn: move.multiTurn,
    })),
    ability,
    item,
    nature: nature.name,
    ivs,
    evs,
    canDie: false,
  };

  const pokemon = buildPokemon(spec);
  pokemon.stats = stats;
  pokemon.currentHp = stats.hp;
  pokemon.currentPP = moves.map((m) => m.pp);
  pokemon.statModifiers = createInitialStatModifiers();
  return pokemon;
}

/**
 * Example mock battles for testing
 */
export function getMockBattle1(): {
  playerTeam: PokemonInstance[];
  opponentTeam: PokemonInstance[];
} {
  // Player: Single Charizard with Life Orb
  const charizard = createTestPokemon(
    "Charizard",
    50,
    { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    ["Fire", "Flying"],
    [
      createMove("Flamethrower", "Fire", "special", 90, 100),
      createMove("Air Slash", "Flying", "special", 75, 95, 0, {
        secondaryEffects: [{ type: "flinch", chance: 30 }],
      }),
      createMove("Dragon Pulse", "Dragon", "special", 85, 100),
      createMove("Heat Wave", "Fire", "special", 95, 90),
    ],
    "Blaze",
    "Life Orb",
  );

  // Opponent: Weaker Grass type with Sitrus Berry
  const venusaur = createTestPokemon(
    "Venusaur",
    48,
    { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 },
    ["Grass", "Poison"],
    [
      createMove("Sludge Bomb", "Poison", "special", 90, 100, 0, {
        secondaryEffects: [
          { type: "status", status: "poison", chance: 30, target: "opponent" },
        ],
      }),
      createMove("Energy Ball", "Grass", "special", 90, 100),
      createMove("Earthquake", "Ground", "physical", 100, 100),
      createMove("Sleep Powder", "Grass", "status", 0, 75, 0, {
        secondaryEffects: [
          { type: "status", status: "sleep", chance: 100, target: "opponent" },
        ],
      }),
    ],
    "Overgrow",
    "Sitrus Berry",
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
  // Player team: 2 Pokemon with items
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
    "Choice Band",
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
    "Choice Scarf",
  );

  // Opponent team: 2 Pokemon with items
  const steelix = createTestPokemon(
    "Steelix",
    56,
    { hp: 75, atk: 85, def: 200, spa: 55, spd: 65, spe: 30 },
    ["Steel", "Ground"],
    [
      createMove("Iron Tail", "Steel", "physical", 100, 75),
      createMove("Earthquake", "Ground", "physical", 100, 100),
      createMove("Rock Slide", "Rock", "physical", 75, 90, 0, {
        secondaryEffects: [{ type: "flinch", chance: 30 }],
      }),
      createMove("Stealth Rock", "Rock", "status", 0, 100),
    ],
    "Sturdy",
    "Leftovers",
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
    "Focus Sash",
  );

  return {
    playerTeam: [lucario, garchomp],
    opponentTeam: [steelix, alakazam],
  };
}
