/**
 * Team Import/Export Utilities
 *
 * Supports importing and exporting Pokemon teams in various formats:
 * - JSON (native format)
 * - Pokemon Showdown format (text-based)
 */

import { PokemonInstance, Move } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface TeamExportFormat {
  format: "json" | "showdown";
  data: string;
}

export interface ShowdownPokemon {
  species: string;
  nickname?: string;
  gender?: "M" | "F";
  item?: string;
  ability?: string;
  level?: number;
  shiny?: boolean;
  happiness?: number;
  nature?: string;
  evs?: {
    hp?: number;
    atk?: number;
    def?: number;
    spa?: number;
    spd?: number;
    spe?: number;
  };
  ivs?: {
    hp?: number;
    atk?: number;
    def?: number;
    spa?: number;
    spd?: number;
    spe?: number;
  };
  moves: string[];
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export a team to JSON format
 */
export function exportToJSON(team: PokemonInstance[]): string {
  return JSON.stringify(team, null, 2);
}

/**
 * Export a team to Pokemon Showdown format
 */
export function exportToShowdown(team: PokemonInstance[]): string {
  return team
    .map((pokemon) => {
      const lines: string[] = [];

      // Name and item line
      let nameLine = pokemon.species;
      if (pokemon.item) {
        nameLine += ` @ ${pokemon.item}`;
      }
      lines.push(nameLine);

      // Ability
      lines.push(`Ability: ${pokemon.ability}`);

      // Level (if not 100)
      if (pokemon.level !== 100) {
        lines.push(`Level: ${pokemon.level}`);
      }

      // EVs (if any non-zero)
      const evs = pokemon.evs;
      if (evs && Object.values(evs).some((v) => v > 0)) {
        const evList: string[] = [];
        if (evs.hp) evList.push(`${evs.hp} HP`);
        if (evs.atk) evList.push(`${evs.atk} Atk`);
        if (evs.def) evList.push(`${evs.def} Def`);
        if (evs.spa) evList.push(`${evs.spa} SpA`);
        if (evs.spd) evList.push(`${evs.spd} SpD`);
        if (evs.spe) evList.push(`${evs.spe} Spe`);
        if (evList.length > 0) {
          lines.push(`EVs: ${evList.join(" / ")}`);
        }
      }

      // Nature
      if (pokemon.nature) {
        lines.push(`${pokemon.nature} Nature`);
      }

      // IVs (only if not all 31)
      const ivs = pokemon.ivs;
      if (ivs && Object.values(ivs).some((v) => v !== 31)) {
        const ivList: string[] = [];
        if (ivs.hp !== 31) ivList.push(`${ivs.hp} HP`);
        if (ivs.atk !== 31) ivList.push(`${ivs.atk} Atk`);
        if (ivs.def !== 31) ivList.push(`${ivs.def} Def`);
        if (ivs.spa !== 31) ivList.push(`${ivs.spa} SpA`);
        if (ivs.spd !== 31) ivList.push(`${ivs.spd} SpD`);
        if (ivs.spe !== 31) ivList.push(`${ivs.spe} Spe`);
        if (ivList.length > 0) {
          lines.push(`IVs: ${ivList.join(" / ")}`);
        }
      }

      // Moves
      pokemon.moves.forEach((move) => {
        lines.push(`- ${move.name}`);
      });

      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Export a team in the specified format
 */
export function exportTeam(
  team: PokemonInstance[],
  format: "json" | "showdown" = "showdown",
): TeamExportFormat {
  const data = format === "json" ? exportToJSON(team) : exportToShowdown(team);

  return { format, data };
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Parse a Pokemon from Showdown format text
 */
function parseShowdownPokemon(text: string): ShowdownPokemon {
  const lines = text.trim().split("\n");
  const pokemon: ShowdownPokemon = {
    species: "",
    moves: [],
  };

  // Parse first line (name @ item)
  const firstLine = lines[0];
  const itemMatch = firstLine.match(/^(.+?)\s*@\s*(.+)$/);
  if (itemMatch) {
    pokemon.species = itemMatch[1].trim();
    pokemon.item = itemMatch[2].trim();
  } else {
    pokemon.species = firstLine.trim();
  }

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("Ability:")) {
      pokemon.ability = line.substring(8).trim();
    } else if (line.startsWith("Level:")) {
      pokemon.level = parseInt(line.substring(6).trim());
    } else if (line.startsWith("Shiny:")) {
      pokemon.shiny = line.substring(6).trim().toLowerCase() === "yes";
    } else if (line.startsWith("Happiness:")) {
      pokemon.happiness = parseInt(line.substring(10).trim());
    } else if (line.includes(" Nature")) {
      pokemon.nature = line.replace(" Nature", "").trim();
    } else if (line.startsWith("EVs:")) {
      pokemon.evs = parseStatLine(line.substring(4).trim());
    } else if (line.startsWith("IVs:")) {
      pokemon.ivs = parseStatLine(line.substring(4).trim());
    } else if (line.startsWith("-")) {
      const moveName = line.substring(1).trim();
      pokemon.moves.push(moveName);
    }
  }

  return pokemon;
}

/**
 * Parse a stat line (EVs or IVs)
 */
function parseStatLine(text: string): {
  hp?: number;
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
} {
  const stats: any = {};
  const parts = text.split("/").map((p) => p.trim());

  for (const part of parts) {
    const match = part.match(/(\d+)\s+(HP|Atk|Def|SpA|SpD|Spe)/);
    if (match) {
      const value = parseInt(match[1]);
      const stat = match[2].toLowerCase();
      stats[
        stat === "spa" ? "spa" : stat === "spd" ? "spd" : stat.toLowerCase()
      ] = value;
    }
  }

  return stats;
}

/**
 * Import a team from Showdown format
 * Note: This returns parsed data that needs to be converted to PokemonInstance
 * using actual game data (moves, abilities, etc.)
 */
export function importFromShowdown(text: string): ShowdownPokemon[] {
  // Split by double newlines to separate Pokemon
  const pokemonBlocks = text.split(/\n\n+/).filter((block) => block.trim());
  return pokemonBlocks.map(parseShowdownPokemon);
}

/**
 * Import a team from JSON format
 */
export function importFromJSON(text: string): PokemonInstance[] {
  return JSON.parse(text);
}

/**
 * Auto-detect format and import team
 */
export function importTeam(text: string): {
  format: "json" | "showdown";
  data: any;
} {
  text = text.trim();

  // Try to detect format
  if (text.startsWith("[") || text.startsWith("{")) {
    // Looks like JSON
    try {
      const data = importFromJSON(text);
      return { format: "json", data };
    } catch (e) {
      throw new Error("Invalid JSON format");
    }
  } else {
    // Assume Showdown format
    try {
      const data = importFromShowdown(text);
      return { format: "showdown", data };
    } catch (e) {
      throw new Error("Invalid Showdown format");
    }
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a team (basic checks)
 */
export function validateTeam(team: PokemonInstance[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!team || team.length === 0) {
    errors.push("Team is empty");
  }

  if (team.length > 6) {
    errors.push("Team has more than 6 Pokemon");
  }

  team.forEach((pokemon, index) => {
    if (!pokemon.species) {
      errors.push(`Pokemon ${index + 1}: Missing species`);
    }

    if (!pokemon.moves || pokemon.moves.length === 0) {
      errors.push(`Pokemon ${index + 1} (${pokemon.species}): No moves`);
    }

    if (pokemon.moves.length > 4) {
      errors.push(
        `Pokemon ${index + 1} (${pokemon.species}): More than 4 moves`,
      );
    }

    if (!pokemon.ability) {
      errors.push(`Pokemon ${index + 1} (${pokemon.species}): Missing ability`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Copy team data to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}
