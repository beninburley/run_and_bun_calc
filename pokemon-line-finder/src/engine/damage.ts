/**
 * Damage calculation engine for Pokémon battles
 * Implements Gen 6+ damage formula with all modifiers
 */

import {
  Move,
  PokemonInstance,
  BattleState,
  DamageRange,
  DamageCalculation,
} from "../types";

import {
  getTypeEffectiveness,
  STAT_STAGE_MULTIPLIERS,
  ACCURACY_STAGE_MULTIPLIERS,
  DAMAGE_RANDOM_MIN,
  DAMAGE_RANDOM_MAX,
  STAB_MULTIPLIER,
  CRIT_MULTIPLIER,
  CRIT_CHANCES,
  BURN_ATTACK_MODIFIER,
  SCREEN_MULTIPLIER_SINGLES,
  WEATHER_MULTIPLIERS,
} from "../data/constants";

import {
  getAbilityDamageMultiplier,
  isTypeImmune,
  preventsOHKO,
  type DamageContext,
} from "../data/abilities";

import {
  getItem,
  getItemDamageMultiplier,
  getItemStatMultiplier,
  hasFocusSashProtection,
} from "../data/items";

/**
 * Calculate the effective stat value including stage modifiers
 */
export function getEffectiveStat(
  baseStat: number,
  stage: number,
  crit: boolean = false,
): number {
  // Crits ignore negative attack stages and positive defense stages
  if (crit) {
    if (stage < 0) stage = 0;
  }

  const clampedStage = Math.max(-6, Math.min(6, stage));
  const multiplier =
    STAT_STAGE_MULTIPLIERS[clampedStage.toString() as "0"] || 1;
  return Math.floor(baseStat * multiplier);
}

/**
 * Calculate move accuracy including modifiers
 */
export function calculateAccuracy(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
): number {
  // Moves with no accuracy check (like Swift) have accuracy = 0 in data, treat as 100%
  if (move.accuracy === 0 || move.accuracy >= 100) {
    return 100;
  }

  const baseAccuracy = move.accuracy;

  // Calculate accuracy stage modifier
  const accuracyStage =
    attacker.statModifiers.accuracy - defender.statModifiers.evasion;
  const clampedAccuracyStage = Math.max(-6, Math.min(6, accuracyStage));
  const stageMultiplier =
    ACCURACY_STAGE_MULTIPLIERS[clampedAccuracyStage.toString() as "0"] || 1;

  const finalAccuracy = Math.min(100, baseAccuracy * stageMultiplier);
  return finalAccuracy;
}

/**
 * Calculate critical hit chance
 */
export function calculateCritChance(
  move: Move,
  _attacker: PokemonInstance,
): number {
  const baseChance = CRIT_CHANCES[move.critChance || "normal"];

  // TODO: Account for abilities like Super Luck, items like Scope Lens
  // TODO: Account for Focus Energy, Dire Hit

  return baseChance * 100; // Return as percentage
}

/**
 * Check if attacker gets STAB on this move
 */
function hasSTAB(move: Move, attacker: PokemonInstance): boolean {
  return attacker.types.includes(move.type);
}

/**
 * Calculate the main damage formula
 * Damage = (((2 * Level / 5 + 2) * Power * A/D) / 50 + 2) * Modifiers
 */
export function calculateDamage(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  battleState: BattleState,
  options: {
    isCrit?: boolean;
    randomRoll?: number; // 85-100, if not provided will calculate range
  } = {},
): number {
  // Status moves deal no damage
  if (move.category === "status" || move.power === 0) {
    return 0;
  }

  // Check for type immunity from abilities (e.g., Levitate vs Ground)
  if (isTypeImmune(defender.ability, move.type)) {
    return 0;
  }

  const isCrit = options.isCrit || false;
  const randomRoll = options.randomRoll || DAMAGE_RANDOM_MAX;

  // Step 1: Level component
  const level = attacker.level;
  const levelComponent = Math.floor((2 * level) / 5 + 2);

  // Step 2: Power
  let power = move.power;

  // TODO: Weather-boosted moves (e.g., Solar Beam in sun)
  // TODO: Terrain-boosted moves

  // Step 3: Attack / Defense
  let attack: number;
  let defense: number;

  // Get item stat multipliers
  const attackerItem = getItem(attacker.item);
  const defenderItem = getItem(defender.item);

  if (move.category === "physical") {
    attack = getEffectiveStat(
      attacker.stats.atk,
      attacker.statModifiers.atk,
      isCrit,
    );
    defense = getEffectiveStat(
      defender.stats.def,
      defender.statModifiers.def,
      isCrit,
    );

    // Apply item stat boosts
    attack = Math.floor(attack * getItemStatMultiplier(attackerItem, "atk"));
    defense = Math.floor(defense * getItemStatMultiplier(defenderItem, "def"));

    // Burn halves physical attack (unless attacker has Guts)
    if (attacker.status === "burn") {
      // Check for Guts ability - Guts ignores burn attack reduction
      if (attacker.ability !== "Guts") {
        attack = Math.floor(attack * BURN_ATTACK_MODIFIER);
      }
    }
  } else {
    attack = getEffectiveStat(
      attacker.stats.spa,
      attacker.statModifiers.spa,
      isCrit,
    );
    defense = getEffectiveStat(
      defender.stats.spd,
      defender.statModifiers.spd,
      isCrit,
    );

    // Apply item stat boosts
    attack = Math.floor(attack * getItemStatMultiplier(attackerItem, "spa"));
    defense = Math.floor(defense * getItemStatMultiplier(defenderItem, "spd"));
  }

  // Step 4: Base damage calculation
  let damage = Math.floor(
    Math.floor(Math.floor((levelComponent * power * attack) / defense) / 50) +
      2,
  );

  // Step 5: Apply modifiers
  let modifiers = 1.0;

  // Targets modifier (doubles specific, usually 0.75 for spread moves)
  // For singles, this is always 1
  // TODO: Implement this for doubles

  // Weather
  if (battleState.weather === "sun" && move.type in WEATHER_MULTIPLIERS.sun) {
    modifiers *=
      WEATHER_MULTIPLIERS.sun[
        move.type as keyof typeof WEATHER_MULTIPLIERS.sun
      ] || 1;
  } else if (
    battleState.weather === "rain" &&
    move.type in WEATHER_MULTIPLIERS.rain
  ) {
    modifiers *=
      WEATHER_MULTIPLIERS.rain[
        move.type as keyof typeof WEATHER_MULTIPLIERS.rain
      ] || 1;
  } else if (battleState.weather === "harsh-sun" && move.type === "Fire") {
    modifiers *= 1.5;
  } else if (battleState.weather === "harsh-sun" && move.type === "Water") {
    return 0; // Water moves fail in harsh sun
  } else if (battleState.weather === "heavy-rain" && move.type === "Water") {
    modifiers *= 1.5;
  } else if (battleState.weather === "heavy-rain" && move.type === "Fire") {
    return 0; // Fire moves fail in heavy rain
  }

  // Critical hit
  if (isCrit) {
    modifiers *= CRIT_MULTIPLIER;
  }

  // Random roll (85-100)
  modifiers *= randomRoll / 100;

  // STAB
  if (hasSTAB(move, attacker)) {
    modifiers *= STAB_MULTIPLIER;
  }

  // Type effectiveness
  const effectiveness = getTypeEffectiveness(move.type, defender.types);
  modifiers *= effectiveness;

  // Screens (only if not crit, crits ignore screens)
  if (!isCrit) {
    if (
      move.category === "physical" &&
      battleState.opponentScreens.reflect > 0
    ) {
      modifiers *= SCREEN_MULTIPLIER_SINGLES;
    } else if (
      move.category === "special" &&
      battleState.opponentScreens.lightScreen > 0
    ) {
      modifiers *= SCREEN_MULTIPLIER_SINGLES;
    } else if (battleState.opponentScreens.auroraVeil > 0) {
      modifiers *= SCREEN_MULTIPLIER_SINGLES;
    }
  }

  // Abilities
  const attackerHPPercent = (attacker.currentHp / attacker.stats.hp) * 100;
  const defenderHPPercent = (defender.currentHp / defender.stats.hp) * 100;

  const abilityContext: DamageContext = {
    attackerAbility: attacker.ability,
    defenderAbility: defender.ability,
    moveType: move.type,
    moveCategory: move.category,
    attackerTypes: attacker.types,
    defenderTypes: defender.types,
    attackerHPPercent,
    defenderHPPercent,
    weather: battleState.weather,
    isSTAB: hasSTAB(move, attacker),
  };

  const abilityMultiplier = getAbilityDamageMultiplier(
    attacker.ability,
    defender.ability,
    abilityContext,
  );
  modifiers *= abilityMultiplier;

  // Items - damage multipliers (Life Orb, Expert Belt, type-boost items)
  const itemMultiplier = getItemDamageMultiplier(
    attackerItem,
    move.type,
    effectiveness,
  );
  modifiers *= itemMultiplier;

  // TODO: Other modifiers
  // - Terrain effects
  // - Other field effects

  damage = Math.floor(damage * modifiers);

  // Minimum damage is 1 (if move connects and isn't immune)
  if (damage < 1 && effectiveness > 0) {
    damage = 1;
  }

  // Sturdy / Focus Sash - prevents OHKO when at full HP
  if (
    preventsOHKO(defender.ability) &&
    defender.currentHp === defender.stats.hp
  ) {
    if (damage >= defender.currentHp) {
      damage = defender.currentHp - 1;
    }
  }

  // Focus Sash item - prevents OHKO when at full HP
  if (
    hasFocusSashProtection(defenderItem) &&
    defender.currentHp === defender.stats.hp
  ) {
    if (damage >= defender.currentHp) {
      damage = defender.currentHp - 1;
    }
  }

  return damage;
}

/**
 * Calculate full damage range and additional information
 */
export function calculateDamageRange(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  battleState: BattleState,
): DamageRange {
  // Calculate min and max damage
  const minDamage = calculateDamage(move, attacker, defender, battleState, {
    randomRoll: DAMAGE_RANDOM_MIN,
  });

  const maxDamage = calculateDamage(move, attacker, defender, battleState, {
    randomRoll: DAMAGE_RANDOM_MAX,
  });

  const defenderMaxHP = defender.stats.hp;

  const minPercent = (minDamage / defenderMaxHP) * 100;
  const maxPercent = (maxDamage / defenderMaxHP) * 100;

  const guaranteedKO = minDamage >= defender.currentHp;
  const possibleKO = maxDamage >= defender.currentHp;

  // Calculate KO chance if possible but not guaranteed
  let koChance: number | undefined;
  if (possibleKO && !guaranteedKO) {
    // Calculate how many of the 16 damage rolls result in KO
    let koRolls = 0;
    for (let roll = DAMAGE_RANDOM_MIN; roll <= DAMAGE_RANDOM_MAX; roll++) {
      const damage = calculateDamage(move, attacker, defender, battleState, {
        randomRoll: roll,
      });
      if (damage >= defender.currentHp) {
        koRolls++;
      }
    }
    koChance = (koRolls / 16) * 100;
  }

  return {
    min: minDamage,
    max: maxDamage,
    minPercent,
    maxPercent,
    guaranteedKO,
    possibleKO,
    koChance,
  };
}

/**
 * Calculate full damage calculation with all information
 */
export function calculateFullDamage(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  battleState: BattleState,
): DamageCalculation {
  // Normal damage range
  const damageRange = calculateDamageRange(
    move,
    attacker,
    defender,
    battleState,
  );

  // Critical hit damage range
  let critDamage: DamageRange | undefined;
  const critChance = calculateCritChance(move, attacker);

  if (critChance > 0 && critChance < 100) {
    const critMin = calculateDamage(move, attacker, defender, battleState, {
      isCrit: true,
      randomRoll: DAMAGE_RANDOM_MIN,
    });

    const critMax = calculateDamage(move, attacker, defender, battleState, {
      isCrit: true,
      randomRoll: DAMAGE_RANDOM_MAX,
    });

    const defenderMaxHP = defender.stats.hp;
    const critMinPercent = (critMin / defenderMaxHP) * 100;
    const critMaxPercent = (critMax / defenderMaxHP) * 100;

    const guaranteedKO = critMin >= defender.currentHp;
    const possibleKO = critMax >= defender.currentHp;

    let koChance: number | undefined;
    if (possibleKO && !guaranteedKO) {
      let koRolls = 0;
      for (let roll = DAMAGE_RANDOM_MIN; roll <= DAMAGE_RANDOM_MAX; roll++) {
        const damage = calculateDamage(move, attacker, defender, battleState, {
          isCrit: true,
          randomRoll: roll,
        });
        if (damage >= defender.currentHp) {
          koRolls++;
        }
      }
      koChance = (koRolls / 16) * 100;
    }

    critDamage = {
      min: critMin,
      max: critMax,
      minPercent: critMinPercent,
      maxPercent: critMaxPercent,
      guaranteedKO,
      possibleKO,
      koChance,
    };
  } else if (critChance >= 100) {
    // Always crits, so normal damage is crit damage
    critDamage = damageRange;
  }

  // Accuracy
  const accuracy = calculateAccuracy(move, attacker, defender);

  // Recoil and drain
  let recoilDamage: number | undefined;
  let drainHeal: number | undefined;

  if (move.recoil) {
    // Use max damage for recoil calculation
    recoilDamage = Math.floor(damageRange.max * (move.recoil / 100));
  }

  if (move.drain) {
    drainHeal = Math.floor(damageRange.max * (move.drain / 100));
  }

  // Secondary effect chance
  let secondaryEffectChance: number | undefined;
  if (move.statChanges && move.statChanges.length > 0) {
    secondaryEffectChance = move.statChanges[0].chance;
  } else if (move.statusChance) {
    secondaryEffectChance = move.statusChance.chance;
  } else if (move.flinchChance) {
    secondaryEffectChance = move.flinchChance;
  }

  return {
    move,
    attacker,
    defender,
    battleState,
    damageRange,
    critChance,
    accuracy,
    critDamage,
    secondaryEffectChance,
    recoilDamage,
    drainHeal,
  };
}

/**
 * Calculate stat values based on level, base stats, IVs, EVs, and nature
 */
export function calculateStats(
  baseStats: PokemonInstance["baseStats"],
  level: number,
  ivs: PokemonInstance["ivs"],
  evs: PokemonInstance["evs"],
  nature: PokemonInstance["nature"],
): PokemonInstance["stats"] {
  const stats = {} as PokemonInstance["stats"];

  // HP formula is different
  stats.hp = Math.floor(
    ((2 * baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100 +
      level +
      10,
  );

  // Other stats
  const statNames: Array<Exclude<keyof typeof baseStats, "hp">> = [
    "atk",
    "def",
    "spa",
    "spd",
    "spe",
  ];

  for (const stat of statNames) {
    const base = baseStats[stat];
    const iv = ivs[stat];
    const ev = evs[stat];

    let value = Math.floor(
      ((2 * base + iv + Math.floor(ev / 4)) * level) / 100 + 5,
    );

    // Apply nature modifier
    let natureMultiplier = 1.0;
    if (nature.plusStat === stat) natureMultiplier = 1.1;
    if (nature.minusStat === stat) natureMultiplier = 0.9;

    value = Math.floor(value * natureMultiplier);

    stats[stat] = value;
  }

  return stats;
}

/**
 * Determine who moves first in a turn
 */
export function determineFirstMover(
  playerAction: Move | "switch",
  opponentAction: Move | "switch",
  playerSpeed: number,
  opponentSpeed: number,
  battleState: BattleState,
): "player" | "opponent" {
  // Switches always go first
  if (playerAction === "switch" && opponentAction !== "switch") {
    return "player";
  }
  if (opponentAction === "switch" && playerAction !== "switch") {
    return "opponent";
  }
  if (playerAction === "switch" && opponentAction === "switch") {
    // Both switching, use speed
    return playerSpeed >= opponentSpeed ? "player" : "opponent";
  }

  // Both using moves
  const playerMove = playerAction as Move;
  const opponentMove = opponentAction as Move;

  // Check priority
  if (playerMove.priority > opponentMove.priority) {
    return "player";
  }
  if (opponentMove.priority > playerMove.priority) {
    return "opponent";
  }

  // Same priority, check Trick Room
  if (battleState.trickRoom > 0) {
    // In Trick Room, slower moves first
    return playerSpeed <= opponentSpeed ? "player" : "opponent";
  }

  // Normal speed comparison
  if (playerSpeed > opponentSpeed) {
    return "player";
  } else if (opponentSpeed > playerSpeed) {
    return "opponent";
  } else {
    // Speed tie - AI sees this as them being faster (per AI logic)
    return "opponent";
  }
}
