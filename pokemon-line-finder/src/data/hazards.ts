/**
 * Entry Hazards System
 * Handles damage and effects from entry hazards when Pokemon switch in
 */

import { PokemonInstance } from "../types/index";
import { getTypeEffectiveness } from "./constants";

/**
 * Hazards state interface (matches BattleState hazards)
 */
export interface Hazards {
  stealthRock: boolean;
  spikes: number; // 0-3 layers
  toxicSpikes: number; // 0-2 layers
  stickyWeb: boolean;
}

/**
 * Abilities that grant hazard immunity
 */
const HAZARD_IMMUNE_ABILITIES: Record<string, string[]> = {
  stealthRock: ["Magic Guard"],
  spikes: ["Magic Guard", "Levitate"], // Levitate only for Flying-types
  toxicSpikes: ["Magic Guard", "Levitate", "Poison Heal", "Immunity"],
  stickyWeb: ["Magic Guard"],
};

/**
 * Calculate Stealth Rock damage
 * Deals 1/8 HP × type effectiveness of Rock-type move
 */
export function calculateStealthRockDamage(pokemon: PokemonInstance): number {
  // Check immunity
  if (HAZARD_IMMUNE_ABILITIES.stealthRock.includes(pokemon.ability)) {
    return 0;
  }

  const effectiveness = getTypeEffectiveness("Rock", pokemon.types);
  const baseDamage = pokemon.stats.hp / 8;

  return Math.floor(baseDamage * effectiveness);
}

/**
 * Calculate Spikes damage
 * 1 layer: 1/8 HP
 * 2 layers: 1/6 HP
 * 3 layers: 1/4 HP
 */
export function calculateSpikesDamage(
  pokemon: PokemonInstance,
  layers: number,
): number {
  if (layers === 0) return 0;

  // Check immunity
  if (HAZARD_IMMUNE_ABILITIES.spikes.includes(pokemon.ability)) {
    return 0;
  }

  // Flying-types are immune to Spikes
  if (pokemon.types.includes("Flying")) {
    return 0;
  }

  // Calculate damage based on layers
  let fraction: number;
  if (layers === 1) {
    fraction = 8; // 1/8
  } else if (layers === 2) {
    fraction = 6; // 1/6
  } else {
    fraction = 4; // 1/4
  }

  return Math.floor(pokemon.stats.hp / fraction);
}

/**
 * Check if Toxic Spikes affect a Pokemon
 * 1 layer: Normal poison
 * 2 layers: Badly poisoned
 * Poison-types absorb Toxic Spikes (remove them)
 * Steel-types are immune
 */
export function getToxicSpikesEffect(
  pokemon: PokemonInstance,
  layers: number,
): "none" | "poison" | "badly-poison" | "absorb" {
  if (layers === 0) return "none";

  // Check immunity
  if (HAZARD_IMMUNE_ABILITIES.toxicSpikes.includes(pokemon.ability)) {
    return "none";
  }

  // Flying-types are immune to Toxic Spikes
  if (pokemon.types.includes("Flying")) {
    return "none";
  }

  // Steel-types are immune to poison
  if (pokemon.types.includes("Steel")) {
    return "none";
  }

  // Poison-types absorb Toxic Spikes (remove them from field)
  if (pokemon.types.includes("Poison")) {
    return "absorb";
  }

  // Apply poison based on layers
  if (layers === 1) {
    return "poison";
  } else {
    return "badly-poison";
  }
}

/**
 * Check if Sticky Web affects a Pokemon (lowers Speed by 1 stage)
 */
export function appliesStickyWeb(pokemon: PokemonInstance): boolean {
  // Check immunity
  if (HAZARD_IMMUNE_ABILITIES.stickyWeb.includes(pokemon.ability)) {
    return false;
  }

  // Flying-types are immune to Sticky Web
  if (pokemon.types.includes("Flying")) {
    return false;
  }

  return true;
}

/**
 * Calculate total hazard damage on switch-in
 */
export function calculateHazardDamage(
  pokemon: PokemonInstance,
  hazards: Hazards,
): {
  damage: number;
  stealthRockDamage: number;
  spikesDamage: number;
  toxicSpikesEffect: "none" | "poison" | "badly-poison" | "absorb";
  stickyWebApplies: boolean;
} {
  const stealthRockDamage = hazards.stealthRock
    ? calculateStealthRockDamage(pokemon)
    : 0;

  const spikesDamage = calculateSpikesDamage(pokemon, hazards.spikes);

  const toxicSpikesEffect = getToxicSpikesEffect(pokemon, hazards.toxicSpikes);

  const stickyWebApplies = hazards.stickyWeb
    ? appliesStickyWeb(pokemon)
    : false;

  return {
    damage: stealthRockDamage + spikesDamage,
    stealthRockDamage,
    spikesDamage,
    toxicSpikesEffect,
    stickyWebApplies,
  };
}

/**
 * Moves that set hazards
 */
export const HAZARD_SETTING_MOVES: Record<
  string,
  keyof Hazards | "spikes-add" | "toxic-spikes-add"
> = {
  "Stealth Rock": "stealthRock",
  Spikes: "spikes-add",
  "Toxic Spikes": "toxic-spikes-add",
  "Sticky Web": "stickyWeb",
};

/**
 * Get hazard description for UI
 */
export function getHazardDescription(hazards: Hazards): string[] {
  const descriptions: string[] = [];

  if (hazards.stealthRock) {
    descriptions.push("🪨 Stealth Rock: 1/8× Rock effectiveness HP on switch");
  }

  if (hazards.spikes > 0) {
    const damages = ["1/8", "1/6", "1/4"];
    descriptions.push(
      `⭐ Spikes (${hazards.spikes}): ${damages[hazards.spikes - 1]} HP on switch`,
    );
  }

  if (hazards.toxicSpikes > 0) {
    const effect = hazards.toxicSpikes === 1 ? "Poison" : "Badly Poison";
    descriptions.push(
      `☠️ Toxic Spikes (${hazards.toxicSpikes}): ${effect} on switch`,
    );
  }

  if (hazards.stickyWeb) {
    descriptions.push("🕸️ Sticky Web: -1 Speed on switch");
  }

  return descriptions;
}

/**
 * Hazard removal moves
 */
export const HAZARD_REMOVAL_MOVES = {
  "Rapid Spin": {
    removesSelf: true,
    removesOpponent: false,
  },
  Defog: {
    removesSelf: true,
    removesOpponent: true, // Defog removes hazards from both sides
  },
};

/**
 * Check if Heavy-Duty Boots prevents hazard damage
 */
export function hasHeavyDutyBoots(pokemon: PokemonInstance): boolean {
  return pokemon.item === "Heavy-Duty Boots";
}

/**
 * Calculate hazard damage with item consideration
 */
export function calculateHazardDamageWithItems(
  pokemon: PokemonInstance,
  hazards: Hazards,
): {
  damage: number;
  stealthRockDamage: number;
  spikesDamage: number;
  toxicSpikesEffect: "none" | "poison" | "badly-poison" | "absorb";
  stickyWebApplies: boolean;
  bootsNegated: boolean;
} {
  // Heavy-Duty Boots negate all hazard damage and effects
  if (hasHeavyDutyBoots(pokemon)) {
    return {
      damage: 0,
      stealthRockDamage: 0,
      spikesDamage: 0,
      toxicSpikesEffect: "none",
      stickyWebApplies: false,
      bootsNegated: true,
    };
  }

  const result = calculateHazardDamage(pokemon, hazards);
  return {
    ...result,
    bootsNegated: false,
  };
}
