/**
 * Data normalization helpers
 * Converts raw data into internal battle-ready types
 */

import {
  Move,
  MoveCategory,
  PokemonInstance,
  PokemonType,
  Stats,
} from "../types";

import { NATURES } from "./constants";
import { calculateStats } from "../engine/damage";
import { createInitialStatModifiers } from "../engine/battle";
import type { MoveData } from "./pokeapi";

export interface MoveSpec {
  name: string;
  type?: PokemonType;
  category?: MoveCategory;
  power?: number;
  accuracy?: number;
  pp?: number;
  priority?: number;
  critChance?: "normal" | "high" | "always";
  recoil?: number;
  drain?: number;
  flinchChance?: number;
  statChanges?: Move["statChanges"];
  statusChance?: Move["statusChance"];
  secondaryEffects?: Move["secondaryEffects"];
  weatherEffect?: Move["weatherEffect"];
  terrainEffect?: Move["terrainEffect"];
  hazardEffect?: Move["hazardEffect"];
  hits?: Move["hits"];
  multiTurn?: Move["multiTurn"];
}

export interface PokemonSpec {
  species: string;
  level: number;
  baseStats?: Stats;
  types?: [PokemonType] | [PokemonType, PokemonType];
  moves: MoveSpec[];
  ability?: string;
  item?: string;
  nature?: string;
  ivs?: Partial<Stats>;
  evs?: Partial<Stats>;
  canDie?: boolean;
}

const DEFAULT_BASE_STATS: Stats = {
  hp: 100,
  atk: 80,
  def: 80,
  spa: 80,
  spd: 80,
  spe: 80,
};

const DEFAULT_IVS: Stats = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
};

const DEFAULT_EVS: Stats = {
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};

export function buildMove(spec: MoveSpec): Move {
  return {
    name: spec.name,
    type: spec.type ?? "Normal",
    category: spec.category ?? "physical",
    power: spec.power ?? 50,
    accuracy: spec.accuracy ?? 100,
    pp: spec.pp ?? 10,
    priority: spec.priority ?? 0,
    critChance: spec.critChance ?? "normal",
    recoil: spec.recoil,
    drain: spec.drain,
    flinchChance: spec.flinchChance,
    statChanges: spec.statChanges,
    statusChance: spec.statusChance,
    secondaryEffects: spec.secondaryEffects,
    weatherEffect: spec.weatherEffect,
    terrainEffect: spec.terrainEffect,
    hazardEffect: spec.hazardEffect,
    hits: spec.hits,
    multiTurn: spec.multiTurn,
  };
}

export function buildPokemon(spec: PokemonSpec): PokemonInstance {
  const baseStats = spec.baseStats ?? DEFAULT_BASE_STATS;
  const ivs: Stats = { ...DEFAULT_IVS, ...(spec.ivs ?? {}) };
  const evs: Stats = { ...DEFAULT_EVS, ...(spec.evs ?? {}) };
  const nature = NATURES[spec.nature ?? "Hardy"] || NATURES.Hardy;
  const stats = calculateStats(baseStats, spec.level, ivs, evs, nature);
  const types: [PokemonType] | [PokemonType, PokemonType] = spec.types ?? [
    "Normal",
  ];
  const moves = spec.moves.map((move) => buildMove(move));

  return {
    species: spec.species,
    level: spec.level,
    baseStats,
    ivs,
    evs,
    nature,
    stats,
    ability: spec.ability ?? "Unknown",
    item: spec.item,
    moves,
    types,
    currentHp: stats.hp,
    currentPP: moves.map((m) => m.pp),
    status: "healthy",
    sleepTurnsRemaining: 0,
    toxicCounter: 0,
    rechargeTurns: 0,
    chargingMove: undefined,
    isSemiInvulnerable: false,
    lockedMoveIndex: undefined,
    lockedMoveReason: undefined,
    lastMoveIndex: undefined,
    statModifiers: createInitialStatModifiers(),
    canDie: spec.canDie ?? true,
  };
}

export function normalizeMoveData(moveData: MoveData): MoveSpec {
  const category =
    moveData.category === "physical" ||
    moveData.category === "special" ||
    moveData.category === "status"
      ? moveData.category
      : "status";

  const power = moveData.power ?? 0;
  const accuracy = moveData.accuracy ?? 100;

  return {
    name: moveData.displayName,
    type: moveData.type,
    category,
    power,
    accuracy,
    pp: moveData.pp,
    priority: moveData.priority,
  };
}
