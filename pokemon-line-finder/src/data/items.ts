/**
 * Held Items Database
 * Defines all held items and their effects in battle
 */

export type ItemEffect =
  | "damage-boost"
  | "type-boost"
  | "stat-boost"
  | "status-heal"
  | "berry-heal"
  | "end-turn-heal"
  | "end-turn-status"
  | "recoil-damage"
  | "choice-lock"
  | "life-orb"
  | "expert-belt"
  | "focus-sash"
  | "protect-boost";

export interface Item {
  name: string;
  effect: ItemEffect;
  description: string;
  // Numeric modifiers
  damageMultiplier?: number;
  typeBoost?: string; // Type that gets boosted
  statBoost?: {
    stat: "atk" | "def" | "spa" | "spd" | "spe";
    multiplier: number;
  };
  // HP thresholds for berries
  hpThreshold?: number;
  healAmount?: number;
  healPercent?: number;
  isBerry?: boolean;
  endTurnHealPercent?: number;
  endTurnDamagePercent?: number;
  endTurnHealIfType?: string;
  statusOnTurnEnd?: "burn" | "poison" | "badly-poison";
  curesStatusOnTurnEnd?: boolean;
  // Recoil
  recoilPercent?: number;
  // Special flags
  preventsOHKO?: boolean;
  isChoiceItem?: boolean;
}

/**
 * Held Items Database
 */
export const ITEMS: Record<string, Item> = {
  // Choice Items - Lock into one move, boost stats
  "Choice Band": {
    name: "Choice Band",
    effect: "choice-lock",
    description: "Boosts Attack by 50% but locks into one move",
    statBoost: { stat: "atk", multiplier: 1.5 },
    isChoiceItem: true,
  },
  "Choice Specs": {
    name: "Choice Specs",
    effect: "choice-lock",
    description: "Boosts Sp. Atk by 50% but locks into one move",
    statBoost: { stat: "spa", multiplier: 1.5 },
    isChoiceItem: true,
  },
  "Choice Scarf": {
    name: "Choice Scarf",
    effect: "choice-lock",
    description: "Boosts Speed by 50% but locks into one move",
    statBoost: { stat: "spe", multiplier: 1.5 },
    isChoiceItem: true,
  },

  // Life Orb - Universal damage boost with recoil
  "Life Orb": {
    name: "Life Orb",
    effect: "life-orb",
    description: "Boosts move power by 30% but user takes 10% recoil",
    damageMultiplier: 1.3,
    recoilPercent: 10,
  },

  // Expert Belt - Boost super effective moves
  "Expert Belt": {
    name: "Expert Belt",
    effect: "expert-belt",
    description: "Boosts super effective moves by 20%",
    damageMultiplier: 1.2,
  },

  // Type-boosting items
  Charcoal: {
    name: "Charcoal",
    effect: "type-boost",
    description: "Boosts Fire-type moves by 20%",
    typeBoost: "Fire",
    damageMultiplier: 1.2,
  },
  "Mystic Water": {
    name: "Mystic Water",
    effect: "type-boost",
    description: "Boosts Water-type moves by 20%",
    typeBoost: "Water",
    damageMultiplier: 1.2,
  },
  "Miracle Seed": {
    name: "Miracle Seed",
    effect: "type-boost",
    description: "Boosts Grass-type moves by 20%",
    typeBoost: "Grass",
    damageMultiplier: 1.2,
  },
  Magnet: {
    name: "Magnet",
    effect: "type-boost",
    description: "Boosts Electric-type moves by 20%",
    typeBoost: "Electric",
    damageMultiplier: 1.2,
  },
  "Spell Tag": {
    name: "Spell Tag",
    effect: "type-boost",
    description: "Boosts Ghost-type moves by 20%",
    typeBoost: "Ghost",
    damageMultiplier: 1.2,
  },
  "Black Belt": {
    name: "Black Belt",
    effect: "type-boost",
    description: "Boosts Fighting-type moves by 20%",
    typeBoost: "Fighting",
    damageMultiplier: 1.2,
  },
  "Sharp Beak": {
    name: "Sharp Beak",
    effect: "type-boost",
    description: "Boosts Flying-type moves by 20%",
    typeBoost: "Flying",
    damageMultiplier: 1.2,
  },
  "Poison Barb": {
    name: "Poison Barb",
    effect: "type-boost",
    description: "Boosts Poison-type moves by 20%",
    typeBoost: "Poison",
    damageMultiplier: 1.2,
  },
  "Soft Sand": {
    name: "Soft Sand",
    effect: "type-boost",
    description: "Boosts Ground-type moves by 20%",
    typeBoost: "Ground",
    damageMultiplier: 1.2,
  },
  "Hard Stone": {
    name: "Hard Stone",
    effect: "type-boost",
    description: "Boosts Rock-type moves by 20%",
    typeBoost: "Rock",
    damageMultiplier: 1.2,
  },
  "Silver Powder": {
    name: "Silver Powder",
    effect: "type-boost",
    description: "Boosts Bug-type moves by 20%",
    typeBoost: "Bug",
    damageMultiplier: 1.2,
  },
  "Metal Coat": {
    name: "Metal Coat",
    effect: "type-boost",
    description: "Boosts Steel-type moves by 20%",
    typeBoost: "Steel",
    damageMultiplier: 1.2,
  },
  "Dragon Fang": {
    name: "Dragon Fang",
    effect: "type-boost",
    description: "Boosts Dragon-type moves by 20%",
    typeBoost: "Dragon",
    damageMultiplier: 1.2,
  },
  "Twisted Spoon": {
    name: "Twisted Spoon",
    effect: "type-boost",
    description: "Boosts Psychic-type moves by 20%",
    typeBoost: "Psychic",
    damageMultiplier: 1.2,
  },
  "Never-Melt Ice": {
    name: "Never-Melt Ice",
    effect: "type-boost",
    description: "Boosts Ice-type moves by 20%",
    typeBoost: "Ice",
    damageMultiplier: 1.2,
  },
  "Black Glasses": {
    name: "Black Glasses",
    effect: "type-boost",
    description: "Boosts Dark-type moves by 20%",
    typeBoost: "Dark",
    damageMultiplier: 1.2,
  },
  "Pixie Plate": {
    name: "Pixie Plate",
    effect: "type-boost",
    description: "Boosts Fairy-type moves by 20%",
    typeBoost: "Fairy",
    damageMultiplier: 1.2,
  },

  // Defensive items
  Leftovers: {
    name: "Leftovers",
    effect: "end-turn-heal",
    description: "Restores 1/16 of max HP each turn",
    endTurnHealPercent: 6.25,
  },
  "Black Sludge": {
    name: "Black Sludge",
    effect: "end-turn-heal",
    description: "Heals Poison types, damages others each turn",
    endTurnHealPercent: 6.25,
    endTurnDamagePercent: 12.5,
    endTurnHealIfType: "Poison",
  },
  "Focus Sash": {
    name: "Focus Sash",
    effect: "focus-sash",
    description: "Survives a OHKO at full HP with 1 HP",
    preventsOHKO: true,
  },
  "Assault Vest": {
    name: "Assault Vest",
    effect: "stat-boost",
    description: "Boosts Sp. Def by 50% but prevents status moves",
    statBoost: { stat: "spd", multiplier: 1.5 },
  },

  // Berries - HP restoration
  "Sitrus Berry": {
    name: "Sitrus Berry",
    effect: "berry-heal",
    description: "Restores 25% HP when HP falls below 50%",
    hpThreshold: 50,
    healPercent: 25,
    isBerry: true,
  },
  "Oran Berry": {
    name: "Oran Berry",
    effect: "berry-heal",
    description: "Restores 10 HP when HP falls below 50%",
    hpThreshold: 50,
    healAmount: 10, // flat amount
    isBerry: true,
  },
  "Lum Berry": {
    name: "Lum Berry",
    effect: "status-heal",
    description: "Cures any status condition once",
    curesStatusOnTurnEnd: true,
    isBerry: true,
  },
  "Toxic Orb": {
    name: "Toxic Orb",
    effect: "end-turn-status",
    description: "Badly poisons the holder at end of turn",
    statusOnTurnEnd: "badly-poison",
  },
  "Flame Orb": {
    name: "Flame Orb",
    effect: "end-turn-status",
    description: "Burns the holder at end of turn",
    statusOnTurnEnd: "burn",
  },

  // Resist Berries - Reduces super effective damage
  "Occa Berry": {
    name: "Occa Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Fire-type moves once",
    typeBoost: "Fire",
  },
  "Passho Berry": {
    name: "Passho Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Water-type moves once",
    typeBoost: "Water",
  },
  "Wacan Berry": {
    name: "Wacan Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Electric-type moves once",
    typeBoost: "Electric",
  },
  "Rindo Berry": {
    name: "Rindo Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Grass-type moves once",
    typeBoost: "Grass",
  },
  "Yache Berry": {
    name: "Yache Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Ice-type moves once",
    typeBoost: "Ice",
  },
  "Chople Berry": {
    name: "Chople Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Fighting-type moves once",
    typeBoost: "Fighting",
  },
  "Kebia Berry": {
    name: "Kebia Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Poison-type moves once",
    typeBoost: "Poison",
  },
  "Shuca Berry": {
    name: "Shuca Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Ground-type moves once",
    typeBoost: "Ground",
  },
  "Coba Berry": {
    name: "Coba Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Flying-type moves once",
    typeBoost: "Flying",
  },
  "Payapa Berry": {
    name: "Payapa Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Psychic-type moves once",
    typeBoost: "Psychic",
  },
  "Tanga Berry": {
    name: "Tanga Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Bug-type moves once",
    typeBoost: "Bug",
  },
  "Charti Berry": {
    name: "Charti Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Rock-type moves once",
    typeBoost: "Rock",
  },
  "Kasib Berry": {
    name: "Kasib Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Ghost-type moves once",
    typeBoost: "Ghost",
  },
  "Haban Berry": {
    name: "Haban Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Dragon-type moves once",
    typeBoost: "Dragon",
  },
  "Colbur Berry": {
    name: "Colbur Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Dark-type moves once",
    typeBoost: "Dark",
  },
  "Babiri Berry": {
    name: "Babiri Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Steel-type moves once",
    typeBoost: "Steel",
  },
  "Roseli Berry": {
    name: "Roseli Berry",
    effect: "protect-boost",
    description: "Halves damage from super effective Fairy-type moves once",
    typeBoost: "Fairy",
  },
};

/**
 * Get all item names for UI dropdowns
 */
export function getItemNames(): string[] {
  return ["(None)", ...Object.keys(ITEMS).sort()];
}

/**
 * Get item by name
 */
export function getItem(name: string | null | undefined): Item | null {
  if (!name || name === "(None)") return null;
  return ITEMS[name] || null;
}

/**
 * Check if move triggers type-boost item
 */
export function itemBoostsMoveType(
  item: Item | null,
  moveType: string,
): boolean {
  if (!item) return false;
  if (item.effect === "type-boost" && item.typeBoost === moveType) {
    return true;
  }
  return false;
}

/**
 * Get damage multiplier from item
 */
export function getItemDamageMultiplier(
  item: Item | null,
  moveType: string,
  effectiveness: number,
): number {
  if (!item) return 1.0;

  // Life Orb applies to all moves
  if (item.effect === "life-orb") {
    return item.damageMultiplier || 1.3;
  }

  // Expert Belt boosts super effective moves
  if (item.effect === "expert-belt" && effectiveness > 1.0) {
    return item.damageMultiplier || 1.2;
  }

  // Type-boost items
  if (itemBoostsMoveType(item, moveType)) {
    return item.damageMultiplier || 1.2;
  }

  return 1.0;
}

/**
 * Get stat multiplier from item
 */
export function getItemStatMultiplier(
  item: Item | null,
  stat: "atk" | "def" | "spa" | "spd" | "spe",
): number {
  if (!item || !item.statBoost) return 1.0;
  if (item.statBoost.stat === stat) {
    return item.statBoost.multiplier;
  }
  return 1.0;
}

/**
 * Check if item provides Focus Sash protection
 */
export function hasFocusSashProtection(item: Item | null): boolean {
  return item?.preventsOHKO === true;
}

/**
 * Get Life Orb recoil percentage
 */
export function getLifeOrbRecoil(item: Item | null): number {
  if (item?.effect === "life-orb") {
    return item.recoilPercent || 10;
  }
  return 0;
}
