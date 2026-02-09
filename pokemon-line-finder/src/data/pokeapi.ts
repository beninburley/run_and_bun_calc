/**
 * Data fetching module for PokeAPI
 *
 * Fetches base Pokemon data including stats, types, abilities, and moves
 * from PokeAPI with caching to minimize network requests.
 */

import { Stats, PokemonType } from "../types";

// PokeAPI base URL
const POKEAPI_BASE = "https://pokeapi.co/api/v2";

// ============================================================================
// Types for PokeAPI responses
// ============================================================================

interface PokeAPIStat {
  base_stat: number;
  stat: {
    name: string;
  };
}

interface PokeAPIType {
  slot: number;
  type: {
    name: string;
  };
}

interface PokeAPIAbility {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
}

interface PokeAPIMove {
  move: {
    name: string;
    url: string;
  };
  version_group_details: Array<{
    level_learned_at: number;
    move_learn_method: {
      name: string;
    };
  }>;
}

interface PokeAPIPokemonResponse {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  stats: PokeAPIStat[];
  types: PokeAPIType[];
  abilities: PokeAPIAbility[];
  moves: PokeAPIMove[];
  sprites: {
    front_default: string;
  };
}

interface PokeAPIMoveResponse {
  id: number;
  name: string;
  type: {
    name: string;
  };
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  damage_class: {
    name: string; // 'physical', 'special', or 'status'
  };
  effect_entries: Array<{
    effect: string;
    short_effect: string;
  }>;
  meta: {
    crit_rate: number;
    drain: number;
    flinch_chance: number;
    stat_chance: number;
  };
}

// ============================================================================
// Parsed Data Types
// ============================================================================

export interface PokemonData {
  id: number;
  name: string;
  displayName: string; // Capitalized
  baseStats: Stats;
  types: PokemonType[];
  abilities: string[];
  learnset: string[]; // Move names this Pokemon can learn
  sprite: string;
}

export interface MoveData {
  name: string;
  displayName: string;
  type: PokemonType;
  category: "physical" | "special" | "status";
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  description: string;
  // Additional properties for special effects can be added later
}

// ============================================================================
// Caching
// ============================================================================

const pokemonCache = new Map<string, PokemonData>();
const moveCache = new Map<string, MoveData>();

/**
 * Clear all caches (useful for testing or forcing refresh)
 */
export function clearCache(): void {
  pokemonCache.clear();
  moveCache.clear();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize Pokemon/move names for consistent lookups
 * Examples: "charizard" -> "charizard", "Mr. Mime" -> "mr-mime"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-") // Replace non-alphanumeric with dash
    .replace(/-+/g, "-") // Replace multiple dashes with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing dashes
}

/**
 * Convert PokeAPI type name to our PokemonType
 */
function mapType(apiType: string): PokemonType {
  const typeMap: Record<string, PokemonType> = {
    normal: "Normal",
    fire: "Fire",
    water: "Water",
    electric: "Electric",
    grass: "Grass",
    ice: "Ice",
    fighting: "Fighting",
    poison: "Poison",
    ground: "Ground",
    flying: "Flying",
    psychic: "Psychic",
    bug: "Bug",
    rock: "Rock",
    ghost: "Ghost",
    dragon: "Dragon",
    dark: "Dark",
    steel: "Steel",
    fairy: "Fairy",
  };

  return typeMap[apiType.toLowerCase()] || "Normal";
}

/**
 * Parse stats from PokeAPI response
 */
function parseStats(apiStats: PokeAPIStat[]): Stats {
  const statMap: Record<string, keyof Stats> = {
    hp: "hp",
    attack: "atk",
    defense: "def",
    "special-attack": "spa",
    "special-defense": "spd",
    speed: "spe",
  };

  const stats: Stats = {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  };

  apiStats.forEach((stat) => {
    const key = statMap[stat.stat.name];
    if (key) {
      stats[key] = stat.base_stat;
    }
  });

  return stats;
}

/**
 * Capitalize first letter of each word
 */
function toDisplayName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ============================================================================
// API Fetching Functions
// ============================================================================

/**
 * Fetch Pokemon data from PokeAPI
 */
export async function fetchPokemon(
  nameOrId: string | number,
): Promise<PokemonData> {
  const key = normalizeName(String(nameOrId));

  // Check cache first
  if (pokemonCache.has(key)) {
    return pokemonCache.get(key)!;
  }

  try {
    const response = await fetch(`${POKEAPI_BASE}/pokemon/${key}`);

    if (!response.ok) {
      throw new Error(
        `Pokemon "${nameOrId}" not found (HTTP ${response.status})`,
      );
    }

    const data: PokeAPIPokemonResponse = await response.json();

    // Parse the response
    const pokemonData: PokemonData = {
      id: data.id,
      name: data.name,
      displayName: toDisplayName(data.name),
      baseStats: parseStats(data.stats),
      types: data.types
        .sort((a, b) => a.slot - b.slot)
        .map((t) => mapType(t.type.name)) as PokemonType[],
      abilities: data.abilities.map((a) => toDisplayName(a.ability.name)),
      learnset: data.moves.map((m) => m.move.name),
      sprite: data.sprites.front_default,
    };

    // Cache the result
    pokemonCache.set(key, pokemonData);

    return pokemonData;
  } catch (error) {
    console.error(`Error fetching Pokemon "${nameOrId}":`, error);
    throw error;
  }
}

/**
 * Fetch move data from PokeAPI
 */
export async function fetchMove(name: string): Promise<MoveData> {
  const key = normalizeName(name);

  // Check cache first
  if (moveCache.has(key)) {
    return moveCache.get(key)!;
  }

  try {
    const response = await fetch(`${POKEAPI_BASE}/move/${key}`);

    if (!response.ok) {
      throw new Error(`Move "${name}" not found (HTTP ${response.status})`);
    }

    const data: PokeAPIMoveResponse = await response.json();

    // Parse the response
    const moveData: MoveData = {
      name: data.name,
      displayName: toDisplayName(data.name),
      type: mapType(data.type.name),
      category: data.damage_class.name as "physical" | "special" | "status",
      power: data.power || 0,
      accuracy: data.accuracy || 100,
      pp: data.pp,
      priority: data.priority,
      description: data.effect_entries[0]?.short_effect || "",
    };

    // Cache the result
    moveCache.set(key, moveData);

    return moveData;
  } catch (error) {
    console.error(`Error fetching move "${name}":`, error);
    throw error;
  }
}

/**
 * Fetch multiple Pokemon in parallel
 */
export async function fetchMultiplePokemon(
  namesOrIds: Array<string | number>,
): Promise<PokemonData[]> {
  const promises = namesOrIds.map((n) => fetchPokemon(n));
  return Promise.all(promises);
}

/**
 * Fetch multiple moves in parallel
 */
export async function fetchMultipleMoves(names: string[]): Promise<MoveData[]> {
  const promises = names.map((n) => fetchMove(n));
  return Promise.all(promises);
}

/**
 * Search for Pokemon by partial name
 * Note: This requires fetching the full Pokemon list first
 */
export async function searchPokemon(query: string): Promise<string[]> {
  try {
    const response = await fetch(`${POKEAPI_BASE}/pokemon?limit=1000`);
    const data = await response.json();

    const normalizedQuery = query.toLowerCase();
    const matches = data.results
      .filter((p: { name: string }) => p.name.includes(normalizedQuery))
      .map((p: { name: string }) => p.name)
      .slice(0, 20); // Limit to top 20 matches

    return matches;
  } catch (error) {
    console.error("Error searching Pokemon:", error);
    return [];
  }
}
