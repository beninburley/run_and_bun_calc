/**
 * Static game data constants for Pokémon mechanics
 */

import { PokemonType, TypeEffectiveness, Nature, StatName } from "../types";

// ============================================================================
// Type Effectiveness Chart
// ============================================================================

/**
 * Type effectiveness multipliers
 * [Attacking Type][Defending Type] = multiplier
 */
export const TYPE_CHART: Record<
  PokemonType,
  Record<PokemonType, TypeEffectiveness>
> = {
  Normal: {
    Normal: 1,
    Fire: 1,
    Water: 1,
    Electric: 1,
    Grass: 1,
    Ice: 1,
    Fighting: 1,
    Poison: 1,
    Ground: 1,
    Flying: 1,
    Psychic: 1,
    Bug: 1,
    Rock: 0.5,
    Ghost: 0,
    Dragon: 1,
    Dark: 1,
    Steel: 0.5,
    Fairy: 1,
  },
  Fire: {
    Normal: 1,
    Fire: 0.5,
    Water: 0.5,
    Electric: 1,
    Grass: 2,
    Ice: 2,
    Fighting: 1,
    Poison: 1,
    Ground: 1,
    Flying: 1,
    Psychic: 1,
    Bug: 2,
    Rock: 0.5,
    Ghost: 1,
    Dragon: 0.5,
    Dark: 1,
    Steel: 2,
    Fairy: 1,
  },
  Water: {
    Normal: 1,
    Fire: 2,
    Water: 0.5,
    Electric: 1,
    Grass: 0.5,
    Ice: 1,
    Fighting: 1,
    Poison: 1,
    Ground: 2,
    Flying: 1,
    Psychic: 1,
    Bug: 1,
    Rock: 2,
    Ghost: 1,
    Dragon: 0.5,
    Dark: 1,
    Steel: 1,
    Fairy: 1,
  },
  Electric: {
    Normal: 1,
    Fire: 1,
    Water: 2,
    Electric: 0.5,
    Grass: 0.5,
    Ice: 1,
    Fighting: 1,
    Poison: 1,
    Ground: 0,
    Flying: 2,
    Psychic: 1,
    Bug: 1,
    Rock: 1,
    Ghost: 1,
    Dragon: 0.5,
    Dark: 1,
    Steel: 1,
    Fairy: 1,
  },
  Grass: {
    Normal: 1,
    Fire: 0.5,
    Water: 2,
    Electric: 1,
    Grass: 0.5,
    Ice: 1,
    Fighting: 1,
    Poison: 0.5,
    Ground: 2,
    Flying: 0.5,
    Psychic: 1,
    Bug: 0.5,
    Rock: 2,
    Ghost: 1,
    Dragon: 0.5,
    Dark: 1,
    Steel: 0.5,
    Fairy: 1,
  },
  Ice: {
    Normal: 1,
    Fire: 0.5,
    Water: 0.5,
    Electric: 1,
    Grass: 2,
    Ice: 0.5,
    Fighting: 1,
    Poison: 1,
    Ground: 2,
    Flying: 2,
    Psychic: 1,
    Bug: 1,
    Rock: 1,
    Ghost: 1,
    Dragon: 2,
    Dark: 1,
    Steel: 0.5,
    Fairy: 1,
  },
  Fighting: {
    Normal: 2,
    Fire: 1,
    Water: 1,
    Electric: 1,
    Grass: 1,
    Ice: 2,
    Fighting: 1,
    Poison: 0.5,
    Ground: 1,
    Flying: 0.5,
    Psychic: 0.5,
    Bug: 0.5,
    Rock: 2,
    Ghost: 0,
    Dragon: 1,
    Dark: 2,
    Steel: 2,
    Fairy: 0.5,
  },
  Poison: {
    Normal: 1,
    Fire: 1,
    Water: 1,
    Electric: 1,
    Grass: 2,
    Ice: 1,
    Fighting: 1,
    Poison: 0.5,
    Ground: 0.5,
    Flying: 1,
    Psychic: 1,
    Bug: 1,
    Rock: 0.5,
    Ghost: 0.5,
    Dragon: 1,
    Dark: 1,
    Steel: 0,
    Fairy: 2,
  },
  Ground: {
    Normal: 1,
    Fire: 2,
    Water: 1,
    Electric: 2,
    Grass: 0.5,
    Ice: 1,
    Fighting: 1,
    Poison: 2,
    Ground: 1,
    Flying: 0,
    Psychic: 1,
    Bug: 0.5,
    Rock: 2,
    Ghost: 1,
    Dragon: 1,
    Dark: 1,
    Steel: 2,
    Fairy: 1,
  },
  Flying: {
    Normal: 1,
    Fire: 1,
    Water: 1,
    Electric: 0.5,
    Grass: 2,
    Ice: 1,
    Fighting: 2,
    Poison: 1,
    Ground: 1,
    Flying: 1,
    Psychic: 1,
    Bug: 2,
    Rock: 0.5,
    Ghost: 1,
    Dragon: 1,
    Dark: 1,
    Steel: 0.5,
    Fairy: 1,
  },
  Psychic: {
    Normal: 1,
    Fire: 1,
    Water: 1,
    Electric: 1,
    Grass: 1,
    Ice: 1,
    Fighting: 2,
    Poison: 2,
    Ground: 1,
    Flying: 1,
    Psychic: 0.5,
    Bug: 1,
    Rock: 1,
    Ghost: 1,
    Dragon: 1,
    Dark: 0,
    Steel: 0.5,
    Fairy: 1,
  },
  Bug: {
    Normal: 1,
    Fire: 0.5,
    Water: 1,
    Electric: 1,
    Grass: 2,
    Ice: 1,
    Fighting: 0.5,
    Poison: 0.5,
    Ground: 1,
    Flying: 0.5,
    Psychic: 2,
    Bug: 1,
    Rock: 1,
    Ghost: 0.5,
    Dragon: 1,
    Dark: 2,
    Steel: 0.5,
    Fairy: 0.5,
  },
  Rock: {
    Normal: 1,
    Fire: 2,
    Water: 1,
    Electric: 1,
    Grass: 1,
    Ice: 2,
    Fighting: 0.5,
    Poison: 1,
    Ground: 0.5,
    Flying: 2,
    Psychic: 1,
    Bug: 2,
    Rock: 1,
    Ghost: 1,
    Dragon: 1,
    Dark: 1,
    Steel: 0.5,
    Fairy: 1,
  },
  Ghost: {
    Normal: 0,
    Fire: 1,
    Water: 1,
    Electric: 1,
    Grass: 1,
    Ice: 1,
    Fighting: 1,
    Poison: 1,
    Ground: 1,
    Flying: 1,
    Psychic: 2,
    Bug: 1,
    Rock: 1,
    Ghost: 2,
    Dragon: 1,
    Dark: 0.5,
    Steel: 1,
    Fairy: 1,
  },
  Dragon: {
    Normal: 1,
    Fire: 1,
    Water: 1,
    Electric: 1,
    Grass: 1,
    Ice: 1,
    Fighting: 1,
    Poison: 1,
    Ground: 1,
    Flying: 1,
    Psychic: 1,
    Bug: 1,
    Rock: 1,
    Ghost: 1,
    Dragon: 2,
    Dark: 1,
    Steel: 0.5,
    Fairy: 0,
  },
  Dark: {
    Normal: 1,
    Fire: 1,
    Water: 1,
    Electric: 1,
    Grass: 1,
    Ice: 1,
    Fighting: 0.5,
    Poison: 1,
    Ground: 1,
    Flying: 1,
    Psychic: 2,
    Bug: 1,
    Rock: 1,
    Ghost: 2,
    Dragon: 1,
    Dark: 0.5,
    Steel: 1,
    Fairy: 0.5,
  },
  Steel: {
    Normal: 1,
    Fire: 0.5,
    Water: 0.5,
    Electric: 0.5,
    Grass: 1,
    Ice: 2,
    Fighting: 1,
    Poison: 1,
    Ground: 1,
    Flying: 1,
    Psychic: 1,
    Bug: 1,
    Rock: 2,
    Ghost: 1,
    Dragon: 1,
    Dark: 1,
    Steel: 0.5,
    Fairy: 2,
  },
  Fairy: {
    Normal: 1,
    Fire: 0.5,
    Water: 1,
    Electric: 1,
    Grass: 1,
    Ice: 1,
    Fighting: 2,
    Poison: 0.5,
    Ground: 1,
    Flying: 1,
    Psychic: 1,
    Bug: 1,
    Rock: 1,
    Ghost: 1,
    Dragon: 2,
    Dark: 2,
    Steel: 0.5,
    Fairy: 1,
  },
};

/**
 * Calculate type effectiveness for an attack
 */
export function getTypeEffectiveness(
  attackType: PokemonType,
  defendingTypes: PokemonType[],
): TypeEffectiveness {
  let effectiveness = 1;
  for (const defType of defendingTypes) {
    effectiveness *= TYPE_CHART[attackType][defType];
  }
  return effectiveness as TypeEffectiveness;
}

// ============================================================================
// Natures
// ============================================================================

export const NATURES: Record<string, Nature> = {
  Hardy: { name: "Hardy" },
  Lonely: { name: "Lonely", plusStat: "atk", minusStat: "def" },
  Brave: { name: "Brave", plusStat: "atk", minusStat: "spe" },
  Adamant: { name: "Adamant", plusStat: "atk", minusStat: "spa" },
  Naughty: { name: "Naughty", plusStat: "atk", minusStat: "spd" },

  Bold: { name: "Bold", plusStat: "def", minusStat: "atk" },
  Docile: { name: "Docile" },
  Relaxed: { name: "Relaxed", plusStat: "def", minusStat: "spe" },
  Impish: { name: "Impish", plusStat: "def", minusStat: "spa" },
  Lax: { name: "Lax", plusStat: "def", minusStat: "spd" },

  Timid: { name: "Timid", plusStat: "spe", minusStat: "atk" },
  Hasty: { name: "Hasty", plusStat: "spe", minusStat: "def" },
  Serious: { name: "Serious" },
  Jolly: { name: "Jolly", plusStat: "spe", minusStat: "spa" },
  Naive: { name: "Naive", plusStat: "spe", minusStat: "spd" },

  Modest: { name: "Modest", plusStat: "spa", minusStat: "atk" },
  Mild: { name: "Mild", plusStat: "spa", minusStat: "def" },
  Quiet: { name: "Quiet", plusStat: "spa", minusStat: "spe" },
  Bashful: { name: "Bashful" },
  Rash: { name: "Rash", plusStat: "spa", minusStat: "spd" },

  Calm: { name: "Calm", plusStat: "spd", minusStat: "atk" },
  Gentle: { name: "Gentle", plusStat: "spd", minusStat: "def" },
  Sassy: { name: "Sassy", plusStat: "spd", minusStat: "spe" },
  Careful: { name: "Careful", plusStat: "spd", minusStat: "spa" },
  Quirky: { name: "Quirky" },
};

/**
 * Get the nature multiplier for a stat (0.9, 1.0, or 1.1)
 */
export function getNatureMultiplier(nature: Nature, stat: StatName): number {
  if (stat === "hp") return 1.0;
  if (nature.plusStat === stat) return 1.1;
  if (nature.minusStat === stat) return 0.9;
  return 1.0;
}

// ============================================================================
// Stat Stage Multipliers
// ============================================================================

/**
 * Stat stage multipliers for battle stats
 * Stage ranges from -6 to +6
 */
export const STAT_STAGE_MULTIPLIERS: Record<number, number> = {
  "-6": 2 / 8,
  "-5": 2 / 7,
  "-4": 2 / 6,
  "-3": 2 / 5,
  "-2": 2 / 4,
  "-1": 2 / 3,
  "0": 1,
  "1": 3 / 2,
  "2": 4 / 2,
  "3": 5 / 2,
  "4": 6 / 2,
  "5": 7 / 2,
  "6": 8 / 2,
};

/**
 * Accuracy/Evasion stage multipliers
 */
export const ACCURACY_STAGE_MULTIPLIERS: Record<number, number> = {
  "-6": 3 / 9,
  "-5": 3 / 8,
  "-4": 3 / 7,
  "-3": 3 / 6,
  "-2": 3 / 5,
  "-1": 3 / 4,
  "0": 1,
  "1": 4 / 3,
  "2": 5 / 3,
  "3": 6 / 3,
  "4": 7 / 3,
  "5": 8 / 3,
  "6": 9 / 3,
};

// ============================================================================
// Damage Calculation Constants
// ============================================================================

/**
 * Random damage multipliers (damage is multiplied by value from 85-100)
 */
export const DAMAGE_RANDOM_MIN = 85;
export const DAMAGE_RANDOM_MAX = 100;

/**
 * STAB (Same Type Attack Bonus) multiplier
 */
export const STAB_MULTIPLIER = 1.5;

/**
 * Critical hit multiplier (Gen 6+)
 */
export const CRIT_MULTIPLIER = 1.5;

/**
 * Critical hit chances by stage
 */
export const CRIT_CHANCES: Record<string, number> = {
  normal: 1 / 24, // ~4.17%
  high: 1 / 8, // 12.5% (high crit ratio moves)
  always: 1, // 100%
};

/**
 * Burn attack reduction (Gen 7+, physical moves only)
 */
export const BURN_ATTACK_MODIFIER = 0.5;

/**
 * Screen damage reduction
 */
export const SCREEN_MULTIPLIER_SINGLES = 0.5;
export const SCREEN_MULTIPLIER_DOUBLES = 2 / 3;

/**
 * Weather damage modifiers
 */
export const WEATHER_MULTIPLIERS = {
  sun: { Fire: 1.5, Water: 0.5 },
  rain: { Water: 1.5, Fire: 0.5 },
  harshSun: { Fire: 1.5, Water: 0 },
  heavyRain: { Water: 1.5, Fire: 0 },
};

// ============================================================================
// AI Scoring Constants (from ai_logic.txt)
// ============================================================================

/**
 * Base AI scores for different scenarios
 */
export const AI_SCORES = {
  // Damaging moves
  HIGHEST_DAMAGE_BASE: 6,
  HIGHEST_DAMAGE_RANDOM: 8,

  // Kill bonuses
  FAST_KILL_BONUS: 6,
  SLOW_KILL_BONUS: 3,
  MOXIE_KILL_BONUS: 1,

  // High crit super effective
  HIGH_CRIT_SE_BONUS: 1,

  // Priority when faster and threatened
  PRIORITY_THREATENED: 11,

  // Default status move score
  STATUS_MOVE_DEFAULT: 6,

  // Switch AI thresholds
  SWITCH_HP_THRESHOLD: 0.5, // Won't switch below 50% HP
  SWITCH_CHANCE: 0.5, // 50% chance to switch when conditions met

  // Protect
  PROTECT_BASE: 6,
  PROTECT_AFFLICTED_PENALTY: -2,
  PROTECT_OPPONENT_AFFLICTED_BONUS: 1,
  PROTECT_FIRST_TURN_PENALTY: -1,

  // Hazards
  HAZARD_FIRST_TURN_LOW: 8,
  HAZARD_FIRST_TURN_HIGH: 9,
  HAZARD_LATER_LOW: 6,
  HAZARD_LATER_HIGH: 7,
  STICKY_WEB_BONUS: 3,

  // Speed control
  SPEED_REDUCTION_SLOWER: 6,
  SPEED_REDUCTION_OTHER: 5,
  TRICK_ROOM_SLOWER: 10,
  TRICK_ROOM_OTHER: 5,
  TAILWIND_SLOWER: 9,
  TAILWIND_OTHER: 5,
};

/**
 * Percentage roll for AI score variation
 * Approximately 80% chance of lower score, 20% chance of +2
 */
export const AI_SCORE_RANDOM_CHANCE = 0.2;
export const AI_SCORE_RANDOM_BONUS = 2;

/**
 * Move effectiveness threshold for AI switch consideration
 */
export const AI_INEFFECTIVE_SCORE_THRESHOLD = -5;
