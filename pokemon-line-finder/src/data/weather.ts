/**
 * Weather Effects System
 * Handles weather-related damage modifiers, abilities, and end-of-turn effects
 */

import { Weather, PokemonInstance } from "../types/index";

/**
 * Weather type categories
 */
export const WEATHER_CATEGORIES = {
  damaging: ["sandstorm", "hail"] as const,
  boosting: ["sun", "rain", "harsh-sun", "heavy-rain"] as const,
  extreme: ["harsh-sun", "heavy-rain"] as const,
};

/**
 * Abilities that grant weather immunity
 */
const WEATHER_IMMUNE_ABILITIES: Record<Weather, string[]> = {
  clear: [],
  sun: [],
  rain: [],
  sandstorm: [
    "Sand Veil",
    "Sand Rush",
    "Sand Force",
    "Overcoat",
    "Magic Guard",
  ],
  hail: ["Ice Body", "Snow Cloak", "Overcoat", "Magic Guard"],
  "harsh-sun": [],
  "heavy-rain": [],
};

/**
 * Type immunities to weather damage
 */
const WEATHER_TYPE_IMMUNITY: Record<Weather, string[]> = {
  clear: [],
  sun: [],
  rain: [],
  sandstorm: ["Rock", "Ground", "Steel"],
  hail: ["Ice"],
  "harsh-sun": [],
  "heavy-rain": [],
};

/**
 * Abilities that extend weather duration
 */
export const WEATHER_EXTENDING_ABILITIES: Record<string, Weather> = {
  Drought: "sun",
  Drizzle: "rain",
  "Sand Stream": "sandstorm",
  "Snow Warning": "hail",
  "Desolate Land": "harsh-sun",
  "Primordial Sea": "heavy-rain",
};

/**
 * Abilities that are boosted by weather
 */
export const WEATHER_BOOSTED_ABILITIES: Record<
  Weather,
  Record<string, number>
> = {
  clear: {},
  sun: {
    Chlorophyll: 2.0, // Speed x2
    "Flower Gift": 1.5, // Attack & Sp.Def x1.5 (not implemented yet)
    "Solar Power": 1.5, // Sp.Atk x1.5
  },
  rain: {
    "Swift Swim": 2.0, // Speed x2
    "Rain Dish": 1.0625, // Heal 1/16 HP
    "Dry Skin": 1.125, // Heal 1/8 HP
    Hydration: 1.0, // Heal status
  },
  sandstorm: {
    "Sand Rush": 2.0, // Speed x2
    "Sand Force": 1.3, // Rock/Ground/Steel moves boosted
  },
  hail: {
    "Snow Cloak": 1.2, // Evasion +20%
    "Ice Body": 1.0625, // Heal 1/16 HP
    "Slush Rush": 2.0, // Speed x2
  },
  "harsh-sun": {
    Chlorophyll: 2.0,
    "Solar Power": 1.5,
  },
  "heavy-rain": {
    "Swift Swim": 2.0,
  },
};

/**
 * Check if a Pokemon is immune to weather damage
 */
export function isImmuneToWeatherDamage(
  pokemon: PokemonInstance,
  weather: Weather,
): boolean {
  // Check ability immunity
  if (WEATHER_IMMUNE_ABILITIES[weather]?.includes(pokemon.ability)) {
    return true;
  }

  // Check type immunity
  const immuneTypes = WEATHER_TYPE_IMMUNITY[weather];
  if (immuneTypes && pokemon.types.some((type) => immuneTypes.includes(type))) {
    return true;
  }

  return false;
}

/**
 * Calculate weather chip damage (sandstorm/hail deal 1/16 max HP per turn)
 */
export function calculateWeatherDamage(
  pokemon: PokemonInstance,
  weather: Weather,
): number {
  if (weather !== "sandstorm" && weather !== "hail") {
    return 0;
  }

  if (isImmuneToWeatherDamage(pokemon, weather)) {
    return 0;
  }

  // 1/16 of max HP
  return Math.floor(pokemon.stats.hp / 16);
}

/**
 * Calculate weather healing (Ice Body, Rain Dish, etc.)
 */
export function calculateWeatherHealing(
  pokemon: PokemonInstance,
  weather: Weather,
): number {
  if (weather === "hail" && pokemon.ability === "Ice Body") {
    return Math.floor(pokemon.stats.hp / 16); // 1/16 HP
  }

  if (weather === "rain" || weather === "heavy-rain") {
    if (pokemon.ability === "Rain Dish") {
      return Math.floor(pokemon.stats.hp / 16); // 1/16 HP
    }
    if (pokemon.ability === "Dry Skin") {
      return Math.floor(pokemon.stats.hp / 8); // 1/8 HP
    }
  }

  return 0;
}

/**
 * Get speed multiplier from weather-related abilities
 */
export function getWeatherSpeedMultiplier(
  pokemon: PokemonInstance,
  weather: Weather,
): number {
  if (weather === "sun" || weather === "harsh-sun") {
    if (pokemon.ability === "Chlorophyll") return 2.0;
  }

  if (weather === "rain" || weather === "heavy-rain") {
    if (pokemon.ability === "Swift Swim") return 2.0;
  }

  if (weather === "sandstorm") {
    if (pokemon.ability === "Sand Rush") return 2.0;
  }

  if (weather === "hail") {
    if (pokemon.ability === "Slush Rush") return 2.0;
  }

  return 1.0;
}

/**
 * Get damage multiplier from weather-related abilities
 */
export function getWeatherDamageMultiplier(
  attackerAbility: string,
  moveType: string,
  weather: Weather,
): number {
  // Solar Power boosts Special Attack in sun
  if (
    (weather === "sun" || weather === "harsh-sun") &&
    attackerAbility === "Solar Power"
  ) {
    return 1.5;
  }

  // Sand Force boosts Rock/Ground/Steel moves in sandstorm
  if (weather === "sandstorm" && attackerAbility === "Sand Force") {
    if (["Rock", "Ground", "Steel"].includes(moveType)) {
      return 1.3;
    }
  }

  return 1.0;
}

/**
 * Check if weather prevents a move
 */
export function weatherPreventsMove(
  moveType: string,
  weather: Weather,
): boolean {
  if (weather === "harsh-sun" && moveType === "Water") {
    return true; // Water moves fail in Harsh Sunlight
  }

  if (weather === "heavy-rain" && moveType === "Fire") {
    return true; // Fire moves fail in Heavy Rain
  }

  return false;
}

/**
 * Get accuracy modifier from weather
 */
export function getWeatherAccuracyModifier(
  moveName: string,
  weather: Weather,
): number {
  // Thunder and Hurricane have perfect accuracy in rain
  if (
    (weather === "rain" || weather === "heavy-rain") &&
    (moveName === "Thunder" || moveName === "Hurricane")
  ) {
    return 999; // Effectively 100% accuracy
  }

  // Thunder and Hurricane have reduced accuracy in sun
  if (
    (weather === "sun" || weather === "harsh-sun") &&
    (moveName === "Thunder" || moveName === "Hurricane")
  ) {
    return 0.5; // 50% accuracy
  }

  // Blizzard has perfect accuracy in hail
  if (weather === "hail" && moveName === "Blizzard") {
    return 999;
  }

  return 1.0;
}

/**
 * Check if a move charges instantly in weather (Solar Beam/Solar Blade in sun)
 */
export function weatherSkipsCharging(
  moveName: string,
  weather: Weather,
): boolean {
  if (
    (weather === "sun" || weather === "harsh-sun") &&
    (moveName === "Solar Beam" || moveName === "Solar Blade")
  ) {
    return true;
  }

  return false;
}

/**
 * Get weather duration (most weather lasts 5 turns, some abilities make it permanent)
 */
export function getWeatherDuration(
  weather: Weather,
  _setterAbility?: string,
): number {
  // Extreme weathers from Primal Pokemon are permanent
  if (weather === "harsh-sun" || weather === "heavy-rain") {
    return 999;
  }

  // Abilities like Drought, Drizzle make weather last 5 turns
  // Without an ability (from a move like Rain Dance), it lasts 5 turns
  // With a Damp Rock/Heat Rock/etc., it lasts 8 turns
  return 5;
}

/**
 * Determine which weather takes priority when multiple Pokemon set weather
 * (Extreme weathers override normal weathers)
 */
export function getWeatherPriority(weather: Weather): number {
  if (weather === "harsh-sun" || weather === "heavy-rain") {
    return 2; // Highest priority
  }
  if (
    weather === "sun" ||
    weather === "rain" ||
    weather === "sandstorm" ||
    weather === "hail"
  ) {
    return 1;
  }
  return 0; // Clear
}

/**
 * Check if weather affects move power (beyond type multipliers)
 */
export function hasWeatherMovePowerEffect(weather: Weather): boolean {
  return weather !== "clear";
}

/**
 * Get list of moves that set weather
 */
export const WEATHER_SETTING_MOVES: Record<string, Weather> = {
  "Sunny Day": "sun",
  "Rain Dance": "rain",
  Sandstorm: "sandstorm",
  Hail: "hail",
};

/**
 * Weather effect summary for UI display
 */
export function getWeatherDescription(weather: Weather): string {
  switch (weather) {
    case "clear":
      return "No weather effects";
    case "sun":
      return "☀️ Harsh sunlight: Fire moves +50%, Water moves -50%";
    case "rain":
      return "🌧️ Rain: Water moves +50%, Fire moves -50%, Thunder 100% accuracy";
    case "sandstorm":
      return "🌪️ Sandstorm: 1/16 HP damage per turn (except Rock/Ground/Steel)";
    case "hail":
      return "❄️ Hail: 1/16 HP damage per turn (except Ice), Blizzard 100% accuracy";
    case "harsh-sun":
      return "☀️☀️ Extremely harsh sunlight: Fire +50%, Water fails";
    case "heavy-rain":
      return "🌧️🌧️ Heavy rain: Water +50%, Fire fails";
  }
}
