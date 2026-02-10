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
  let damage = 0;

  // Stealth Rock
  if (hazards.stealthRock) {
    // Calculate type effectiveness (simplified for MVP)
    // TODO: Implement proper type effectiveness for SR
    const srDamage = Math.floor(pokemon.stats.hp / 8); // 12.5% base
    damage += srDamage;
  }

  // Spikes
  if (hazards.spikes > 0 && !pokemon.types.includes("Flying")) {
    const spikesDamage = Math.floor(pokemon.stats.hp * (hazards.spikes / 8));
    damage += spikesDamage;
  }

  // Toxic Spikes (applies poison, not direct damage)
  if (
    hazards.toxicSpikes > 0 &&
    !pokemon.types.includes("Flying") &&
    !pokemon.types.includes("Poison") &&
    pokemon.status === "healthy"
  ) {
    // Apply poison or badly poison
    pokemon.status = hazards.toxicSpikes >= 2 ? "badly-poison" : "poison";
  }

  // Sticky Web (lowers speed)
  if (hazards.stickyWeb && !pokemon.types.includes("Flying")) {
    pokemon.statModifiers.spe = Math.max(-6, pokemon.statModifiers.spe - 1);
  }

  return damage;
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
    risks.push({
      type: "damage-roll",
      description: `${move.name} needs high roll to KO (${damageCalc.damageRange.koChance?.toFixed(1)}% chance)`,
      probability: 100 - (damageCalc.damageRange.koChance || 0),
      impact: "severe",
    });
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
  };
}

/**
 * Simulate a complete turn of battle
 */
export function simulateTurn(
  playerAction: BattleAction,
  state: BattleState,
): TurnOutcome {
  // Clone state to avoid mutations
  const newState = cloneBattleState(state);
  const risks: Risk[] = [];

  // Determine opponent action using AI
  const aiDecision = calculateAIDecision(
    newState.opponentActive,
    newState.playerActive,
    newState.opponentTeam,
    newState,
  );
  const opponentAction = aiDecision.action;

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
      getWeatherSpeedMultiplier(newState.playerActive, newState.weather),
  );
  const opponentSpeed = Math.floor(
    getEffectiveStat(
      newState.opponentActive.stats.spe,
      newState.opponentActive.statModifiers.spe,
    ) *
      getItemStatMultiplier(getItem(newState.opponentActive.item), "spe") *
      getWeatherSpeedMultiplier(newState.opponentActive, newState.weather),
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
  const executeAction = (
    action: BattleAction,
    attacker: PokemonInstance,
    defender: PokemonInstance,
    isPlayer: boolean,
  ) => {
    if (action.type === "switch") {
      const hazards = isPlayer
        ? newState.playerHazards
        : newState.opponentHazards;
      const team = isPlayer ? newState.playerTeam : newState.opponentTeam;
      const switchResult = processSwitch(action, team, hazards, isPlayer);

      if (isPlayer) {
        newState.playerActive = switchResult.newActive;
      } else {
        newState.opponentActive = switchResult.newActive;
      }
    } else if (action.type === "move") {
      const move = attacker.moves[action.moveIndex];
      const moveResult = processMove(move, attacker, defender, newState);

      defender.currentHp = Math.max(0, defender.currentHp - moveResult.damage);
      attacker.currentHp = Math.max(
        0,
        attacker.currentHp - moveResult.attackerRecoil,
      );

      // Only track risks for PLAYER actions, not opponent actions
      // (opponent missing is good for us, not a risk!)
      if (isPlayer) {
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

  if (newState.terrain !== "none" && newState.terrainTurns > 0) {
    newState.terrainTurns--;
    if (newState.terrainTurns === 0) {
      newState.terrain = "none";
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
