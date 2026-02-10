/**
 * Ability system for Pokemon Run & Bun
 * Defines ability effects and how they interact with battle mechanics
 */

import type { PokemonType, MoveCategory, Stats } from "../types";

export type AbilityTiming =
  | "on-switch-in" // When Pokemon enters battle
  | "on-turn-start" // At the start of each turn
  | "on-turn-end" // At the end of each turn
  | "before-move" // Before a move is used
  | "on-damage-calc" // During damage calculation
  | "after-move" // After a move is used
  | "on-faint" // When Pokemon faints
  | "passive"; // Always active

export interface AbilityEffect {
  // Damage modifications
  damageMultiplier?: (context: DamageContext) => number;

  // Type immunities
  typeImmunities?: PokemonType[];

  // Stat modifications
  statModifiers?: Partial<Stats>;
  onSwitchInStatChange?: {
    target: "self" | "opponent" | "all-opponents";
    stat: keyof Stats;
    stages: number;
  };

  // Status/condition effects
  statusImmunity?: (
    | "burn"
    | "freeze"
    | "paralysis"
    | "poison"
    | "badly-poison"
    | "sleep"
  )[];
  weatherImmunity?: ("rain" | "sun" | "sandstorm" | "hail")[];

  // Special mechanics
  preventsOHKO?: boolean; // Sturdy, Focus Sash
  priorityBoost?: (moveCategory: MoveCategory) => number;
  critRateBoost?: number; // Stages (e.g., +1 for Super Luck)
  recoilCancellation?: boolean;

  // Descriptions
  description: string;
  timing: AbilityTiming[];
}

export interface DamageContext {
  attackerAbility: string;
  defenderAbility: string;
  moveType: PokemonType;
  moveCategory: MoveCategory;
  attackerTypes: PokemonType[];
  defenderTypes: PokemonType[];
  attackerHPPercent: number;
  defenderHPPercent: number;
  weather?: string;
  terrain?: string;
  isSTAB: boolean;
}

// ============================================================================
// ABILITY DATABASE
// ============================================================================

export const abilities: Record<string, AbilityEffect> = {
  // ========================================
  // STAT BOOST ABILITIES
  // ========================================

  Overgrow: {
    description: "Powers up Grass-type moves when HP is below 1/3.",
    timing: ["on-damage-calc"],
    damageMultiplier: (context) => {
      if (context.moveType === "Grass" && context.attackerHPPercent <= 33) {
        return 1.5;
      }
      return 1;
    },
  },

  Blaze: {
    description: "Powers up Fire-type moves when HP is below 1/3.",
    timing: ["on-damage-calc"],
    damageMultiplier: (context) => {
      if (context.moveType === "Fire" && context.attackerHPPercent <= 33) {
        return 1.5;
      }
      return 1;
    },
  },

  Torrent: {
    description: "Powers up Water-type moves when HP is below 1/3.",
    timing: ["on-damage-calc"],
    damageMultiplier: (context) => {
      if (context.moveType === "Water" && context.attackerHPPercent <= 33) {
        return 1.5;
      }
      return 1;
    },
  },

  Swarm: {
    description: "Powers up Bug-type moves when HP is below 1/3.",
    timing: ["on-damage-calc"],
    damageMultiplier: (context) => {
      if (context.moveType === "Bug" && context.attackerHPPercent <= 33) {
        return 1.5;
      }
      return 1;
    },
  },

  // ========================================
  // INTIMIDATE & STAT MANIPULATION
  // ========================================

  Intimidate: {
    description: "Lowers the opponent's Attack stat by one stage on switch-in.",
    timing: ["on-switch-in"],
    onSwitchInStatChange: {
      target: "all-opponents",
      stat: "atk",
      stages: -1,
    },
  },

  Download: {
    description:
      "Raises Attack or Sp. Atk by one stage depending on opponent's lower defensive stat.",
    timing: ["on-switch-in"],
    // Implementation would check opponent's def vs spd and boost accordingly
  },

  // ========================================
  // TYPE IMMUNITIES
  // ========================================

  Levitate: {
    description: "Gives immunity to Ground-type moves.",
    timing: ["passive"],
    typeImmunities: ["Ground"],
  },

  "Flash Fire": {
    description: "Powers up Fire-type moves if hit by Fire. Immune to Fire.",
    timing: ["on-damage-calc", "passive"],
    typeImmunities: ["Fire"],
    // TODO: Add Fire-boost after being hit by Fire move
  },

  "Volt Absorb": {
    description: "Restores HP when hit by Electric-type moves.",
    timing: ["on-damage-calc"],
    typeImmunities: ["Electric"],
  },

  "Water Absorb": {
    description: "Restores HP when hit by Water-type moves.",
    timing: ["on-damage-calc"],
    typeImmunities: ["Water"],
  },

  "Wonder Guard": {
    description: "Only super effective moves will hit.",
    timing: ["on-damage-calc"],
    // Special handling required in damage calculator
  },

  // ========================================
  // DEFENSIVE ABILITIES
  // ========================================

  Sturdy: {
    description: "Cannot be knocked out with one hit. Immune to OHKO moves.",
    timing: ["on-damage-calc"],
    preventsOHKO: true,
  },

  Multiscale: {
    description: "Reduces damage taken by 50% when at full HP.",
    timing: ["on-damage-calc"],
    damageMultiplier: (context) => {
      if (context.defenderHPPercent === 100) {
        return 0.5;
      }
      return 1;
    },
  },

  "Thick Fat": {
    description: "Halves damage from Fire and Ice-type moves.",
    timing: ["on-damage-calc"],
    damageMultiplier: (context) => {
      if (context.moveType === "Fire" || context.moveType === "Ice") {
        return 0.5;
      }
      return 1;
    },
  },

  Filter: {
    description: "Reduces super effective damage by 25%.",
    timing: ["on-damage-calc"],
    // Implementation needs type effectiveness check
  },

  "Solid Rock": {
    description: "Reduces super effective damage by 25%.",
    timing: ["on-damage-calc"],
    // Implementation needs type effectiveness check
  },

  // ========================================
  // STATUS IMMUNITY
  // ========================================

  Immunity: {
    description: "Prevents poisoning.",
    timing: ["passive"],
    statusImmunity: ["poison", "badly-poison"],
  },

  Limber: {
    description: "Prevents paralysis.",
    timing: ["passive"],
    statusImmunity: ["paralysis"],
  },

  "Water Veil": {
    description: "Prevents burn.",
    timing: ["passive"],
    statusImmunity: ["burn"],
  },

  "Magma Armor": {
    description: "Prevents freezing.",
    timing: ["passive"],
    statusImmunity: ["freeze"],
  },

  Insomnia: {
    description: "Prevents sleep.",
    timing: ["passive"],
    statusImmunity: ["sleep"],
  },

  "Vital Spirit": {
    description: "Prevents sleep.",
    timing: ["passive"],
    statusImmunity: ["sleep"],
  },

  // ========================================
  // OFFENSIVE BOOSTS
  // ========================================

  "Huge Power": {
    description: "Doubles Attack stat.",
    timing: ["passive"],
    statModifiers: { atk: 2 }, // Multiplier, not stages
  },

  "Pure Power": {
    description: "Doubles Attack stat.",
    timing: ["passive"],
    statModifiers: { atk: 2 },
  },

  Guts: {
    description: "Boosts Attack by 50% when afflicted with a status condition.",
    timing: ["on-damage-calc"],
    damageMultiplier: (_context) => {
      // Would need to check if attacker has status condition in actual implementation
      // This is handled separately in damage calculator for burn
      return 1;
    },
  },

  Moxie: {
    description: "Raises Attack by one stage after knocking out a Pokemon.",
    timing: ["on-faint"],
    // Implementation: After opponent faints, boost Attack
  },

  "Beast Boost": {
    description:
      "Raises highest stat by one stage after knocking out a Pokemon.",
    timing: ["on-faint"],
  },

  "Grim Neigh": {
    description: "Raises Sp. Atk by one stage after knocking out a Pokemon.",
    timing: ["on-faint"],
  },

  "Chilling Neigh": {
    description: "Raises Attack by one stage after knocking out a Pokemon.",
    timing: ["on-faint"],
  },

  Adaptability: {
    description: "Powers up moves of the same type. STAB goes from 1.5x to 2x.",
    timing: ["on-damage-calc"],
    damageMultiplier: (context) => {
      if (context.isSTAB) {
        return 2 / 1.5; // Changes STAB from 1.5x to 2x
      }
      return 1;
    },
  },

  Technician: {
    description: "Powers up moves with 60 base power or less by 50%.",
    timing: ["on-damage-calc"],
    // Needs access to move base power
  },

  "Iron Fist": {
    description: "Powers up punching moves by 20%.",
    timing: ["on-damage-calc"],
    // Needs to identify punching moves
  },

  "Sheer Force": {
    description:
      "Powers up moves with secondary effects by 30%, but removes the secondary effects.",
    timing: ["on-damage-calc"],
    // Needs to identify moves with secondary effects
  },

  "Skill Link": {
    description: "Multi-hit moves always hit the maximum number of times.",
    timing: ["on-damage-calc"],
    // Special handling for multi-hit moves
  },

  // ========================================
  // SPEED ABILITIES
  // ========================================

  "Swift Swim": {
    description: "Doubles Speed in rain.",
    timing: ["passive"],
    // Implementation: Check weather in speed calculation
  },

  Chlorophyll: {
    description: "Doubles Speed in harsh sunlight.",
    timing: ["passive"],
    // Implementation: Check weather in speed calculation
  },

  "Sand Rush": {
    description: "Doubles Speed in sandstorm.",
    timing: ["passive"],
  },

  "Slush Rush": {
    description: "Doubles Speed in hail.",
    timing: ["passive"],
  },

  Unburden: {
    description: "Doubles Speed after using or losing held item.",
    timing: ["after-move"],
  },

  Prankster: {
    description: "Status moves have +1 priority.",
    timing: ["before-move"],
    priorityBoost: (category) => (category === "status" ? 1 : 0),
  },

  // ========================================
  // ABILITY NEGATION
  // ========================================

  "Mold Breaker": {
    description:
      "Moves ignore abilities that would prevent or reduce their effect.",
    timing: ["on-damage-calc"],
    // Special handling: Ignores defensive abilities
  },

  Teravolt: {
    description:
      "Moves ignore abilities that would prevent or reduce their effect.",
    timing: ["on-damage-calc"],
  },

  Turboblaze: {
    description:
      "Moves ignore abilities that would prevent or reduce their effect.",
    timing: ["on-damage-calc"],
  },

  // ========================================
  // UTILITY ABILITIES
  // ========================================

  "Natural Cure": {
    description: "Heals status conditions upon switching out.",
    timing: ["on-switch-in"],
  },

  Regenerator: {
    description: "Restores 1/3 of max HP upon switching out.",
    timing: ["on-switch-in"],
  },

  "Magic Bounce": {
    description: "Reflects status moves back to the user.",
    timing: ["before-move"],
  },

  "Magic Guard": {
    description: "Only damaged by attacks, not by other sources.",
    timing: ["passive"],
  },

  Pressure: {
    description:
      "When hit by a move, the attacker's PP is reduced by 1 extra point.",
    timing: ["after-move"],
  },

  Truant: {
    description: "Can only use a move every other turn.",
    timing: ["before-move"],
    // Special handling: Alternates between active and inactive turns
  },

  Contrary: {
    description: "Reverses all stat changes.",
    timing: ["passive"],
  },

  "Clear Body": {
    description: "Prevents other Pokemon from lowering its stats.",
    timing: ["passive"],
  },

  "White Smoke": {
    description: "Prevents other Pokemon from lowering its stats.",
    timing: ["passive"],
  },

  "Hyper Cutter": {
    description: "Prevents Attack from being lowered.",
    timing: ["passive"],
  },

  "Keen Eye": {
    description: "Prevents accuracy from being lowered.",
    timing: ["passive"],
  },

  // ========================================
  // WEATHER ABILITIES
  // ========================================

  Drought: {
    description: "Summons harsh sunlight when switched in.",
    timing: ["on-switch-in"],
  },

  Drizzle: {
    description: "Summons rain when switched in.",
    timing: ["on-switch-in"],
  },

  "Sand Stream": {
    description: "Summons sandstorm when switched in.",
    timing: ["on-switch-in"],
  },

  "Snow Warning": {
    description: "Summons hail when switched in.",
    timing: ["on-switch-in"],
  },
};

// ============================================================================
// ABILITY HELPERS
// ============================================================================

export function getAbility(abilityName: string): AbilityEffect | undefined {
  return abilities[abilityName];
}

export function hasAbility(
  pokemon: { ability: string },
  abilityName: string,
): boolean {
  return pokemon.ability === abilityName;
}

export function getAbilityDamageMultiplier(
  attackerAbility: string,
  defenderAbility: string,
  context: DamageContext,
): number {
  let multiplier = 1;

  // Check attacker ability
  const attackerAbilityData = getAbility(attackerAbility);
  if (attackerAbilityData?.damageMultiplier) {
    multiplier *= attackerAbilityData.damageMultiplier(context);
  }

  // Check defender ability (defensive)
  const defenderAbilityData = getAbility(defenderAbility);
  if (defenderAbilityData?.damageMultiplier) {
    multiplier *= defenderAbilityData.damageMultiplier(context);
  }

  return multiplier;
}

export function isTypeImmune(
  defenderAbility: string,
  moveType: PokemonType,
): boolean {
  const abilityData = getAbility(defenderAbility);
  return abilityData?.typeImmunities?.includes(moveType) ?? false;
}

export function canBeStatChanged(
  pokemon: { ability: string },
  stat: keyof Stats,
): boolean {
  const immuneAbilities = ["Clear Body", "White Smoke"];
  if (stat === "atk" && pokemon.ability === "Hyper Cutter") return false;
  return !immuneAbilities.includes(pokemon.ability);
}

export function preventsOHKO(ability: string): boolean {
  const abilityData = getAbility(ability);
  return abilityData?.preventsOHKO ?? false;
}

export function getAbilitySpeedMultiplier(
  ability: string,
  weather?: string,
): number {
  if (weather === "rain" && ability === "Swift Swim") return 2;
  if (weather === "sun" && ability === "Chlorophyll") return 2;
  if (weather === "sandstorm" && ability === "Sand Rush") return 2;
  if (weather === "hail" && ability === "Slush Rush") return 2;
  return 1;
}
