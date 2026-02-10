/**
 * Core type definitions for Pokémon Run & Bun battle calculator
 */

// ============================================================================
// Pokemon Base Data Types
// ============================================================================

export type PokemonType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Electric"
  | "Grass"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon"
  | "Dark"
  | "Steel"
  | "Fairy";

export type StatName = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface StatModifiers {
  atk: number; // -6 to +6
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
}

export type Status =
  | "healthy"
  | "burn"
  | "freeze"
  | "paralysis"
  | "poison"
  | "badly-poison"
  | "sleep";

export type Weather =
  | "clear"
  | "sun"
  | "rain"
  | "sandstorm"
  | "hail"
  | "harsh-sun"
  | "heavy-rain";

export type Terrain = "none" | "electric" | "grassy" | "misty" | "psychic";

// ============================================================================
// Move Data Types
// ============================================================================

export type MoveCategory = "physical" | "special" | "status";

export type MoveDamageClass = "damage" | "damage-by-status" | "damage-heal";

export interface Move {
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  critChance: "normal" | "high" | "always"; // normal = 1/24, high = 1/8, always = 100%

  // Special effects
  recoil?: number; // % of damage dealt
  drain?: number; // % of damage dealt healed
  flinchChance?: number;
  statChanges?: {
    target: "user" | "opponent";
    stats: Partial<Record<keyof StatModifiers, number>>;
    chance: number; // 0-100
  }[];
  statusChance?: {
    status: Status;
    chance: number;
  };
  weatherEffect?: Weather; // Sets weather when used
  terrainEffect?: Terrain; // Sets terrain when used
  hazardEffect?:
    | "stealth-rock"
    | "spikes"
    | "toxic-spikes"
    | "sticky-web"
    | "rapid-spin"
    | "defog"; // Sets or removes hazards

  // Multi-hit
  hits?: number | [number, number]; // exact or range

  // Special AI flags
  isHighCritMove?: boolean;
  isTrappingMove?: boolean;
  isSpeedReductionMove?: boolean;
  isAttackReductionMove?: boolean;

  // AI scoring (from ai_logic.txt)
  specialAIScore?: number;
  aiConditions?: string[]; // Describe special AI conditions
}

// ============================================================================
// Pokemon Instance Types
// ============================================================================

export interface PokemonInstance {
  species: string;
  nickname?: string;
  level: number;

  // Base stats & IVs/EVs
  baseStats: Stats;
  ivs: Stats;
  evs: Stats;
  nature: Nature;

  // Calculated stats
  stats: Stats;

  // Battle details
  ability: string;
  item?: string;
  moves: Move[];
  types: [PokemonType] | [PokemonType, PokemonType];

  // Current battle state
  currentHp: number;
  currentPP: number[]; // Parallel to moves array
  status: Status;
  statModifiers: StatModifiers;

  // Nuzlocke tracking
  canDie: boolean; // false for player's valued mons in risk-averse mode
}

export interface Nature {
  name: string;
  plusStat?: StatName;
  minusStat?: StatName;
}

// ============================================================================
// Battle State Types
// ============================================================================

export interface BattleState {
  turn: number;

  // Active Pokemon
  playerActive: PokemonInstance;
  opponentActive: PokemonInstance;

  // Benched Pokemon
  playerTeam: PokemonInstance[];
  opponentTeam: PokemonInstance[];

  // Field conditions
  weather: Weather;
  weatherTurns: number;
  terrain: Terrain;
  terrainTurns: number;

  // Hazards
  playerHazards: {
    stealthRock: boolean;
    spikes: number; // 0-3
    toxicSpikes: number; // 0-2
    stickyWeb: boolean;
  };
  opponentHazards: {
    stealthRock: boolean;
    spikes: number;
    toxicSpikes: number;
    stickyWeb: boolean;
  };

  // Screens and other effects
  playerScreens: {
    lightScreen: number; // turns remaining
    reflect: number;
    auroraVeil: number;
  };
  opponentScreens: {
    lightScreen: number;
    reflect: number;
    auroraVeil: number;
  };

  // Special conditions
  trickRoom: number; // turns remaining
  tailwind: {
    player: number;
    opponent: number;
  };

  // Future Sight / Doom Desire tracking
  futureAttacks: {
    target: "player" | "opponent";
    turnsRemaining: number;
    damage: number;
  }[];
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionType = "move" | "switch" | "item";

export interface MoveAction {
  type: "move";
  moveIndex: number; // Index into Pokemon's move array
  moveName: string;
}

export interface SwitchAction {
  type: "switch";
  targetIndex: number; // Index into team array
  targetName: string;
}

export interface ItemAction {
  type: "item";
  itemName: string;
  targetIndex?: number; // For items used on specific Pokemon
}

export type BattleAction = MoveAction | SwitchAction | ItemAction;

// ============================================================================
// Damage Calculation Types
// ============================================================================

export interface DamageRange {
  min: number;
  max: number;
  minPercent: number; // % of target's max HP
  maxPercent: number;
  guaranteedKO: boolean;
  possibleKO: boolean;
  koChance?: number; // 0-100, if possibleKO is true
}

export interface DamageCalculation {
  move: Move;
  attacker: PokemonInstance;
  defender: PokemonInstance;
  battleState: BattleState;

  damageRange: DamageRange;

  // Additional roll factors
  critChance: number; // 0-100
  accuracy: number; // 0-100

  // Critical hit damage (if applicable)
  critDamage?: DamageRange;

  // Side effects
  secondaryEffectChance?: number;
  recoilDamage?: number;
  drainHeal?: number;
}

// ============================================================================
// AI Logic Types
// ============================================================================

export interface AIScore {
  move: Move;
  moveIndex: number;
  score: number;
  breakdown: {
    baseScore: number;
    damageScore: number; // +6 or +8
    killBonus?: number; // +3 or +6
    speedBonus?: number; // Various
    specialBonus?: number; // Move-specific AI
    randomVariation: number; // +0 or +2
  };
  reasoning: string[]; // Human-readable explanation
}

export interface AISwitchScore {
  pokemonIndex: number;
  pokemon: PokemonInstance;
  score: number; // Based on switch AI scoring table
  reasoning: string;
}

export interface AIDecision {
  action: BattleAction;
  scores: AIScore[]; // All calculated scores
  chosenScore: AIScore | AISwitchScore;
  willSwitch: boolean;
}

// ============================================================================
// Line of Play Types
// ============================================================================

export interface TurnOutcome {
  turnNumber: number;
  playerAction: BattleAction;
  opponentAction: BattleAction;

  // Who moves first (accounting for priority, speed, etc.)
  firstMover: "player" | "opponent";

  // Results
  playerDamageDealt?: DamageCalculation;
  opponentDamageDealt?: DamageCalculation;

  playerFainted: boolean;
  opponentFainted: boolean;

  // State after moves resolve
  resultingState: BattleState;

  // Risk factors
  risksInvolved: Risk[];
}

export interface Risk {
  type: "damage-roll" | "accuracy" | "crit" | "secondary-effect" | "speed-tie";
  description: string;
  probability: number; // 0-100
  impact: "minor" | "moderate" | "severe" | "catastrophic";

  // What happens if this risk occurs
  failureMode?: string;
}

export interface LineOfPlay {
  id: string;
  turns: TurnOutcome[];

  // Final result
  victory: boolean;
  playerCasualties: string[]; // Names of fainted Pokemon
  opponentCasualties: string[];

  // Aggregate risk assessment
  overallRisk: "none" | "low" | "medium" | "high" | "extreme";
  guaranteedSuccess: boolean; // True if no RNG can cause failure
  successProbability: number; // 0-100

  // Categorization
  requiresCrits: boolean;
  requiresHits: boolean; // Accuracy-dependent
  requiresSecondaryEffects: boolean;

  // Key moments
  keyRisks: Risk[];
  explanation: string[]; // Human-readable step-by-step
}

// ============================================================================
// Search/Solver Types
// ============================================================================

export interface SearchOptions {
  maxDepth: number; // Maximum turns to search
  maxLines: number; // Maximum number of lines to return

  // Risk tolerance
  allowDeaths: boolean;
  maxDeaths: number;
  allowCritDependence: boolean;
  allowAccuracyDependence: boolean;
  minSuccessProbability: number; // 0-100

  // Optimization targets
  prioritize: "safety" | "speed" | "pp-conservation";

  // MVP Constraints
  allowItems: boolean;
  allowPreDamage: boolean;
  allowPPStall: boolean;
}

export interface SearchState {
  battleState: BattleState;
  depth: number;
  actionsThisLine: TurnOutcome[];
  totalRisk: number;
  playerCasualties: number;
}

// ============================================================================
// User Input Types (for UI)
// ============================================================================

export interface PlayerTeamImport {
  pokemon: PokemonInstance[];
  source: "manual" | "paste" | "file";
}

export interface OpponentTrainer {
  name: string;
  team: PokemonInstance[];
  aiScript?: string; // Special AI behavior notes
}

// ============================================================================
// Utility Types
// ============================================================================

export type TypeEffectiveness = 0 | 0.25 | 0.5 | 1 | 2 | 4;

export interface TypeMatchup {
  attackingType: PokemonType;
  defendingTypes: PokemonType[];
  effectiveness: TypeEffectiveness;
  immunities: PokemonType[];
  resistances: PokemonType[];
  weaknesses: PokemonType[];
}
