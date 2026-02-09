/**
 * Run & Bun Dex Data Parser
 *
 * Parses Pokemon modifications specific to Pokemon Run & Bun from the RBDex website
 * Source: https://may8th1995.github.io/RBDex/
 *
 * This handles:
 * - Modified stats
 * - Type changes
 * - Ability changes
 * - Move pool changes
 * - New moves or mechanics specific to Run & Bun
 */

import { Stats, PokemonType } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface RunBunModification {
  species: string;
  statsModified?: Partial<Stats>;
  typesModified?: PokemonType[];
  abilitiesModified?: string[];
  movesAdded?: string[];
  movesRemoved?: string[];
  notes?: string;
}

// ============================================================================
// Manual Override Data
// ============================================================================
// TODO: Replace with actual data parsing from RBDex
// For now, we'll use manual entries for Pokemon we know are modified

const RUN_BUN_MODIFICATIONS: Record<string, RunBunModification> = {
  // Example modifications (these would come from parsing RBDex)
  // 'charizard': {
  //   species: 'charizard',
  //   statsModified: {
  //     atk: 94, // Buffed from 84
  //     spa: 119, // Buffed from 109
  //   },
  //   movesAdded: ['dragon-dance'],
  //   notes: 'Buffed to make more viable'
  // },
  // Add more modifications as needed
};

// ============================================================================
// Functions
// ============================================================================

/**
 * Get Run & Bun modifications for a Pokemon
 */
export function getRunBunModifications(
  species: string,
): RunBunModification | null {
  const normalized = species.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return RUN_BUN_MODIFICATIONS[normalized] || null;
}

/**
 * Check if a Pokemon has any modifications in Run & Bun
 */
export function isModified(species: string): boolean {
  return getRunBunModifications(species) !== null;
}

/**
 * Apply Run & Bun modifications to base stats
 */
export function applyStatModifications(
  species: string,
  baseStats: Stats,
): Stats {
  const mods = getRunBunModifications(species);

  if (!mods || !mods.statsModified) {
    return baseStats;
  }

  return {
    ...baseStats,
    ...mods.statsModified,
  };
}

/**
 * Apply Run & Bun type modifications
 */
export function applyTypeModifications(
  species: string,
  originalTypes: PokemonType[],
): PokemonType[] {
  const mods = getRunBunModifications(species);

  if (!mods || !mods.typesModified) {
    return originalTypes;
  }

  return mods.typesModified;
}

/**
 * Apply Run & Bun ability modifications
 */
export function applyAbilityModifications(
  species: string,
  originalAbilities: string[],
): string[] {
  const mods = getRunBunModifications(species);

  if (!mods || !mods.abilitiesModified) {
    return originalAbilities;
  }

  return mods.abilitiesModified;
}

/**
 * Apply Run & Bun move pool modifications
 */
export function applyMovePoolModifications(
  species: string,
  originalMoves: string[],
): string[] {
  const mods = getRunBunModifications(species);

  if (!mods) {
    return originalMoves;
  }

  let moves = [...originalMoves];

  // Add new moves
  if (mods.movesAdded) {
    moves = [...moves, ...mods.movesAdded];
  }

  // Remove moves
  if (mods.movesRemoved) {
    moves = moves.filter((m) => !mods.movesRemoved!.includes(m));
  }

  // Remove duplicates
  return Array.from(new Set(moves));
}

/**
 * Fetch and parse Run & Bun dex data from the website
 * TODO: Implement actual parsing logic
 */
export async function fetchRunBunDex(): Promise<void> {
  try {
    // The RBDex is a static site, so we'd need to:
    // 1. Fetch the HTML pages
    // 2. Parse them to extract Pokemon data
    // 3. Build the modification map

    // For now, this is a placeholder that would be implemented
    // once we understand the exact structure of the RBDex site

    console.log("RBDex fetching not yet implemented");
    console.log("Using manual override data for now");

    // Example of what this might look like:
    // const response = await fetch('https://may8th1995.github.io/RBDex/');
    // const html = await response.text();
    // const modifications = parseRBDexHTML(html);
    // Update RUN_BUN_MODIFICATIONS with parsed data
  } catch (error) {
    console.error("Error fetching Run & Bun Dex:", error);
  }
}

/**
 * Parse RBDex HTML to extract modification data
 * TODO: Implement based on actual RBDex structure
 */
function _parseRBDexHTML(_html: string): Record<string, RunBunModification> {
  // This would parse the HTML and extract:
  // - Pokemon names
  // - Modified stats
  // - Type changes
  // - Ability changes
  // - Move pool changes

  // For now, return empty object
  return {};
}

/**
 * Add a manual modification (useful for testing or quick updates)
 */
export function addManualModification(mod: RunBunModification): void {
  const normalized = mod.species.toLowerCase().replace(/[^a-z0-9]/g, "-");
  RUN_BUN_MODIFICATIONS[normalized] = mod;
}

/**
 * Get all modified Pokemon species
 */
export function getAllModifiedSpecies(): string[] {
  return Object.keys(RUN_BUN_MODIFICATIONS);
}

/**
 * Example function to add known modifications programmatically
 */
export function loadKnownModifications(): void {
  // This would be called on app startup to load any hardcoded modifications
  // that we know about from the Run & Bun documentation
  // Example additions:
  // addManualModification({
  //   species: 'pidgeot',
  //   statsModified: {
  //     atk: 90, // Buffed
  //     spa: 95, // Buffed
  //   },
  //   notes: 'Buffed to make early-game birds more viable'
  // });
}
