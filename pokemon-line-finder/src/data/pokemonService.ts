/**
 * Unified Pokemon Data Service
 *
 * Combines data from PokeAPI and Run & Bun Dex to provide complete Pokemon data
 * Handles creation of PokemonInstance objects with the correct stats and moves
 */

import { PokemonInstance, Move, Stats, PokemonType } from "../types";
import { fetchPokemon, fetchMove, PokemonData, MoveData } from "./pokeapi";
import {
  getRunBunModifications,
  applyStatModifications,
  applyTypeModifications,
  applyAbilityModifications,
  applyMovePoolModifications,
} from "./runbun";
import { NATURES } from "./constants";
import { calculateStats } from "../engine/damage";
import { createInitialStatModifiers } from "../engine/battle";
import { buildMove, normalizeMoveData } from "./normalize";

// ============================================================================
// Types
// ============================================================================

export interface CompletePokemonData {
  id: number;
  species: string;
  displayName: string;
  baseStats: Stats; // Already includes Run & Bun modifications
  types: PokemonType[];
  abilities: string[];
  learnset: string[];
  sprite: string;
  isModified: boolean; // Whether this Pokemon is modified in Run & Bun
  modifications?: string; // Notes about modifications
}

export interface PokemonCreationOptions {
  species: string;
  level: number;
  moves: string[]; // Move names
  ability?: string;
  item?: string;
  nature?: string;
  ivs?: Partial<Stats>;
  evs?: Partial<Stats>;
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Get complete Pokemon data, combining PokeAPI and Run & Bun modifications
 */
export async function getCompletePokemonData(
  species: string,
): Promise<CompletePokemonData> {
  // Fetch base data from PokeAPI
  const baseData: PokemonData = await fetchPokemon(species);

  // Check for Run & Bun modifications
  const runBunMods = getRunBunModifications(species);
  const isModified = runBunMods !== null;

  // Apply modifications
  const finalStats = applyStatModifications(species, baseData.baseStats);
  const finalTypes = applyTypeModifications(species, baseData.types);
  const finalAbilities = applyAbilityModifications(species, baseData.abilities);
  const finalLearnset = applyMovePoolModifications(species, baseData.learnset);

  return {
    id: baseData.id,
    species: baseData.name,
    displayName: baseData.displayName,
    baseStats: finalStats,
    types: finalTypes,
    abilities: finalAbilities,
    learnset: finalLearnset,
    sprite: baseData.sprite,
    isModified,
    modifications: runBunMods?.notes,
  };
}

/**
 * Create a fully configured PokemonInstance
 */
export async function createPokemonInstance(
  options: PokemonCreationOptions,
): Promise<PokemonInstance> {
  // Get complete Pokemon data
  const pokemonData = await getCompletePokemonData(options.species);

  // Validate moves
  const requestedMoves = options.moves.slice(0, 4); // Max 4 moves
  const validMoves = requestedMoves.filter((moveName) =>
    pokemonData.learnset.includes(moveName.toLowerCase().replace(/\s+/g, "-")),
  );

  if (validMoves.length !== requestedMoves.length) {
    const invalid = requestedMoves.filter((m) => !validMoves.includes(m));
    console.warn(
      `Pokemon ${options.species} cannot learn: ${invalid.join(", ")}`,
    );
  }

  // Fetch move data
  const movesData: Move[] = await Promise.all(
    validMoves.map(async (moveName) => {
      try {
        const moveData: MoveData = await fetchMove(moveName);
        const moveSpec = normalizeMoveData(moveData);
        return buildMove(moveSpec);
      } catch (error) {
        console.error(`Error loading move ${moveName}:`, error);
        // Return a basic placeholder move if fetch fails
        return buildMove({
          name: moveName,
          type: "Normal" as PokemonType,
          category: "physical",
          power: 50,
          accuracy: 100,
          pp: 20,
          priority: 0,
          critChance: "normal",
        });
      }
    }),
  );

  // Set up IVs and EVs
  const ivs: Stats = {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
    ...options.ivs,
  };

  const evs: Stats = {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    ...options.evs,
  };

  // Get nature
  const natureName = options.nature || "Hardy";
  const nature = NATURES[natureName] || NATURES.Hardy;

  // Calculate final stats
  const stats = calculateStats(
    pokemonData.baseStats,
    options.level,
    ivs,
    evs,
    nature,
  );

  // Ensure types array has 1 or 2 elements
  const types: [PokemonType] | [PokemonType, PokemonType] =
    pokemonData.types.length >= 2
      ? [pokemonData.types[0], pokemonData.types[1]]
      : [pokemonData.types[0]];

  // Create Pokemon instance
  const pokemon: PokemonInstance = {
    species: pokemonData.displayName,
    level: options.level,
    baseStats: pokemonData.baseStats,
    ivs,
    evs,
    nature,
    stats,
    ability: options.ability || pokemonData.abilities[0] || "Unknown",
    item: options.item,
    moves: movesData,
    types,
    currentHp: stats.hp,
    currentPP: movesData.map((m) => m.pp),
    status: "healthy",
    statModifiers: createInitialStatModifiers(),
    canDie: false, // Nuzlocke mode default
  };

  return pokemon;
}

/**
 * Convert MoveData from PokeAPI to our Move type
 */

/**
 * Create multiple Pokemon instances in parallel
 */
export async function createMultiplePokemon(
  optionsArray: PokemonCreationOptions[],
): Promise<PokemonInstance[]> {
  const promises = optionsArray.map((opts) => createPokemonInstance(opts));
  return Promise.all(promises);
}

/**
 * Get suggested moves for a Pokemon (top learnable moves)
 */
export async function getSuggestedMoves(
  species: string,
  count: number = 4,
): Promise<string[]> {
  const data = await getCompletePokemonData(species);

  // For now, return first N moves from learnset
  // TODO: Implement smart move suggestion based on Pokemon's stats
  return data.learnset.slice(0, count);
}

/**
 * Validate if a Pokemon can learn a set of moves
 */
export async function canLearnMoves(
  species: string,
  moves: string[],
): Promise<{ valid: boolean; invalidMoves: string[] }> {
  const data = await getCompletePokemonData(species);
  const normalizedLearnset = data.learnset.map((m) => m.toLowerCase());

  const invalidMoves: string[] = [];

  for (const move of moves) {
    const normalized = move.toLowerCase().replace(/\s+/g, "-");
    if (!normalizedLearnset.includes(normalized)) {
      invalidMoves.push(move);
    }
  }

  return {
    valid: invalidMoves.length === 0,
    invalidMoves,
  };
}

/**
 * Get Pokemon data for display (without creating instance)
 */
export async function getPokemonInfo(
  species: string,
): Promise<CompletePokemonData> {
  return getCompletePokemonData(species);
}
