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
  SecondaryEffect,
} from "../types";

import {
  calculateDamage,
  calculateFullDamage,
  determineFirstMover,
  getEffectiveStat,
} from "./damage";

import { calculateAIDecision } from "./ai";

import {
  getItem,
  getItemStatMultiplier,
  getLifeOrbRecoil,
} from "../data/items";
import { canBeStatChanged } from "../data/abilities";

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

interface MoveOverride {
  hit?: boolean;
  crit?: boolean;
  damageRoll?: number; // 85-100
  secondaryApplies?: boolean;
  hits?: number;
}

interface TurnOverrides {
  speedTieWinner?: "player" | "opponent";
  playerMove?: MoveOverride;
  opponentMove?: MoveOverride;
}

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
    applyStatus(pokemon, hazardResult.toxicSpikesEffect, "random", false);
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

  if (targetMon.status === "badly-poison") {
    targetMon.toxicCounter = 1;
  }

  return { newActive: targetMon, switchDamage };
}

function resolveItemActionDefaults(
  action: Extract<BattleAction, { type: "item" }>,
): Required<
  Pick<
    Extract<BattleAction, { type: "item" }>,
    "effect" | "value" | "stat" | "stages"
  >
> {
  if (action.effect) {
    return {
      effect: action.effect,
      value: action.value ?? 0,
      stat: action.stat ?? "atk",
      stages: action.stages ?? 2,
    };
  }

  const name = action.itemName.toLowerCase();
  if (name.includes("x attack")) {
    return { effect: "stat-boost", value: 0, stat: "atk", stages: 2 };
  }
  if (name.includes("x defend")) {
    return { effect: "stat-boost", value: 0, stat: "def", stages: 2 };
  }
  if (name.includes("x sp. atk") || name.includes("x special")) {
    return { effect: "stat-boost", value: 0, stat: "spa", stages: 2 };
  }
  if (name.includes("x sp. def")) {
    return { effect: "stat-boost", value: 0, stat: "spd", stages: 2 };
  }
  if (name.includes("x speed")) {
    return { effect: "stat-boost", value: 0, stat: "spe", stages: 2 };
  }

  if (name.includes("max potion")) {
    return { effect: "heal", value: 9999, stat: "atk", stages: 0 };
  }
  if (name.includes("hyper potion")) {
    return { effect: "heal", value: 200, stat: "atk", stages: 0 };
  }
  if (name.includes("super potion")) {
    return { effect: "heal", value: 60, stat: "atk", stages: 0 };
  }
  if (name.includes("potion")) {
    return { effect: "heal", value: 20, stat: "atk", stages: 0 };
  }
  if (name.includes("full restore")) {
    return { effect: "status-cure", value: 9999, stat: "atk", stages: 0 };
  }

  return { effect: "heal", value: 20, stat: "atk", stages: 0 };
}

function processItemAction(
  action: Extract<BattleAction, { type: "item" }>,
  team: PokemonInstance[],
  active: PokemonInstance,
): void {
  const { effect, value, stat, stages } = resolveItemActionDefaults(action);
  const targetIndex = action.targetIndex ?? team.findIndex((p) => p === active);
  const target = targetIndex >= 0 ? team[targetIndex] : active;

  if (effect === "heal") {
    const healAmount = value === 9999 ? target.stats.hp : value;
    target.currentHp = Math.min(target.stats.hp, target.currentHp + healAmount);
    return;
  }

  if (effect === "status-cure") {
    target.status = "healthy";
    target.sleepTurnsRemaining = 0;
    target.toxicCounter = 0;
    if (value === 9999) {
      target.currentHp = target.stats.hp;
    }
    return;
  }

  if (effect === "stat-boost") {
    target.statModifiers[stat] = clampStatStage(
      target.statModifiers[stat] + stages,
    );
  }
}

function applySwitchInAbility(
  entrant: PokemonInstance,
  opponent: PokemonInstance,
): void {
  if (entrant.ability === "Intimidate") {
    applyStatChanges(opponent, { atk: -1 });
  }
}

/**
 * Process a move action and calculate damage and effects
 */
function processMove(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  battleState: BattleState,
  override?: MoveOverride,
): {
  damage: number;
  defenderFainted: boolean;
  attackerRecoil: number;
  risks: Risk[];
  moveHit: boolean;
} {
  const damageCalc = calculateFullDamage(move, attacker, defender, battleState);
  const risks: Risk[] = [];

  if (defender.isSemiInvulnerable) {
    return {
      damage: 0,
      defenderFainted: false,
      attackerRecoil: 0,
      risks: [],
      moveHit: false,
    };
  }

  // Roll for accuracy
  const accuracyRoll = Math.random() * 100;
  const moveHits =
    override?.hit !== undefined
      ? override.hit
      : accuracyRoll < damageCalc.accuracy;

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

  const hits =
    override?.hits !== undefined
      ? override.hits
      : getHitCount(move, "random", true);
  let totalDamage = 0;

  for (let hit = 0; hit < hits; hit++) {
    const randomRoll =
      override?.damageRoll !== undefined
        ? override.damageRoll
        : DAMAGE_RANDOM_MIN +
          Math.floor(
            Math.random() * (DAMAGE_RANDOM_MAX - DAMAGE_RANDOM_MIN + 1),
          );
    const critRoll = Math.random() * 100;
    const isCrit =
      override?.crit !== undefined
        ? override.crit
        : critRoll < damageCalc.critChance;

    const hitDamage = calculateDamage(move, attacker, defender, battleState, {
      isCrit,
      randomRoll,
    });

    totalDamage += hitDamage;

    if (totalDamage >= defender.currentHp) {
      break;
    }
  }

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

  const defenderFainted = totalDamage >= defender.currentHp;

  // Recoil
  let attackerRecoil = 0;
  if (damageCalc.recoilDamage) {
    attackerRecoil = Math.floor(totalDamage * ((move.recoil || 0) / 100));
  }

  return {
    damage: totalDamage,
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
    const statKey = key as keyof PokemonInstance["stats"];
    if (
      amount < 0 &&
      (statKey === "atk" ||
        statKey === "def" ||
        statKey === "spa" ||
        statKey === "spd" ||
        statKey === "spe") &&
      !canBeStatChanged(target, statKey)
    ) {
      return;
    }
    target.statModifiers[key] = clampStatStage(
      target.statModifiers[key] + amount,
    );
  });
}

function getSleepDuration(
  rngMode: "random" | "worst-case",
  isPlayer: boolean,
): number {
  if (rngMode === "random") {
    return 1 + Math.floor(Math.random() * 3);
  }

  return isPlayer ? 3 : 1;
}

function clearStatus(target: PokemonInstance): void {
  target.status = "healthy";
  target.sleepTurnsRemaining = 0;
  target.toxicCounter = 0;
}

function applyStatus(
  target: PokemonInstance,
  status: PokemonInstance["status"],
  rngMode: "random" | "worst-case" = "random",
  isPlayer: boolean = false,
): void {
  if (target.status !== "healthy") {
    return;
  }

  target.status = status;

  if (status === "sleep") {
    target.sleepTurnsRemaining = getSleepDuration(rngMode, isPlayer);
  } else if (status === "badly-poison") {
    target.toxicCounter = 1;
  }
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
  forcedApply?: boolean,
): { flinched: boolean } {
  let flinched = false;

  const effects: SecondaryEffect[] = [];

  if (move.secondaryEffects && move.secondaryEffects.length > 0) {
    effects.push(...move.secondaryEffects);
  } else {
    if (move.statChanges && move.statChanges.length > 0) {
      move.statChanges.forEach((change) => {
        Object.entries(change.stats).forEach(([stat, amount]) => {
          if (amount === undefined) {
            return;
          }
          effects.push({
            type: "stat",
            stat: stat as keyof StatModifiers,
            stage: amount,
            chance: change.chance,
            target: change.target,
          });
        });
      });
    }

    if (move.statusChance) {
      effects.push({
        type: "status",
        status: move.statusChance.status,
        chance: move.statusChance.chance,
        target: "opponent",
      });
    }

    if (move.flinchChance) {
      effects.push({
        type: "flinch",
        chance: move.flinchChance,
      });
    }
  }

  effects.forEach((effect) => {
    if (forcedApply !== undefined) {
      if (!forcedApply) {
        return;
      }
    } else if (!shouldApplySecondary(effect.chance, rngMode, isPlayer)) {
      return;
    }

    if (effect.type === "stat") {
      const target = effect.target === "user" ? attacker : defender;
      applyStatChanges(target, { [effect.stat]: effect.stage });
      return;
    }

    if (effect.type === "status") {
      const target = effect.target === "user" ? attacker : defender;
      const targetIsPlayer = effect.target === "user" ? isPlayer : !isPlayer;
      applyStatus(target, effect.status, rngMode, targetIsPlayer);
      return;
    }

    if (effect.type === "flinch" && canFlinch) {
      flinched = true;
    }
  });

  return { flinched };
}

function canActFromStatus(
  pokemon: PokemonInstance,
  rngMode: "random" | "worst-case",
  isPlayer: boolean,
): boolean {
  if (pokemon.status === "sleep") {
    if (!pokemon.sleepTurnsRemaining || pokemon.sleepTurnsRemaining < 1) {
      pokemon.sleepTurnsRemaining = getSleepDuration(rngMode, isPlayer);
    }

    if (pokemon.sleepTurnsRemaining > 1) {
      pokemon.sleepTurnsRemaining -= 1;
      return false;
    }

    pokemon.sleepTurnsRemaining = 0;
    pokemon.status = "healthy";
    return true;
  }

  if (pokemon.status === "freeze") {
    if (rngMode === "random") {
      if (Math.random() < 0.2) {
        clearStatus(pokemon);
        return true;
      }
      return false;
    }

    if (isPlayer) {
      return false;
    }

    clearStatus(pokemon);
    return true;
  }

  if (pokemon.status === "paralysis") {
    if (rngMode === "random") {
      return Math.random() >= 0.25;
    }

    return !isPlayer;
  }

  return true;
}

function applyEndOfTurnStatusDamage(pokemon: PokemonInstance): number {
  if (pokemon.currentHp <= 0) {
    return 0;
  }

  if (pokemon.status === "burn") {
    return Math.max(1, Math.floor(pokemon.stats.hp / 16));
  }

  if (pokemon.status === "poison") {
    return Math.max(1, Math.floor(pokemon.stats.hp / 8));
  }

  if (pokemon.status === "badly-poison") {
    const counter =
      pokemon.toxicCounter && pokemon.toxicCounter > 0
        ? pokemon.toxicCounter
        : 1;
    const damage = Math.max(1, Math.floor((pokemon.stats.hp * counter) / 16));
    pokemon.toxicCounter = Math.min(counter + 1, 15);
    return damage;
  }

  return 0;
}

function getStatusSpeedMultiplier(pokemon: PokemonInstance): number {
  if (pokemon.status === "paralysis") {
    return 0.5;
  }

  return 1;
}

function getHitCount(
  move: Move,
  rngMode: "random" | "worst-case",
  isPlayer: boolean,
): number {
  if (!move.hits) {
    return 1;
  }

  if (typeof move.hits === "number") {
    return move.hits;
  }

  const [minHits, maxHits] = move.hits;
  if (rngMode === "random") {
    return minHits + Math.floor(Math.random() * (maxHits - minHits + 1));
  }

  return isPlayer ? minHits : maxHits;
}

function applyEndOfTurnItemEffects(
  pokemon: PokemonInstance,
  rngMode: "random" | "worst-case",
  isPlayer: boolean,
): void {
  if (pokemon.currentHp <= 0) {
    return;
  }

  const item = getItem(pokemon.item);
  if (!item) {
    return;
  }

  const hpPercent = (pokemon.currentHp / pokemon.stats.hp) * 100;

  if (item.effect === "berry-heal" && item.hpThreshold !== undefined) {
    if (hpPercent <= item.hpThreshold) {
      if (item.healPercent !== undefined) {
        const heal = Math.floor((pokemon.stats.hp * item.healPercent) / 100);
        pokemon.currentHp = Math.min(
          pokemon.stats.hp,
          pokemon.currentHp + heal,
        );
      } else if (item.healAmount !== undefined) {
        pokemon.currentHp = Math.min(
          pokemon.stats.hp,
          pokemon.currentHp + item.healAmount,
        );
      }

      pokemon.item = undefined;
      return;
    }
  }

  if (item.effect === "status-heal" && item.curesStatusOnTurnEnd) {
    if (pokemon.status !== "healthy") {
      clearStatus(pokemon);
      pokemon.item = undefined;
      return;
    }
  }

  if (item.effect === "end-turn-status" && item.statusOnTurnEnd) {
    if (pokemon.status === "healthy") {
      applyStatus(pokemon, item.statusOnTurnEnd, rngMode, isPlayer);
    }
    return;
  }

  if (item.effect === "end-turn-heal") {
    if (
      item.endTurnHealIfType &&
      !pokemon.types.includes(
        item.endTurnHealIfType as PokemonInstance["types"][number],
      )
    ) {
      if (item.endTurnDamagePercent) {
        const damage = Math.floor(
          (pokemon.stats.hp * item.endTurnDamagePercent) / 100,
        );
        pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
      }
      return;
    }

    if (item.endTurnHealPercent) {
      const heal = Math.floor(
        (pokemon.stats.hp * item.endTurnHealPercent) / 100,
      );
      pokemon.currentHp = Math.min(pokemon.stats.hp, pokemon.currentHp + heal);
    }
  }
}

function normalizeActionForState(
  action: BattleAction,
  pokemon: PokemonInstance,
): BattleAction {
  if (pokemon.rechargeTurns && pokemon.rechargeTurns > 0) {
    return { type: "recharge" };
  }

  if (pokemon.chargingMove) {
    return {
      type: "move",
      moveIndex: pokemon.chargingMove.moveIndex,
      moveName: pokemon.chargingMove.moveName,
    };
  }

  if (
    pokemon.lockedMoveIndex !== undefined &&
    action.type === "move" &&
    action.moveIndex !== pokemon.lockedMoveIndex
  ) {
    return {
      type: "move",
      moveIndex: pokemon.lockedMoveIndex,
      moveName: pokemon.moves[pokemon.lockedMoveIndex]?.name ?? "Locked Move",
    };
  }

  return action;
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

  if (defender.isSemiInvulnerable) {
    return {
      damage: 0,
      defenderFainted: false,
      attackerRecoil: 0,
      risks: [],
      moveHit: false,
    };
  }

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

  const hits = getHitCount(move, "worst-case", isPlayer);
  let totalDamage = 0;

  for (let hit = 0; hit < hits; hit++) {
    const isCrit = isPlayer ? false : damageCalc.critChance > 0;
    const randomRoll = isPlayer ? DAMAGE_RANDOM_MIN : DAMAGE_RANDOM_MAX;
    const hitDamage = calculateDamage(move, attacker, defender, battleState, {
      isCrit,
      randomRoll,
    });
    totalDamage += hitDamage;

    if (totalDamage >= defender.currentHp) {
      break;
    }
  }

  const defenderFainted = totalDamage >= defender.currentHp;

  let attackerRecoil = 0;
  if (damageCalc.recoilDamage) {
    attackerRecoil = Math.floor(totalDamage * ((move.recoil || 0) / 100));
  }

  return {
    damage: totalDamage,
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
  overrides?: TurnOverrides,
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
        rngMode,
      ).action;

  const normalizedPlayerAction = normalizeActionForState(
    playerAction,
    newState.playerActive,
  );
  const normalizedOpponentAction = normalizeActionForState(
    opponentAction,
    newState.opponentActive,
  );

  // Determine move order
  let playerMove: Move | "switch" = "switch";
  let opponentMove: Move | "switch" = "switch";
  const rechargePlaceholder: Move = {
    name: "Recharge",
    type: "Normal",
    category: "status",
    power: 0,
    accuracy: 100,
    pp: 1,
    priority: 0,
    critChance: "normal",
  };

  if (normalizedPlayerAction.type === "move") {
    playerMove = newState.playerActive.moves[normalizedPlayerAction.moveIndex];
  } else if (normalizedPlayerAction.type === "recharge") {
    playerMove = rechargePlaceholder;
  }

  if (normalizedOpponentAction.type === "move") {
    opponentMove =
      newState.opponentActive.moves[normalizedOpponentAction.moveIndex];
  } else if (normalizedOpponentAction.type === "recharge") {
    opponentMove = rechargePlaceholder;
  }

  const playerSpeed = Math.floor(
    getEffectiveStat(
      newState.playerActive.stats.spe,
      newState.playerActive.statModifiers.spe,
    ) *
      getItemStatMultiplier(getItem(newState.playerActive.item), "spe") *
      getWeatherSpeedMultiplier(newState.playerActive, newState.weather) *
      getTerrainSpeedMultiplier(newState.playerActive, newState.terrain) *
      getStatusSpeedMultiplier(newState.playerActive),
  );
  const opponentSpeed = Math.floor(
    getEffectiveStat(
      newState.opponentActive.stats.spe,
      newState.opponentActive.statModifiers.spe,
    ) *
      getItemStatMultiplier(getItem(newState.opponentActive.item), "spe") *
      getWeatherSpeedMultiplier(newState.opponentActive, newState.weather) *
      getTerrainSpeedMultiplier(newState.opponentActive, newState.terrain) *
      getStatusSpeedMultiplier(newState.opponentActive),
  );

  const firstMover = determineFirstMover(
    playerMove,
    opponentMove,
    playerSpeed,
    opponentSpeed,
    newState,
    rngMode,
    overrides?.speedTieWinner,
  );

  if (
    rngMode === "random" &&
    playerMove !== "switch" &&
    opponentMove !== "switch" &&
    playerMove.priority === (opponentMove as Move).priority &&
    playerSpeed === opponentSpeed
  ) {
    risks.push({
      type: "speed-tie",
      description: "Speed tie could go against the player",
      probability: 50,
      impact: "moderate",
    });
  }

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
    const moveOverride = isPlayer
      ? overrides?.playerMove
      : overrides?.opponentMove;
    const attackerFlinched = isPlayer ? playerFlinched : opponentFlinched;

    if (action.type === "recharge") {
      attacker.rechargeTurns = Math.max(0, (attacker.rechargeTurns || 0) - 1);
      attacker.lockedMoveReason = undefined;
      attacker.lockedMoveIndex = undefined;
      if (isPlayer) {
        playerHasMoved = true;
      } else {
        opponentHasMoved = true;
      }
      return;
    }

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
      attacker.lockedMoveIndex = undefined;
      attacker.lockedMoveReason = undefined;
      const hazards = isPlayer
        ? newState.playerHazards
        : newState.opponentHazards;
      const team = isPlayer ? newState.playerTeam : newState.opponentTeam;
      const switchResult = processSwitch(action, team, hazards, isPlayer);

      if (isPlayer) {
        newState.playerActive = switchResult.newActive;
        applySwitchInAbility(newState.playerActive, newState.opponentActive);
        playerHasMoved = true;
      } else {
        newState.opponentActive = switchResult.newActive;
        applySwitchInAbility(newState.opponentActive, newState.playerActive);
        opponentHasMoved = true;
      }
    } else if (action.type === "item") {
      const team = isPlayer ? newState.playerTeam : newState.opponentTeam;
      const active = isPlayer ? newState.playerActive : newState.opponentActive;
      processItemAction(action, team, active);
      if (isPlayer) {
        playerHasMoved = true;
      } else {
        opponentHasMoved = true;
      }
      return;
    } else if (action.type === "move") {
      const move = attacker.moves[action.moveIndex];

      if (!attacker.chargingMove && move.multiTurn?.kind === "charge") {
        attacker.chargingMove = {
          moveIndex: action.moveIndex,
          moveName: move.name,
          kind: "charge",
          turnsRemaining: 1,
        };
        attacker.lockedMoveIndex = action.moveIndex;
        attacker.lockedMoveReason = "charge";
        if (isPlayer) {
          playerHasMoved = true;
        } else {
          opponentHasMoved = true;
        }
        return;
      }

      if (
        !attacker.chargingMove &&
        move.multiTurn?.kind === "semi-invulnerable"
      ) {
        attacker.chargingMove = {
          moveIndex: action.moveIndex,
          moveName: move.name,
          kind: "semi-invulnerable",
          turnsRemaining: 1,
        };
        attacker.isSemiInvulnerable = true;
        attacker.lockedMoveIndex = action.moveIndex;
        attacker.lockedMoveReason = "charge";
        if (isPlayer) {
          playerHasMoved = true;
        } else {
          opponentHasMoved = true;
        }
        return;
      }

      if (attacker.chargingMove) {
        if (attacker.chargingMove.kind === "semi-invulnerable") {
          attacker.isSemiInvulnerable = false;
        }
        attacker.chargingMove = undefined;
        attacker.lockedMoveIndex = undefined;
        attacker.lockedMoveReason = undefined;
      }

      const moveResult =
        rngMode === "worst-case"
          ? resolveMoveWorstCase(move, attacker, defender, newState, isPlayer)
          : processMove(move, attacker, defender, newState, moveOverride);

      defender.currentHp = Math.max(0, defender.currentHp - moveResult.damage);
      attacker.currentHp = Math.max(
        0,
        attacker.currentHp - moveResult.attackerRecoil,
      );

      const lifeOrbRecoil = getLifeOrbRecoil(getItem(attacker.item));
      if (
        moveResult.moveHit &&
        lifeOrbRecoil > 0 &&
        move.category !== "status"
      ) {
        const recoil = Math.floor((attacker.stats.hp * lifeOrbRecoil) / 100);
        attacker.currentHp = Math.max(0, attacker.currentHp - recoil);
      }

      if (
        moveResult.moveHit &&
        defender.status === "freeze" &&
        move.type === "Fire"
      ) {
        clearStatus(defender);
      }

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
          moveOverride?.secondaryApplies,
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

      if (move.multiTurn?.kind === "recharge" && moveResult.moveHit) {
        attacker.rechargeTurns = 1;
        attacker.lockedMoveIndex = action.moveIndex;
        attacker.lockedMoveReason = "recharge";
      }

      const item = getItem(attacker.item);
      if (item?.isChoiceItem && moveResult.moveHit) {
        attacker.lockedMoveIndex = action.moveIndex;
        attacker.lockedMoveReason = "choice";
      }
    }
  };

  // First mover acts
  if (firstMover === "player") {
    executeAction(
      normalizedPlayerAction,
      newState.playerActive,
      newState.opponentActive,
      true,
    );

    // Second mover acts if still alive
    if (!opponentFainted && newState.opponentActive.currentHp > 0) {
      executeAction(
        normalizedOpponentAction,
        newState.opponentActive,
        newState.playerActive,
        false,
      );
    }
  } else {
    executeAction(
      normalizedOpponentAction,
      newState.opponentActive,
      newState.playerActive,
      false,
    );

    // Player acts if still alive
    if (!playerFainted && newState.playerActive.currentHp > 0) {
      executeAction(
        normalizedPlayerAction,
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

  const playerStatusDamage = applyEndOfTurnStatusDamage(newState.playerActive);
  if (playerStatusDamage > 0) {
    newState.playerActive.currentHp = Math.max(
      0,
      newState.playerActive.currentHp - playerStatusDamage,
    );
  }

  const opponentStatusDamage = applyEndOfTurnStatusDamage(
    newState.opponentActive,
  );
  if (opponentStatusDamage > 0) {
    newState.opponentActive.currentHp = Math.max(
      0,
      newState.opponentActive.currentHp - opponentStatusDamage,
    );
  }

  applyEndOfTurnItemEffects(newState.playerActive, rngMode, true);
  applyEndOfTurnItemEffects(newState.opponentActive, rngMode, false);

  const postItemPlayerIndex = newState.playerTeam.findIndex(
    (p) => p.species === newState.playerActive.species,
  );
  if (postItemPlayerIndex !== -1) {
    newState.playerTeam[postItemPlayerIndex] = newState.playerActive;
  }

  const postItemOpponentIndex = newState.opponentTeam.findIndex(
    (p) => p.species === newState.opponentActive.species,
  );
  if (postItemOpponentIndex !== -1) {
    newState.opponentTeam[postItemOpponentIndex] = newState.opponentActive;
  }

  if (newState.playerActive.currentHp === 0) {
    playerFainted = true;
  }
  if (newState.opponentActive.currentHp === 0) {
    opponentFainted = true;
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
    playerAction: normalizedPlayerAction,
    opponentAction: normalizedOpponentAction,
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
