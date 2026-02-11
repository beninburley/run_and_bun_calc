/**
 * Battle simulation engine
 * Handles turn execution, state updates, and battle flow
 */

import {
  BattleState,
  PokemonInstance,
  BattleAction,
  TurnOutcome,
  Risk,
  Move,
  StatModifiers,
} from "../types";

import {
  calculateDamage,
  calculateFullDamage,
  determineFirstMover,
  getEffectiveStat,
} from "./damage";

import { calculateAIDecision } from "./ai";

import { getItem, getItemStatMultiplier } from "../data/items";

import {
  calculateWeatherDamage,
  calculateWeatherHealing,
  getWeatherSpeedMultiplier,
} from "../data/weather";

import {
  calculateTerrainHealing,
  getTerrainSpeedMultiplier,
} from "../data/terrain";

import {
  calculateHazardDamageWithItems,
  HAZARD_SETTING_MOVES,
  HAZARD_REMOVAL_MOVES,
} from "../data/hazards";

import { DAMAGE_RANDOM_MAX, DAMAGE_RANDOM_MIN } from "../data/constants";

/**
 * Create initial stat modifiers (all at 0)
 */
export function createInitialStatModifiers(): StatModifiers {
  return {
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    accuracy: 0,
    evasion: 0,
  };
}

/**
 * Create initial battle state
 */
export function createBattleState(
  playerTeam: PokemonInstance[],
  opponentTeam: PokemonInstance[],
): BattleState {
  if (playerTeam.length === 0 || opponentTeam.length === 0) {
    throw new Error("Both teams must have at least one Pokémon");
  }

  return {
    turn: 1,
    playerActive: playerTeam[0],
    opponentActive: opponentTeam[0],
    playerTeam,
    opponentTeam,
    weather: "clear",
    weatherTurns: 0,
    terrain: "none",
    terrainTurns: 0,
    playerHazards: {
      stealthRock: false,
      spikes: 0,
      toxicSpikes: 0,
      stickyWeb: false,
    },
    opponentHazards: {
      stealthRock: false,
      spikes: 0,
      toxicSpikes: 0,
      stickyWeb: false,
    },
    playerScreens: {
      lightScreen: 0,
      reflect: 0,
      auroraVeil: 0,
    },
    opponentScreens: {
      lightScreen: 0,
      reflect: 0,
      auroraVeil: 0,
    },
    trickRoom: 0,
    tailwind: {
      player: 0,
      opponent: 0,
    },
    futureAttacks: [],
  };
}

/**
 * Deep clone a battle state for simulations
 */
export function cloneBattleState(state: BattleState): BattleState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Deep clone a Pokemon instance
 */
export function clonePokemon(pokemon: PokemonInstance): PokemonInstance {
  return JSON.parse(JSON.stringify(pokemon));
}

/**
 * Apply hazard damage when switching in
 */
function applyHazardDamage(
  pokemon: PokemonInstance,
  hazards: BattleState["playerHazards"],
): number {
  const hazardResult = calculateHazardDamageWithItems(pokemon, hazards);

  if (hazardResult.bootsNegated) {
    return 0;
  }

  if (hazardResult.toxicSpikesEffect === "absorb") {
    hazards.toxicSpikes = 0;
  } else if (
    hazardResult.toxicSpikesEffect !== "none" &&
    pokemon.status === "healthy"
  ) {
    pokemon.status = hazardResult.toxicSpikesEffect;
  }

  if (hazardResult.stickyWebApplies) {
    pokemon.statModifiers.spe = Math.max(-6, pokemon.statModifiers.spe - 1);
  }

  return hazardResult.damage;
}

function clearHazards(hazards: BattleState["playerHazards"]): void {
  hazards.stealthRock = false;
  hazards.spikes = 0;
  hazards.toxicSpikes = 0;
  hazards.stickyWeb = false;
}

function inferHazardEffect(move: Move): Move["hazardEffect"] | undefined {
  if (move.hazardEffect) {
    return move.hazardEffect;
  }

  const hazardSetting = HAZARD_SETTING_MOVES[move.name];
  if (hazardSetting) {
    switch (hazardSetting) {
      case "stealthRock":
        return "stealth-rock";
      case "stickyWeb":
        return "sticky-web";
      case "spikes":
      case "spikes-add":
        return "spikes";
      case "toxicSpikes":
      case "toxic-spikes-add":
        return "toxic-spikes";
      default:
        break;
    }
  }

  const hazardRemoval =
    HAZARD_REMOVAL_MOVES[move.name as keyof typeof HAZARD_REMOVAL_MOVES];
  if (hazardRemoval) {
    return hazardRemoval.removesOpponent ? "defog" : "rapid-spin";
  }

  return undefined;
}

function applyHazardMoveEffects(
  move: Move,
  battleState: BattleState,
  isPlayer: boolean,
): void {
  const hazardEffect = inferHazardEffect(move);
  if (!hazardEffect) {
    return;
  }

  if (hazardEffect === "rapid-spin" || hazardEffect === "defog") {
    const selfHazards = isPlayer
      ? battleState.playerHazards
      : battleState.opponentHazards;
    clearHazards(selfHazards);

    if (hazardEffect === "defog") {
      const foeHazards = isPlayer
        ? battleState.opponentHazards
        : battleState.playerHazards;
      clearHazards(foeHazards);
    }

    return;
  }

  const targetHazards = isPlayer
    ? battleState.opponentHazards
    : battleState.playerHazards;

  switch (hazardEffect) {
    case "stealth-rock":
      targetHazards.stealthRock = true;
      break;
    case "spikes":
      targetHazards.spikes = Math.min(3, targetHazards.spikes + 1);
      break;
    case "toxic-spikes":
      targetHazards.toxicSpikes = Math.min(2, targetHazards.toxicSpikes + 1);
      break;
    case "sticky-web":
      targetHazards.stickyWeb = true;
      break;
    default:
      break;
  }
}

/**
 * Process a switch action
 */
function processSwitch(
  switchAction: Extract<BattleAction, { type: "switch" }>,
  team: PokemonInstance[],
  hazards: BattleState["playerHazards"],
  _isPlayer: boolean,
): { newActive: PokemonInstance; switchDamage: number } {
  const targetMon = clonePokemon(team[switchAction.targetIndex]);
  const switchDamage = applyHazardDamage(targetMon, hazards);
  targetMon.currentHp = Math.max(0, targetMon.currentHp - switchDamage);

  return { newActive: targetMon, switchDamage };
}

/**
 * Process a move action and calculate damage and effects
 */
function processMove(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  battleState: BattleState,
): {
  damage: number;
  defenderFainted: boolean;
  attackerRecoil: number;
  risks: Risk[];
  moveHit: boolean;
} {
  const damageCalc = calculateFullDamage(move, attacker, defender, battleState);
  const risks: Risk[] = [];

  // Roll for accuracy
  const accuracyRoll = Math.random() * 100;
  const moveHits = accuracyRoll < damageCalc.accuracy;

  if (!moveHits) {
    return {
      damage: 0,
      defenderFainted: false,
      attackerRecoil: 0,
      risks: [
        {
          type: "accuracy",
          description: `${move.name} missed (${damageCalc.accuracy}% accuracy)`,
          probability: 100 - damageCalc.accuracy,
          impact: "severe",
        },
      ],
      moveHit: false,
    };
  }

  // Add accuracy risk if not guaranteed
  if (damageCalc.accuracy < 100) {
    risks.push({
      type: "accuracy",
      description: `${move.name} could miss`,
      probability: 100 - damageCalc.accuracy,
      impact: damageCalc.damageRange.guaranteedKO ? "catastrophic" : "severe",
    });
  }

  // Roll for damage (simulate one of 16 possible rolls)
  const damageRolls = [];
  for (let i = 85; i <= 100; i++) {
    damageRolls.push(i);
  }
  const randomRoll =
    damageRolls[Math.floor(Math.random() * damageRolls.length)];

  // Roll for crit
  const critRoll = Math.random() * 100;
  const isCrit = critRoll < damageCalc.critChance;

  // Calculate actual damage
  // For simplicity, use expected damage (can be enhanced)
  const baseDamage =
    isCrit && damageCalc.critDamage
      ? damageCalc.critDamage.max
      : damageCalc.damageRange.max;

  const actualDamage = Math.floor(baseDamage * (randomRoll / 100));

  // Add damage roll risk if not guaranteed KO
  if (
    !damageCalc.damageRange.guaranteedKO &&
    damageCalc.damageRange.possibleKO
  ) {
    const guaranteed2HKO = damageCalc.damageRange.min * 2 >= defender.currentHp;

    if (!guaranteed2HKO) {
      risks.push({
        type: "damage-roll",
        description: `${move.name} needs high roll to KO (${damageCalc.damageRange.koChance?.toFixed(1)}% chance)`,
        probability: 100 - (damageCalc.damageRange.koChance || 0),
        impact: "severe",
      });
    }
  }

  // Note: We don't track crits as a risk for PLAYER moves because crits are BENEFICIAL
  // (they deal more damage, helping us win). Crits would only be a risk if we REQUIRED
  // one to win, which would be tracked as requiresCrits in the line analysis.

  const defenderFainted = actualDamage >= defender.currentHp;

  // Recoil
  let attackerRecoil = 0;
  if (damageCalc.recoilDamage) {
    attackerRecoil = Math.floor(actualDamage * ((move.recoil || 0) / 100));
  }

  return {
    damage: actualDamage,
    defenderFainted,
    attackerRecoil,
    risks,
    moveHit: true,
  };
}

function clampStatStage(value: number): number {
  return Math.max(-6, Math.min(6, value));
}

function applyStatChanges(
  target: PokemonInstance,
  changes: Partial<Record<keyof StatModifiers, number>>,
): void {
  Object.entries(changes).forEach(([stat, amount]) => {
    if (amount === undefined) {
      return;
    }

    const key = stat as keyof StatModifiers;
    target.statModifiers[key] = clampStatStage(
      target.statModifiers[key] + amount,
    );
  });
}

function applyStatus(
  target: PokemonInstance,
  status: PokemonInstance["status"],
): void {
  if (target.status !== "healthy") {
    return;
  }

  target.status = status;
}

function shouldApplySecondary(
  chance: number,
  rngMode: "random" | "worst-case",
  isPlayer: boolean,
): boolean {
  if (chance <= 0) {
    return false;
  }

  if (rngMode === "random") {
    return Math.random() * 100 < chance;
  }

  if (isPlayer) {
    return chance >= 100;
  }

  return true;
}

function applySecondaryEffects(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  rngMode: "random" | "worst-case",
  isPlayer: boolean,
  canFlinch: boolean,
): { flinched: boolean } {
  if (rngMode === "random") {
    return { flinched: false };
  }

  let flinched = false;

  if (move.statChanges && move.statChanges.length > 0) {
    move.statChanges.forEach((change) => {
      if (!shouldApplySecondary(change.chance, rngMode, isPlayer)) {
        return;
      }

      const target = change.target === "user" ? attacker : defender;
      applyStatChanges(target, change.stats);
    });
  }

  if (move.statusChance) {
    if (shouldApplySecondary(move.statusChance.chance, rngMode, isPlayer)) {
      applyStatus(defender, move.statusChance.status);
    }
  }

  if (move.flinchChance && canFlinch) {
    if (shouldApplySecondary(move.flinchChance, rngMode, isPlayer)) {
      flinched = true;
    }
  }

  return { flinched };
}

function canActFromStatus(
  pokemon: PokemonInstance,
  rngMode: "random" | "worst-case",
  isPlayer: boolean,
): boolean {
  if (rngMode === "random") {
    return true;
  }

  if (pokemon.status === "paralysis") {
    return isPlayer ? false : true;
  }

  if (pokemon.status === "sleep" || pokemon.status === "freeze") {
    return isPlayer ? false : true;
  }

  return true;
}

function applyEndOfTurnStatusDamage(
  pokemon: PokemonInstance,
  rngMode: "random" | "worst-case",
): number {
  if (rngMode !== "worst-case") {
    return 0;
  }

  if (pokemon.currentHp <= 0) {
    return 0;
  }

  let fraction = 0;
  if (pokemon.status === "burn") {
    fraction = 16;
  } else if (pokemon.status === "poison" || pokemon.status === "badly-poison") {
    fraction = 8;
  }

  if (fraction === 0) {
    return 0;
  }

  return Math.max(1, Math.floor(pokemon.stats.hp / fraction));
}

function resolveMoveWorstCase(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  battleState: BattleState,
  isPlayer: boolean,
): {
  damage: number;
  defenderFainted: boolean;
  attackerRecoil: number;
  risks: Risk[];
  moveHit: boolean;
} {
  const damageCalc = calculateFullDamage(move, attacker, defender, battleState);

  const moveHits = isPlayer ? damageCalc.accuracy >= 100 : true;

  if (!moveHits) {
    return {
      damage: 0,
      defenderFainted: false,
      attackerRecoil: 0,
      risks: [],
      moveHit: false,
    };
  }

  const isCrit = isPlayer ? false : damageCalc.critChance > 0;
  const randomRoll = isPlayer ? DAMAGE_RANDOM_MIN : DAMAGE_RANDOM_MAX;

  const actualDamage = calculateDamage(move, attacker, defender, battleState, {
    isCrit,
    randomRoll,
  });

  const defenderFainted = actualDamage >= defender.currentHp;

  let attackerRecoil = 0;
  if (damageCalc.recoilDamage) {
    attackerRecoil = Math.floor(actualDamage * ((move.recoil || 0) / 100));
  }

  return {
    damage: actualDamage,
    defenderFainted,
    attackerRecoil,
    risks: [],
    moveHit: true,
  };
}

/**
 * Simulate a complete turn of battle
 */
export function simulateTurn(
  playerAction: BattleAction,
  state: BattleState,
  rngMode: "random" | "worst-case" = "random",
  forcedOpponentAction?: BattleAction,
): TurnOutcome {
  // Clone state to avoid mutations
  const newState = cloneBattleState(state);
  const risks: Risk[] = [];

  // Determine opponent action using AI unless forced
  const opponentAction = forcedOpponentAction
    ? forcedOpponentAction
    : calculateAIDecision(
        newState.opponentActive,
        newState.playerActive,
        newState.opponentTeam,
        newState,
      ).action;

  // Determine move order
  let playerMove: Move | "switch" = "switch";
  let opponentMove: Move | "switch" = "switch";

  if (playerAction.type === "move") {
    playerMove = newState.playerActive.moves[playerAction.moveIndex];
  }

  if (opponentAction.type === "move") {
    opponentMove = newState.opponentActive.moves[opponentAction.moveIndex];
  }

  const playerSpeed = Math.floor(
    getEffectiveStat(
      newState.playerActive.stats.spe,
      newState.playerActive.statModifiers.spe,
    ) *
      getItemStatMultiplier(getItem(newState.playerActive.item), "spe") *
      getWeatherSpeedMultiplier(newState.playerActive, newState.weather) *
      getTerrainSpeedMultiplier(newState.playerActive, newState.terrain),
  );
  const opponentSpeed = Math.floor(
    getEffectiveStat(
      newState.opponentActive.stats.spe,
      newState.opponentActive.statModifiers.spe,
    ) *
      getItemStatMultiplier(getItem(newState.opponentActive.item), "spe") *
      getWeatherSpeedMultiplier(newState.opponentActive, newState.weather) *
      getTerrainSpeedMultiplier(newState.opponentActive, newState.terrain),
  );

  const firstMover = determineFirstMover(
    playerMove,
    opponentMove,
    playerSpeed,
    opponentSpeed,
    newState,
  );

  let playerFainted = false;
  let opponentFainted = false;
  let playerDamageDealt;
  let opponentDamageDealt;

  // Execute moves in order
  let playerFlinched = false;
  let opponentFlinched = false;
  let playerHasMoved = false;
  let opponentHasMoved = false;

  const executeAction = (
    action: BattleAction,
    attacker: PokemonInstance,
    defender: PokemonInstance,
    isPlayer: boolean,
  ) => {
    const attackerFlinched = isPlayer ? playerFlinched : opponentFlinched;

    if (attackerFlinched || !canActFromStatus(attacker, rngMode, isPlayer)) {
      if (isPlayer) {
        playerFlinched = false;
        playerHasMoved = true;
      } else {
        opponentFlinched = false;
        opponentHasMoved = true;
      }
      return;
    }

    if (action.type === "switch") {
      const hazards = isPlayer
        ? newState.playerHazards
        : newState.opponentHazards;
      const team = isPlayer ? newState.playerTeam : newState.opponentTeam;
      const switchResult = processSwitch(action, team, hazards, isPlayer);

      if (isPlayer) {
        newState.playerActive = switchResult.newActive;
        playerHasMoved = true;
      } else {
        newState.opponentActive = switchResult.newActive;
        opponentHasMoved = true;
      }
    } else if (action.type === "move") {
      const move = attacker.moves[action.moveIndex];
      const moveResult =
        rngMode === "worst-case"
          ? resolveMoveWorstCase(move, attacker, defender, newState, isPlayer)
          : processMove(move, attacker, defender, newState);

      defender.currentHp = Math.max(0, defender.currentHp - moveResult.damage);
      attacker.currentHp = Math.max(
        0,
        attacker.currentHp - moveResult.attackerRecoil,
      );

      // Only track risks for PLAYER actions, not opponent actions
      // (opponent missing is good for us, not a risk!)
      if (isPlayer && rngMode === "random") {
        risks.push(...moveResult.risks);
      }

      if (isPlayer) {
        playerDamageDealt = calculateFullDamage(
          move,
          attacker,
          defender,
          newState,
        );
      } else {
        opponentDamageDealt = calculateFullDamage(
          move,
          attacker,
          defender,
          newState,
        );
      }

      if (moveResult.defenderFainted) {
        if (isPlayer) {
          opponentFainted = true;
        } else {
          playerFainted = true;
        }
      }

      // Decrement PP
      if (attacker.currentPP[action.moveIndex] > 0) {
        attacker.currentPP[action.moveIndex]--;
      }

      // Apply weather-setting effects
      if (move.weatherEffect) {
        newState.weather = move.weatherEffect;
        newState.weatherTurns = 5; // Standard weather duration
      }

      // Apply terrain-setting effects
      if (move.terrainEffect) {
        newState.terrain = move.terrainEffect;
        newState.terrainTurns = 5; // Standard terrain duration
      }

      if (moveResult.moveHit) {
        applyHazardMoveEffects(move, newState, isPlayer);

        const canFlinch = isPlayer ? !opponentHasMoved : !playerHasMoved;
        const secondaryResult = applySecondaryEffects(
          move,
          attacker,
          defender,
          rngMode,
          isPlayer,
          canFlinch,
        );

        if (secondaryResult.flinched) {
          if (isPlayer) {
            opponentFlinched = true;
          } else {
            playerFlinched = true;
          }
        }
      }

      if (isPlayer) {
        playerHasMoved = true;
      } else {
        opponentHasMoved = true;
      }
    }
  };

  // First mover acts
  if (firstMover === "player") {
    executeAction(
      playerAction,
      newState.playerActive,
      newState.opponentActive,
      true,
    );

    // Second mover acts if still alive
    if (!opponentFainted && newState.opponentActive.currentHp > 0) {
      executeAction(
        opponentAction,
        newState.opponentActive,
        newState.playerActive,
        false,
      );
    }
  } else {
    executeAction(
      opponentAction,
      newState.opponentActive,
      newState.playerActive,
      false,
    );

    // Player acts if still alive
    if (!playerFainted && newState.playerActive.currentHp > 0) {
      executeAction(
        playerAction,
        newState.playerActive,
        newState.opponentActive,
        true,
      );
    }
  }

  // CRITICAL FIX: Sync active Pokemon back to team arrays
  // After cloning, active Pokemon are separate objects from team array entries
  // We need to update the team arrays with the modified active Pokemon
  const playerActiveIndex = newState.playerTeam.findIndex(
    (p) => p.species === newState.playerActive.species,
  );
  if (playerActiveIndex !== -1) {
    newState.playerTeam[playerActiveIndex] = newState.playerActive;
  }

  const opponentActiveIndex = newState.opponentTeam.findIndex(
    (p) => p.species === newState.opponentActive.species,
  );
  if (opponentActiveIndex !== -1) {
    newState.opponentTeam[opponentActiveIndex] = newState.opponentActive;
  }

  // Update field effects (decrement turn counters)
  if (newState.weather !== "clear" && newState.weatherTurns > 0) {
    newState.weatherTurns--;
    if (newState.weatherTurns === 0) {
      newState.weather = "clear";
    }
  }

  // Apply end-of-turn weather effects (damage/healing)
  if (newState.weather !== "clear") {
    // Player takes weather damage/healing
    if (newState.playerActive.currentHp > 0) {
      const weatherDamage = calculateWeatherDamage(
        newState.playerActive,
        newState.weather,
      );
      const weatherHealing = calculateWeatherHealing(
        newState.playerActive,
        newState.weather,
      );

      if (weatherDamage > 0) {
        newState.playerActive.currentHp = Math.max(
          0,
          newState.playerActive.currentHp - weatherDamage,
        );
        if (newState.playerActive.currentHp === 0) {
          playerFainted = true;
        }
      } else if (weatherHealing > 0) {
        newState.playerActive.currentHp = Math.min(
          newState.playerActive.stats.hp,
          newState.playerActive.currentHp + weatherHealing,
        );
      }

      // Sync back to team
      const playerActiveIndex = newState.playerTeam.findIndex(
        (p) => p.species === newState.playerActive.species,
      );
      if (playerActiveIndex !== -1) {
        newState.playerTeam[playerActiveIndex] = newState.playerActive;
      }
    }

    // Opponent takes weather damage/healing
    if (newState.opponentActive.currentHp > 0) {
      const weatherDamage = calculateWeatherDamage(
        newState.opponentActive,
        newState.weather,
      );
      const weatherHealing = calculateWeatherHealing(
        newState.opponentActive,
        newState.weather,
      );

      if (weatherDamage > 0) {
        newState.opponentActive.currentHp = Math.max(
          0,
          newState.opponentActive.currentHp - weatherDamage,
        );
        if (newState.opponentActive.currentHp === 0) {
          opponentFainted = true;
        }
      } else if (weatherHealing > 0) {
        newState.opponentActive.currentHp = Math.min(
          newState.opponentActive.stats.hp,
          newState.opponentActive.currentHp + weatherHealing,
        );
      }

      // Sync back to team
      const opponentActiveIndex = newState.opponentTeam.findIndex(
        (p) => p.species === newState.opponentActive.species,
      );
      if (opponentActiveIndex !== -1) {
        newState.opponentTeam[opponentActiveIndex] = newState.opponentActive;
      }
    }
  }

  if (rngMode === "worst-case") {
    const playerStatusDamage = applyEndOfTurnStatusDamage(
      newState.playerActive,
      rngMode,
    );
    if (playerStatusDamage > 0) {
      newState.playerActive.currentHp = Math.max(
        0,
        newState.playerActive.currentHp - playerStatusDamage,
      );
      if (newState.playerActive.currentHp === 0) {
        playerFainted = true;
      }
    }

    const opponentStatusDamage = applyEndOfTurnStatusDamage(
      newState.opponentActive,
      rngMode,
    );
    if (opponentStatusDamage > 0) {
      newState.opponentActive.currentHp = Math.max(
        0,
        newState.opponentActive.currentHp - opponentStatusDamage,
      );
      if (newState.opponentActive.currentHp === 0) {
        opponentFainted = true;
      }
    }
  }

  if (newState.terrain !== "none" && newState.terrainTurns > 0) {
    newState.terrainTurns--;
    if (newState.terrainTurns === 0) {
      newState.terrain = "none";
    }
  }

  // Apply end-of-turn terrain effects (healing)
  if (newState.terrain !== "none") {
    // Player terrain healing (Grassy Terrain)
    if (newState.playerActive.currentHp > 0) {
      const terrainHealing = calculateTerrainHealing(
        newState.playerActive,
        newState.terrain,
      );

      if (terrainHealing > 0) {
        newState.playerActive.currentHp = Math.min(
          newState.playerActive.stats.hp,
          newState.playerActive.currentHp + terrainHealing,
        );

        // Sync back to team
        const playerActiveIndex = newState.playerTeam.findIndex(
          (p) => p.species === newState.playerActive.species,
        );
        if (playerActiveIndex !== -1) {
          newState.playerTeam[playerActiveIndex] = newState.playerActive;
        }
      }
    }

    // Opponent terrain healing
    if (newState.opponentActive.currentHp > 0) {
      const terrainHealing = calculateTerrainHealing(
        newState.opponentActive,
        newState.terrain,
      );

      if (terrainHealing > 0) {
        newState.opponentActive.currentHp = Math.min(
          newState.opponentActive.stats.hp,
          newState.opponentActive.currentHp + terrainHealing,
        );

        // Sync back to team
        const opponentActiveIndex = newState.opponentTeam.findIndex(
          (p) => p.species === newState.opponentActive.species,
        );
        if (opponentActiveIndex !== -1) {
          newState.opponentTeam[opponentActiveIndex] = newState.opponentActive;
        }
      }
    }
  }

  if (newState.trickRoom > 0) newState.trickRoom--;
  if (newState.playerScreens.reflect > 0) newState.playerScreens.reflect--;
  if (newState.playerScreens.lightScreen > 0)
    newState.playerScreens.lightScreen--;
  if (newState.playerScreens.auroraVeil > 0)
    newState.playerScreens.auroraVeil--;
  if (newState.opponentScreens.reflect > 0) newState.opponentScreens.reflect--;
  if (newState.opponentScreens.lightScreen > 0)
    newState.opponentScreens.lightScreen--;
  if (newState.opponentScreens.auroraVeil > 0)
    newState.opponentScreens.auroraVeil--;

  newState.turn++;

  return {
    turnNumber: state.turn,
    playerAction,
    opponentAction,
    firstMover,
    playerDamageDealt,
    opponentDamageDealt,
    playerFainted,
    opponentFainted,
    resultingState: newState,
    risksInvolved: risks,
  };
}

/**
 * Check if battle is over
 */
export function isBattleOver(state: BattleState): {
  isOver: boolean;
  winner?: "player" | "opponent";
} {
  const playerAlive = state.playerTeam.some((p) => p.currentHp > 0);
  const opponentAlive = state.opponentTeam.some((p) => p.currentHp > 0);

  if (!playerAlive) {
    return { isOver: true, winner: "opponent" };
  }

  if (!opponentAlive) {
    return { isOver: true, winner: "player" };
  }

  return { isOver: false };
}
