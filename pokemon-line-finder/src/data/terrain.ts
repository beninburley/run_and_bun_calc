/**
 * Terrain Effects System
 * Handles terrain-related damage modifiers, abilities, and special effects
 */

import { Terrain, PokemonInstance } from "../types/index";

/**
 * Terrain effects overview:
 * - Electric Terrain: Boosts Electric moves by 30% (grounded), prevents sleep
 * - Grassy Terrain: Boosts Grass moves by 30% (grounded), heals 1/16 HP per turn, halves Earthquake/Magnitude/Bulldoze damage
 * - Misty Terrain: Halves Dragon move damage (grounded), prevents status conditions
 * - Psychic Terrain: Boosts Psychic moves by 30% (grounded), prevents priority moves
 */

/**
 * Terrain power multipliers (for grounded Pokemon)
 */
export const TERRAIN_POWER_MULTIPLIERS: Record<
  Terrain,
  Partial<Record<string, number>>
> = {
  none: {},
  electric: { Electric: 1.3 },
  grassy: { Grass: 1.3 },
  misty: { Dragon: 0.5 }, // Dragon moves are halved
  psychic: { Psychic: 1.3 },
};

/**
 * Abilities that make Pokemon immune to terrain effects (always grounded)
 */
const GROUNDING_IMMUNITIES = [
  "Levitate", // Floating Pokemon
];

/**
 * Check if a Pokemon is grounded (affected by terrain)
 * Pokemon are grounded unless they are Flying-type, have Levitate, or are holding Air Balloon
 */
export function isGrounded(pokemon: PokemonInstance): boolean {
  // Flying types are not grounded
  if (pokemon.types.includes("Flying")) {
    return false;
  }

  // Levitate ability makes Pokemon ungrounded
  if (GROUNDING_IMMUNITIES.includes(pokemon.ability)) {
    return false;
  }

  // Air Balloon makes Pokemon ungrounded (not implemented yet)
  // if (pokemon.item === "Air Balloon") return false;

  return true;
}

/**
 * Get terrain power multiplier for a move
 */
export function getTerrainPowerMultiplier(
  attacker: PokemonInstance,
  moveType: string,
  terrain: Terrain,
): number {
  if (terrain === "none") {
    return 1.0;
  }

  // Terrain only affects grounded Pokemon
  if (!isGrounded(attacker)) {
    return 1.0;
  }

  const multiplier = TERRAIN_POWER_MULTIPLIERS[terrain][moveType];
  return multiplier || 1.0;
}

/**
 * Get terrain defensive multiplier (e.g., Grassy Terrain halves Earthquake damage)
 */
export function getTerrainDefensiveMultiplier(
  defender: PokemonInstance,
  moveName: string,
  terrain: Terrain,
): number {
  if (terrain === "grassy" && isGrounded(defender)) {
    // Grassy Terrain halves damage from Earthquake, Magnitude, Bulldoze
    if (
      moveName === "Earthquake" ||
      moveName === "Magnitude" ||
      moveName === "Bulldoze"
    ) {
      return 0.5;
    }
  }

  return 1.0;
}

/**
 * Check if terrain prevents a move (Psychic Terrain blocks priority moves)
 */
export function terrainPreventsMove(
  movePriority: number,
  defender: PokemonInstance,
  terrain: Terrain,
): boolean {
  if (terrain === "psychic" && isGrounded(defender) && movePriority > 0) {
    return true; // Priority moves fail against grounded Pokemon in Psychic Terrain
  }

  return false;
}

/**
 * Check if terrain prevents status conditions
 */
export function terrainPreventsStatus(
  pokemon: PokemonInstance,
  statusType: string,
  terrain: Terrain,
): boolean {
  // Electric Terrain prevents sleep
  if (terrain === "electric" && isGrounded(pokemon) && statusType === "sleep") {
    return true;
  }

  // Misty Terrain prevents all status conditions
  if (
    terrain === "misty" &&
    isGrounded(pokemon) &&
    ["burn", "freeze", "paralysis", "poison", "sleep", "badly-poison"].includes(
      statusType,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Calculate terrain healing (Grassy Terrain heals 1/16 HP per turn)
 */
export function calculateTerrainHealing(
  pokemon: PokemonInstance,
  terrain: Terrain,
): number {
  if (terrain === "grassy" && isGrounded(pokemon)) {
    return Math.floor(pokemon.stats.hp / 16); // 1/16 HP per turn
  }

  return 0;
}

/**
 * Abilities that set terrain on switch-in
 */
export const TERRAIN_SETTING_ABILITIES: Record<string, Terrain> = {
  "Electric Surge": "electric",
  "Grassy Surge": "grassy",
  "Misty Surge": "misty",
  "Psychic Surge": "psychic",
};

/**
 * Moves that set terrain
 */
export const TERRAIN_SETTING_MOVES: Record<string, Terrain> = {
  "Electric Terrain": "electric",
  "Grassy Terrain": "grassy",
  "Misty Terrain": "misty",
  "Psychic Terrain": "psychic",
};

/**
 * Get terrain duration (terrain lasts 5 turns, 8 with Terrain Extender)
 */
export function getTerrainDuration(
  terrain: Terrain,
  _setterItem?: string,
): number {
  if (terrain === "none") {
    return 0;
  }

  // Standard duration is 5 turns
  // With Terrain Extender, it would be 8 turns (not implemented yet)
  return 5;
}

/**
 * Abilities boosted by specific terrains
 */
export const TERRAIN_BOOSTED_ABILITIES: Record<
  Terrain,
  Record<string, number>
> = {
  none: {},
  electric: {
    "Surge Surfer": 2.0, // Speed x2
  },
  grassy: {
    "Grass Pelt": 1.5, // Defense x1.5
  },
  misty: {},
  psychic: {},
};

/**
 * Get speed multiplier from terrain-related abilities
 */
export function getTerrainSpeedMultiplier(
  pokemon: PokemonInstance,
  terrain: Terrain,
): number {
  if (terrain === "electric" && pokemon.ability === "Surge Surfer") {
    return 2.0;
  }

  return 1.0;
}

/**
 * Get defense multiplier from terrain-related abilities
 */
export function getTerrainDefenseMultiplier(
  pokemon: PokemonInstance,
  terrain: Terrain,
): number {
  if (terrain === "grassy" && pokemon.ability === "Grass Pelt" && isGrounded(pokemon)) {
    return 1.5;
  }

  return 1.0;
}

/**
 * Terrain effect summary for UI display
 */
export function getTerrainDescription(terrain: Terrain): string {
  switch (terrain) {
    case "none":
      return "No terrain effects";
    case "electric":
      return "⚡ Electric Terrain: Electric moves +30%, prevents sleep (grounded)";
    case "grassy":
      return "🌿 Grassy Terrain: Grass moves +30%, heals 1/16 HP, halves Earthquake damage";
    case "misty":
      return "🌫️ Misty Terrain: Dragon moves -50%, prevents status (grounded)";
    case "psychic":
      return "🔮 Psychic Terrain: Psychic moves +30%, blocks priority moves (grounded)";
  }
}

/**
 * Check if terrain affects a Pokemon (wrapper for isGrounded)
 */
export function isAffectedByTerrain(pokemon: PokemonInstance): boolean {
  return isGrounded(pokemon);
}
