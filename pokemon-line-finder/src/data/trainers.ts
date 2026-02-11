import { PokemonInstance, Stats, PokemonType } from "../types";
import { buildPokemon, MoveSpec, PokemonSpec } from "./normalize";

/**
 * Trainer data for Run & Bun
 * This file contains common trainers (Gym Leaders, Elite Four, Rivals, etc.)
 */

export interface Trainer {
  id: string;
  name: string;
  title: string; // e.g., "Gym Leader", "Elite Four", "Rival"
  location: string;
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 = Early game, 5 = Champion
  team: PokemonInstance[];
  notes?: string; // Special strategies or notes about the battle
}

export interface TrainerCategory {
  name: string;
  trainers: Trainer[];
}

// Helper function to create a Pokemon
function createPokemon(
  species: string,
  level: number,
  moves: string[],
  ability: string,
  item: string = "",
  _natureStats: {
    plusStat?: "hp" | "atk" | "def" | "spa" | "spd" | "spe";
    minusStat?: "hp" | "atk" | "def" | "spa" | "spd" | "spe";
  } = {},
  evs: Partial<Stats> = {},
  ivs: Partial<Stats> = {},
): PokemonInstance {
  const defaultEVs: Stats = {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    ...evs,
  };

  const defaultIVs: Stats = {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
    ...ivs,
  };

  const movesArray: MoveSpec[] = moves.map((moveName) => ({
    name: moveName,
    type: "Normal" as PokemonType,
    category: "physical",
    power: 50,
    accuracy: 100,
    pp: 10,
    priority: 0,
    critChance: "normal",
  }));

  const placeholderStats: Stats = {
    hp: 100,
    atk: 80,
    def: 80,
    spa: 80,
    spd: 80,
    spe: 80,
  };

  const spec: PokemonSpec = {
    species,
    level,
    ability,
    item: item || undefined,
    nature: "Hardy",
    ivs: defaultIVs,
    evs: defaultEVs,
    baseStats: placeholderStats,
    types: ["Normal"],
    moves: movesArray,
    canDie: true,
  };

  return buildPokemon(spec);
}

// ========================================
// GYM LEADERS
// ========================================

const ROXANNE_TEAM: PokemonInstance[] = [
  createPokemon(
    "Geodude",
    14,
    ["Rock Throw", "Tackle", "Defense Curl", "Rock Tomb"],
    "Sturdy",
  ),
  createPokemon(
    "Nosepass",
    15,
    ["Rock Tomb", "Thunder Wave", "Harden", "Rock Throw"],
    "Sturdy",
    "Sitrus Berry",
  ),
];

const BRAWLY_TEAM: PokemonInstance[] = [
  createPokemon(
    "Machop",
    17,
    ["Karate Chop", "Low Sweep", "Seismic Toss", "Bulk Up"],
    "Guts",
  ),
  createPokemon(
    "Makuhita",
    18,
    ["Arm Thrust", "Fake Out", "Sand Attack", "Vital Throw"],
    "Thick Fat",
    "Sitrus Berry",
  ),
];

const WATTSON_TEAM: PokemonInstance[] = [
  createPokemon(
    "Voltorb",
    22,
    ["Rollout", "Spark", "Self-Destruct", "Shock Wave"],
    "Soundproof",
  ),
  createPokemon(
    "Electrike",
    20,
    ["Quick Attack", "Spark", "Howl", "Shock Wave"],
    "Static",
  ),
  createPokemon(
    "Magneton",
    23,
    ["Supersonic", "Shock Wave", "Thunder Wave", "Sonic Boom"],
    "Sturdy",
    "Sitrus Berry",
  ),
];

const FLANNERY_TEAM: PokemonInstance[] = [
  createPokemon(
    "Slugma",
    26,
    ["Overheat", "Rock Throw", "Light Screen", "Sunny Day"],
    "Magma Armor",
  ),
  createPokemon(
    "Torkoal",
    28,
    ["Overheat", "Body Slam", "Attract", "White Smoke"],
    "White Smoke",
    "White Herb",
  ),
];

const NORMAN_TEAM: PokemonInstance[] = [
  createPokemon(
    "Spinda",
    27,
    ["Teeter Dance", "Psybeam", "Facade", "Dizzy Punch"],
    "Own Tempo",
  ),
  createPokemon(
    "Vigoroth",
    27,
    ["Slash", "Faint Attack", "Fury Swipes", "Encore"],
    "Vital Spirit",
  ),
  createPokemon(
    "Slaking",
    29,
    ["Faint Attack", "Amnesia", "Encore", "Facade"],
    "Truant",
    "Sitrus Berry",
  ),
];

const WINONA_TEAM: PokemonInstance[] = [
  createPokemon(
    "Swablu",
    31,
    ["Sing", "Fury Attack", "Aerial Ace", "Safeguard"],
    "Natural Cure",
  ),
  createPokemon(
    "Tropius",
    31,
    ["Sunny Day", "Aerial Ace", "Solar Beam", "Synthesis"],
    "Chlorophyll",
  ),
  createPokemon(
    "Altaria",
    33,
    ["Earthquake", "Dragon Dance", "Aerial Ace", "Dragon Breath"],
    "Natural Cure",
    "Sitrus Berry",
  ),
];

const TATE_LIZA_TEAM: PokemonInstance[] = [
  createPokemon(
    "Lunatone",
    42,
    ["Psychic", "Light Screen", "Hypnosis", "Calm Mind"],
    "Levitate",
  ),
  createPokemon(
    "Solrock",
    42,
    ["Sunny Day", "Solar Beam", "Psychic", "Flamethrower"],
    "Levitate",
    "Sitrus Berry",
  ),
];

const JUAN_TEAM: PokemonInstance[] = [
  createPokemon(
    "Luvdisc",
    41,
    ["Water Pulse", "Attract", "Sweet Kiss", "Flail"],
    "Swift Swim",
  ),
  createPokemon(
    "Whiscash",
    41,
    ["Rain Dance", "Water Pulse", "Earthquake", "Amnesia"],
    "Oblivious",
  ),
  createPokemon(
    "Sealeo",
    43,
    ["Encore", "Body Slam", "Aurora Beam", "Water Pulse"],
    "Thick Fat",
  ),
  createPokemon(
    "Crawdaunt",
    43,
    ["Surf", "Crabhammer", "Taunt", "Leer"],
    "Shell Armor",
  ),
  createPokemon(
    "Kingdra",
    46,
    ["Water Pulse", "Double Team", "Ice Beam", "Body Slam"],
    "Swift Swim",
    "Chesto Berry",
  ),
];

// ========================================
// ELITE FOUR
// ========================================

const SIDNEY_TEAM: PokemonInstance[] = [
  createPokemon(
    "Mightyena",
    46,
    ["Roar", "Sand Attack", "Crunch", "Swagger"],
    "Intimidate",
  ),
  createPokemon(
    "Shiftry",
    48,
    ["Torment", "Double Team", "Swagger", "Extrasensory"],
    "Chlorophyll",
  ),
  createPokemon(
    "Cacturne",
    46,
    ["Leech Seed", "Faint Attack", "Cotton Spore", "Needle Arm"],
    "Sand Veil",
  ),
  createPokemon(
    "Crawdaunt",
    48,
    ["Surf", "Swords Dance", "Strength", "Facade"],
    "Shell Armor",
  ),
  createPokemon(
    "Absol",
    49,
    ["Swords Dance", "Bite", "Slash", "Aerial Ace"],
    "Pressure",
    "Sitrus Berry",
  ),
];

const PHOEBE_TEAM: PokemonInstance[] = [
  createPokemon(
    "Dusclops",
    48,
    ["Shadow Punch", "Confuse Ray", "Curse", "Earthquake"],
    "Pressure",
  ),
  createPokemon(
    "Banette",
    49,
    ["Shadow Ball", "Grudge", "Will-O-Wisp", "Faint Attack"],
    "Insomnia",
  ),
  createPokemon(
    "Sableye",
    50,
    ["Night Shade", "Confuse Ray", "Faint Attack", "Shadow Ball"],
    "Keen Eye",
  ),
  createPokemon(
    "Banette",
    49,
    ["Shadow Ball", "Psychic", "Thunderbolt", "Will-O-Wisp"],
    "Insomnia",
  ),
  createPokemon(
    "Dusclops",
    51,
    ["Shadow Ball", "Ice Beam", "Rock Slide", "Earthquake"],
    "Pressure",
    "Sitrus Berry",
  ),
];

const GLACIA_TEAM: PokemonInstance[] = [
  createPokemon(
    "Glalie",
    50,
    ["Icy Wind", "Ice Beam", "Shadow Ball", "Crunch"],
    "Inner Focus",
  ),
  createPokemon(
    "Sealeo",
    50,
    ["Surf", "Body Slam", "Ice Ball", "Hail"],
    "Thick Fat",
  ),
  createPokemon(
    "Sealeo",
    52,
    ["Blizzard", "Surf", "Signal Beam", "Body Slam"],
    "Thick Fat",
  ),
  createPokemon(
    "Glalie",
    52,
    ["Light Screen", "Crunch", "Ice Beam", "Hail"],
    "Inner Focus",
  ),
  createPokemon(
    "Walrein",
    53,
    ["Surf", "Body Slam", "Ice Beam", "Sheer Cold"],
    "Thick Fat",
    "Sitrus Berry",
  ),
];

const DRAKE_TEAM: PokemonInstance[] = [
  createPokemon(
    "Shelgon",
    52,
    ["Rock Tomb", "Dragon Claw", "Protect", "Crunch"],
    "Rock Head",
  ),
  createPokemon(
    "Altaria",
    54,
    ["Double-Edge", "Dragon Dance", "Aerial Ace", "Dragon Breath"],
    "Natural Cure",
  ),
  createPokemon(
    "Flygon",
    53,
    ["Flamethrower", "Crunch", "Dragon Claw", "Earthquake"],
    "Levitate",
  ),
  createPokemon(
    "Flygon",
    53,
    ["Giga Drain", "Dragon Breath", "Dragon Dance", "Earthquake"],
    "Levitate",
  ),
  createPokemon(
    "Salamence",
    55,
    ["Flamethrower", "Dragon Claw", "Rock Slide", "Crunch"],
    "Intimidate",
    "Sitrus Berry",
  ),
];

// ========================================
// CHAMPION
// ========================================

const WALLACE_TEAM: PokemonInstance[] = [
  createPokemon(
    "Wailord",
    57,
    ["Water Spout", "Double-Edge", "Blizzard", "Rain Dance"],
    "Water Veil",
  ),
  createPokemon(
    "Tentacruel",
    55,
    ["Toxic", "Hydro Pump", "Sludge Bomb", "Ice Beam"],
    "Clear Body",
  ),
  createPokemon(
    "Ludicolo",
    56,
    ["Surf", "Giga Drain", "Ice Beam", "Leech Seed"],
    "Rain Dish",
  ),
  createPokemon(
    "Whiscash",
    56,
    ["Earthquake", "Surf", "Amnesia", "Hyper Beam"],
    "Oblivious",
  ),
  createPokemon(
    "Gyarados",
    56,
    ["Dragon Dance", "Earthquake", "Hyper Beam", "Surf"],
    "Intimidate",
  ),
  createPokemon(
    "Milotic",
    58,
    ["Surf", "Ice Beam", "Recover", "Mirror Coat"],
    "Marvel Scale",
    "Sitrus Berry",
  ),
];

// ========================================
// RIVALS & IMPORTANT TRAINERS
// ========================================

const RIVAL_BRENDAN_TREECKO_TEAM: PokemonInstance[] = [
  createPokemon(
    "Combusken",
    29,
    ["Double Kick", "Peck", "Sand Attack", "Bulk Up"],
    "Blaze",
  ),
  createPokemon(
    "Lombre",
    29,
    ["Fury Swipes", "Fake Out", "Water Pulse", "Nature Power"],
    "Rain Dish",
  ),
  createPokemon(
    "Slugma",
    29,
    ["Light Screen", "Rock Throw", "Ember", "Smog"],
    "Magma Armor",
  ),
];

const RIVAL_MAY_TORCHIC_TEAM: PokemonInstance[] = [
  createPokemon(
    "Grovyle",
    29,
    ["Leaf Blade", "Pursuit", "Screech", "Quick Attack"],
    "Overgrow",
  ),
  createPokemon(
    "Lombre",
    29,
    ["Fury Swipes", "Fake Out", "Water Pulse", "Nature Power"],
    "Rain Dish",
  ),
  createPokemon(
    "Slugma",
    29,
    ["Light Screen", "Rock Throw", "Ember", "Smog"],
    "Magma Armor",
  ),
];

// ========================================
// TRAINER DATABASE
// ========================================

export const trainers: Trainer[] = [
  // Gym Leaders
  {
    id: "roxanne",
    name: "Roxanne",
    title: "Gym Leader (Rock)",
    location: "Rustboro City Gym",
    difficulty: 1,
    team: ROXANNE_TEAM,
    notes:
      "First Gym Leader. Focus on Rock-type Pokemon. Nosepass can be challenging without Fighting/Water/Grass moves.",
  },
  {
    id: "brawly",
    name: "Brawly",
    title: "Gym Leader (Fighting)",
    location: "Dewford Town Gym",
    difficulty: 1,
    team: BRAWLY_TEAM,
    notes: "Second Gym Leader. Weak to Flying and Psychic types.",
  },
  {
    id: "wattson",
    name: "Wattson",
    title: "Gym Leader (Electric)",
    location: "Mauville City Gym",
    difficulty: 2,
    team: WATTSON_TEAM,
    notes:
      "Third Gym Leader. Magneton can be tricky. Voltorb may use Self-Destruct.",
  },
  {
    id: "flannery",
    name: "Flannery",
    title: "Gym Leader (Fire)",
    location: "Lavaridge Town Gym",
    difficulty: 2,
    team: FLANNERY_TEAM,
    notes:
      "Fourth Gym Leader. Torkoal has White Herb to counter Overheat's stat drop.",
  },
  {
    id: "norman",
    name: "Norman",
    title: "Gym Leader (Normal)",
    location: "Petalburg City Gym",
    difficulty: 3,
    team: NORMAN_TEAM,
    notes:
      "Fifth Gym Leader and your father. Slaking is very powerful but Truant gives you free turns. Fighting-type moves are key.",
  },
  {
    id: "winona",
    name: "Winona",
    title: "Gym Leader (Flying)",
    location: "Fortree City Gym",
    difficulty: 3,
    team: WINONA_TEAM,
    notes:
      "Sixth Gym Leader. Altaria knows Earthquake. Electric and Ice types recommended.",
  },
  {
    id: "tate_liza",
    name: "Tate & Liza",
    title: "Gym Leaders (Psychic)",
    location: "Mossdeep City Gym",
    difficulty: 4,
    team: TATE_LIZA_TEAM,
    notes:
      "Seventh Gym (Double Battle). Lunatone and Solrock combo. Dark, Bug, and Ghost moves are super effective.",
  },
  {
    id: "juan",
    name: "Juan",
    title: "Gym Leader (Water)",
    location: "Sootopolis City Gym",
    difficulty: 4,
    team: JUAN_TEAM,
    notes:
      "Eighth and final Gym Leader. Kingdra has no common weaknesses. Electric and Grass moves recommended.",
  },

  // Elite Four
  {
    id: "sidney",
    name: "Sidney",
    title: "Elite Four (Dark)",
    location: "Pokemon League",
    difficulty: 5,
    team: SIDNEY_TEAM,
    notes:
      "First Elite Four member. Weak to Fighting and Bug types. Watch out for Swagger confusion.",
  },
  {
    id: "phoebe",
    name: "Phoebe",
    title: "Elite Four (Ghost)",
    location: "Pokemon League",
    difficulty: 5,
    team: PHOEBE_TEAM,
    notes:
      "Second Elite Four member. Ghost-types with wide coverage. Dark and Ghost moves recommended.",
  },
  {
    id: "glacia",
    name: "Glacia",
    title: "Elite Four (Ice)",
    location: "Pokemon League",
    difficulty: 5,
    team: GLACIA_TEAM,
    notes:
      "Third Elite Four member. All Ice-types. Fire, Fighting, Rock, and Steel moves are super effective.",
  },
  {
    id: "drake",
    name: "Drake",
    title: "Elite Four (Dragon)",
    location: "Pokemon League",
    difficulty: 5,
    team: DRAKE_TEAM,
    notes:
      "Fourth Elite Four member. Dragon and Flying types. Ice moves are highly effective. Watch out for Salamence.",
  },

  // Champion
  {
    id: "wallace",
    name: "Wallace",
    title: "Champion",
    location: "Pokemon League",
    difficulty: 5,
    team: WALLACE_TEAM,
    notes:
      "Champion of Hoenn. Balanced Water-type team. Milotic is very bulky with Recover. Electric and Grass moves recommended.",
  },

  // Rivals
  {
    id: "brendan_treecko",
    name: "Brendan",
    title: "Rival (Route 110)",
    location: "Route 110",
    difficulty: 2,
    team: RIVAL_BRENDAN_TREECKO_TEAM,
    notes: "Rival battle (if you chose Treecko). Has Combusken as starter.",
  },
  {
    id: "may_torchic",
    name: "May",
    title: "Rival (Route 110)",
    location: "Route 110",
    difficulty: 2,
    team: RIVAL_MAY_TORCHIC_TEAM,
    notes: "Rival battle (if you chose Torchic). Has Grovyle as starter.",
  },
];

// Group trainers by category
export const trainerCategories: TrainerCategory[] = [
  {
    name: "Gym Leaders",
    trainers: trainers.filter((t) => t.title.includes("Gym Leader")),
  },
  {
    name: "Elite Four",
    trainers: trainers.filter((t) => t.title.includes("Elite Four")),
  },
  {
    name: "Champion",
    trainers: trainers.filter((t) => t.title === "Champion"),
  },
  {
    name: "Rivals",
    trainers: trainers.filter((t) => t.title.includes("Rival")),
  },
];

// Helper function to get trainer by ID
export function getTrainerById(id: string): Trainer | undefined {
  return trainers.find((t) => t.id === id);
}

// Helper function to get trainers by difficulty
export function getTrainersByDifficulty(
  difficulty: 1 | 2 | 3 | 4 | 5,
): Trainer[] {
  return trainers.filter((t) => t.difficulty === difficulty);
}

// Helper function to get trainers by location
export function getTrainersByLocation(location: string): Trainer[] {
  return trainers.filter((t) =>
    t.location.toLowerCase().includes(location.toLowerCase()),
  );
}
