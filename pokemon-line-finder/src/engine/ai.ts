/**
 * AI decision engine for Pokémon Run & Bun
 * Implements the exact AI scoring logic from ai_logic.txt and ai_switch_logic.txt
 */

import {
  Move,
  PokemonInstance,
  BattleState,
  AIScore,
  AISwitchScore,
  AIDecision,
  BattleAction,
} from "../types";

import { calculateFullDamage, getEffectiveStat } from "./damage";

import {
  AI_SCORES,
  AI_SCORE_RANDOM_CHANCE,
  AI_SCORE_RANDOM_BONUS,
  AI_INEFFECTIVE_SCORE_THRESHOLD,
} from "../data/constants";

/**
 * Roll for AI score randomization
 * ~80% chance of 0, ~20% chance of +2
 */
function getAIRandomBonus(): number {
  return Math.random() < AI_SCORE_RANDOM_CHANCE ? AI_SCORE_RANDOM_BONUS : 0;
}

/**
 * Check if AI mon is faster than player mon
 */
function isAIFaster(
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  battleState: BattleState,
): boolean {
  const aiSpeed = getEffectiveStat(aiMon.stats.spe, aiMon.statModifiers.spe);
  const playerSpeed = getEffectiveStat(
    playerMon.stats.spe,
    playerMon.statModifiers.spe,
  );

  // Trick Room reverses speed
  if (battleState.trickRoom > 0) {
    return aiSpeed <= playerSpeed; // AI sees speed ties as them being faster
  }

  return aiSpeed >= playerSpeed; // AI sees speed ties as them being faster
}

/**
 * Check if a move KOs the target
 */
function doesMoveKO(
  move: Move,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  battleState: BattleState,
  requireGuaranteed: boolean = false,
): boolean {
  const damageCalc = calculateFullDamage(move, attacker, defender, battleState);

  if (requireGuaranteed) {
    return damageCalc.damageRange.guaranteedKO;
  }

  return damageCalc.damageRange.possibleKO;
}

/**
 * Calculate AI score for a damaging move
 */
function scoreDamagingMove(
  move: Move,
  moveIndex: number,
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  battleState: BattleState,
  highestDamageIndex: number,
): AIScore {
  const reasoning: string[] = [];
  let baseScore = 0;
  let damageScore = 0;
  let killBonus = 0;
  let speedBonus = 0;
  let specialBonus = 0;

  const randomVariation = getAIRandomBonus();

  const damageCalc = calculateFullDamage(move, aiMon, playerMon, battleState);
  const isKill = damageCalc.damageRange.possibleKO;
  const isFaster = isAIFaster(aiMon, playerMon, battleState);
  const hasHighPriority = move.priority > 0 && !isFaster;

  // Check if this is the highest damaging move
  const isHighestDamage = moveIndex === highestDamageIndex;

  // Highest damaging move gets +6 or +8
  if (isHighestDamage) {
    damageScore = AI_SCORES.HIGHEST_DAMAGE_BASE + randomVariation;
    reasoning.push(`Highest damaging move: +${damageScore}`);
  }

  // Kill bonuses
  if (isKill) {
    if (isFaster || hasHighPriority) {
      killBonus = AI_SCORES.FAST_KILL_BONUS;
      reasoning.push(`Fast kill bonus: +${killBonus}`);
    } else {
      killBonus = AI_SCORES.SLOW_KILL_BONUS;
      reasoning.push(`Slow kill bonus: +${killBonus}`);
    }

    // Moxie/Beast Boost/etc.
    if (
      ["Moxie", "Beast Boost", "Chilling Neigh", "Grim Neigh"].includes(
        aiMon.ability,
      )
    ) {
      killBonus += AI_SCORES.MOXIE_KILL_BONUS;
      reasoning.push(
        `Stat-boosting ability on kill: +${AI_SCORES.MOXIE_KILL_BONUS}`,
      );
    }
  }

  // High crit + super effective
  if (move.critChance === "high" && damageCalc.damageRange.maxPercent > 100) {
    if (Math.random() < 0.5) {
      speedBonus += AI_SCORES.HIGH_CRIT_SE_BONUS;
      reasoning.push(
        `High crit rate + super effective: +${AI_SCORES.HIGH_CRIT_SE_BONUS}`,
      );
    }
  }

  // Priority moves when AI is threatened
  if (move.priority > 0 && !isFaster) {
    const playerCanKillAI = aiMon.moves.some((m) =>
      doesMoveKO(m, playerMon, aiMon, battleState, false),
    );

    if (playerCanKillAI) {
      speedBonus += AI_SCORES.PRIORITY_THREATENED;
      reasoning.push(
        `Priority move while threatened: +${AI_SCORES.PRIORITY_THREATENED}`,
      );
    }
  }

  const totalScore =
    baseScore + damageScore + killBonus + speedBonus + specialBonus;

  return {
    move,
    moveIndex,
    score: totalScore,
    breakdown: {
      baseScore,
      damageScore,
      killBonus,
      speedBonus,
      specialBonus,
      randomVariation,
    },
    reasoning,
  };
}

/**
 * Calculate AI score for a status move
 */
function scoreStatusMove(
  move: Move,
  moveIndex: number,
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  battleState: BattleState,
): AIScore {
  const reasoning: string[] = [];
  let score = AI_SCORES.STATUS_MOVE_DEFAULT;

  const moveName = move.name.toLowerCase();

  // Stealth Rock
  if (moveName === "stealth rock") {
    if (battleState.turn === 1) {
      score =
        Math.random() < 0.25
          ? AI_SCORES.HAZARD_FIRST_TURN_LOW
          : AI_SCORES.HAZARD_FIRST_TURN_HIGH;
      reasoning.push(`Stealth Rock on first turn: ${score}`);
    } else {
      score =
        Math.random() < 0.25
          ? AI_SCORES.HAZARD_LATER_LOW
          : AI_SCORES.HAZARD_LATER_HIGH;
      reasoning.push(`Stealth Rock later: ${score}`);
    }
  }

  // Spikes / Toxic Spikes
  else if (moveName === "spikes" || moveName === "toxic spikes") {
    if (battleState.turn === 1) {
      score =
        Math.random() < 0.25
          ? AI_SCORES.HAZARD_FIRST_TURN_LOW
          : AI_SCORES.HAZARD_FIRST_TURN_HIGH;
    } else {
      score =
        Math.random() < 0.25
          ? AI_SCORES.HAZARD_LATER_LOW
          : AI_SCORES.HAZARD_LATER_HIGH;
    }

    // Already has layers penalty
    const existingLayers =
      moveName === "spikes"
        ? battleState.playerHazards.spikes
        : battleState.playerHazards.toxicSpikes;

    if (existingLayers > 0) {
      score -= 1;
      reasoning.push(`Already has ${moveName}: -1`);
    }

    reasoning.push(`${moveName} score: ${score}`);
  }

  // Sticky Web
  else if (moveName === "sticky web") {
    if (battleState.turn === 1) {
      score = Math.random() < 0.25 ? 9 : 12;
    } else {
      score = Math.random() < 0.25 ? 6 : 9;
    }
    reasoning.push(`Sticky Web score: ${score}`);
  }

  // Protect / Detect / King's Shield
  else if (["protect", "detect", "king's shield"].includes(moveName)) {
    score = 6;

    // Affliction penalty
    const aiAfflicted = ["poison", "burn", "badly-poison"].includes(
      aiMon.status,
    );
    if (aiAfflicted) {
      score += AI_SCORES.PROTECT_AFFLICTED_PENALTY;
      reasoning.push(`AI afflicted: ${AI_SCORES.PROTECT_AFFLICTED_PENALTY}`);
    }

    // Opponent afflicted bonus
    const playerAfflicted = ["poison", "burn", "badly-poison"].includes(
      playerMon.status,
    );
    if (playerAfflicted) {
      score += AI_SCORES.PROTECT_OPPONENT_AFFLICTED_BONUS;
      reasoning.push(
        `Player afflicted: +${AI_SCORES.PROTECT_OPPONENT_AFFLICTED_BONUS}`,
      );
    }

    // First turn penalty (singles only)
    if (battleState.turn === 1) {
      score += AI_SCORES.PROTECT_FIRST_TURN_PENALTY;
      reasoning.push(`First turn: ${AI_SCORES.PROTECT_FIRST_TURN_PENALTY}`);
    }

    reasoning.push(`Protect score: ${score}`);
  }

  // Trick Room
  else if (moveName === "trick room") {
    if (battleState.trickRoom > 0) {
      score = -20;
      reasoning.push(`TR already active: -20`);
    } else {
      const aiSpeed = getEffectiveStat(
        aiMon.stats.spe,
        aiMon.statModifiers.spe,
      );
      const playerSpeed = getEffectiveStat(
        playerMon.stats.spe,
        playerMon.statModifiers.spe,
      );

      if (aiSpeed < playerSpeed) {
        score = AI_SCORES.TRICK_ROOM_SLOWER;
        reasoning.push(`AI slower, TR beneficial: ${score}`);
      } else {
        score = AI_SCORES.TRICK_ROOM_OTHER;
        reasoning.push(`AI not slower, TR less beneficial: ${score}`);
      }
    }
  }

  // Tailwind
  else if (moveName === "tailwind") {
    const aiSpeed = getEffectiveStat(aiMon.stats.spe, aiMon.statModifiers.spe);
    const playerSpeed = getEffectiveStat(
      playerMon.stats.spe,
      playerMon.statModifiers.spe,
    );

    if (aiSpeed < playerSpeed) {
      score = AI_SCORES.TAILWIND_SLOWER;
      reasoning.push(`AI slower: ${score}`);
    } else {
      score = AI_SCORES.TAILWIND_OTHER;
      reasoning.push(`AI not slower: ${score}`);
    }
  }

  // Setup moves - simplified for MVP
  else if (
    [
      "swords dance",
      "nasty plot",
      "dragon dance",
      "calm mind",
      "bulk up",
    ].includes(moveName)
  ) {
    const playerCanKO = playerMon.moves.some((m) =>
      doesMoveKO(m, playerMon, aiMon, battleState, false),
    );

    if (playerCanKO) {
      score = -20;
      reasoning.push(`Player can KO, no setup: -20`);
    } else {
      score = 6;
      reasoning.push(`Setup move base: 6`);
    }
  }

  // Recovery moves - simplified
  else if (["recover", "roost", "softboiled", "slack off"].includes(moveName)) {
    const hpPercent = (aiMon.currentHp / aiMon.stats.hp) * 100;

    if (hpPercent >= 85) {
      score = -6;
      reasoning.push(`HP too high for recovery: -6`);
    } else if (hpPercent < 40) {
      score = 7;
      reasoning.push(`Low HP, prioritize recovery: 7`);
    } else {
      score = Math.random() < 0.5 ? 7 : 5;
      reasoning.push(`Medium HP, recovery: ${score}`);
    }
  }

  // Default for other status moves
  else {
    reasoning.push(`Default status move: ${score}`);
  }

  return {
    move,
    moveIndex,
    score,
    breakdown: {
      baseScore: score,
      damageScore: 0,
      randomVariation: 0,
    },
    reasoning,
  };
}

/**
 * Find the index of the highest damaging move
 */
function findHighestDamageMove(
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  battleState: BattleState,
): number {
  let highestDamage = -1;
  let highestIndex = 0;

  aiMon.moves.forEach((move, index) => {
    // Skip moves with special AI that don't calculate normal damage
    const skipDamageCalc = [
      "explosion",
      "final gambit",
      "relic song",
      "rollout",
      "meteor beam",
      "future sight",
    ].includes(move.name.toLowerCase());

    if (skipDamageCalc || move.category === "status") {
      return;
    }

    const damageCalc = calculateFullDamage(move, aiMon, playerMon, battleState);
    const maxDamage = damageCalc.damageRange.max;

    if (maxDamage > highestDamage) {
      highestDamage = maxDamage;
      highestIndex = index;
    }
  });

  return highestIndex;
}

/**
 * Calculate AI scores for all moves and determine best action
 */
export function calculateAIDecision(
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  aiTeam: PokemonInstance[],
  battleState: BattleState,
): AIDecision {
  const scores: AIScore[] = [];

  // Find highest damaging move first
  const highestDamageIndex = findHighestDamageMove(
    aiMon,
    playerMon,
    battleState,
  );

  // Score each move
  aiMon.moves.forEach((move, index) => {
    if (move.category === "status") {
      scores.push(scoreStatusMove(move, index, aiMon, playerMon, battleState));
    } else {
      scores.push(
        scoreDamagingMove(
          move,
          index,
          aiMon,
          playerMon,
          battleState,
          highestDamageIndex,
        ),
      );
    }
  });

  // Find highest scoring move(s)
  const maxScore = Math.max(...scores.map((s) => s.score));
  const topScores = scores.filter((s) => s.score === maxScore);

  // AI randomly selects among tied moves
  const chosenScore = topScores[Math.floor(Math.random() * topScores.length)];

  // Check if AI will switch (simplified for MVP)
  const willSwitch = shouldAISwitch(
    aiMon,
    playerMon,
    aiTeam,
    maxScore,
    battleState,
  );

  let action: BattleAction;
  if (willSwitch) {
    // Select switch target (simplified - picks first viable mon)
    const switchTarget = selectSwitchTarget(
      aiMon,
      playerMon,
      aiTeam,
      battleState,
    );
    action = {
      type: "switch",
      targetIndex: switchTarget,
      targetName: aiTeam[switchTarget].species,
    };
  } else {
    action = {
      type: "move",
      moveIndex: chosenScore.moveIndex,
      moveName: chosenScore.move.name,
    };
  }

  return {
    action,
    scores,
    chosenScore,
    willSwitch,
  };
}

/**
 * Determine if AI should switch (based on switch AI logic)
 */
function shouldAISwitch(
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  aiTeam: PokemonInstance[],
  bestMoveScore: number,
  battleState: BattleState,
): boolean {
  // Singles only
  // TODO: AI never switches in doubles except niche cases

  // Condition 1: Only ineffective moves available
  if (bestMoveScore > AI_INEFFECTIVE_SCORE_THRESHOLD) {
    return false; // Has effective moves
  }

  // Condition 2: Must have viable switch target
  const viableSwitch = aiTeam.some((mon) => {
    if (mon.currentHp <= 0 || mon === aiMon) return false;

    const monSpeed = getEffectiveStat(mon.stats.spe, mon.statModifiers.spe);
    const playerSpeed = getEffectiveStat(
      playerMon.stats.spe,
      playerMon.statModifiers.spe,
    );

    // Check if faster and not OHKO'd, or slower and not 2HKO'd (buggy condition)
    if (monSpeed > playerSpeed) {
      // Check if not OHKO'd
      const wouldBeOHKO = playerMon.moves.some((move) =>
        doesMoveKO(move, playerMon, mon, battleState, true),
      );
      return !wouldBeOHKO;
    }

    // Due to bug, if one mon is faster, AI thinks all subsequent mons are faster
    return true;
  });

  if (!viableSwitch) {
    return false;
  }

  // Condition 3: AI must not be below 50% HP
  const hpPercent = aiMon.currentHp / aiMon.stats.hp;
  if (hpPercent < 0.5) {
    return false;
  }

  // All conditions met - 50% chance to switch
  return Math.random() < AI_SCORES.SWITCH_CHANCE;
}

/**
 * Select which Pokémon to switch to (based on switch scoring)
 */
function selectSwitchTarget(
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  aiTeam: PokemonInstance[],
  battleState: BattleState,
): number {
  const scores: AISwitchScore[] = [];

  aiTeam.forEach((mon, index) => {
    if (mon.currentHp <= 0 || mon === aiMon) {
      return; // Skip fainted and current mon
    }

    const score = calculateSwitchScore(mon, playerMon, battleState);
    scores.push({
      pokemonIndex: index,
      pokemon: mon,
      score: score.score,
      reasoning: score.reasoning,
    });
  });

  // Select highest scoring
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.pokemonIndex ?? 0;
}

/**
 * Calculate switch-in score (from ai_switch_logic.txt)
 */
function calculateSwitchScore(
  switchMon: PokemonInstance,
  playerMon: PokemonInstance,
  battleState: BattleState,
): { score: number; reasoning: string } {
  // Special cases
  if (switchMon.species.toLowerCase() === "ditto") {
    return { score: 2, reasoning: "Ditto: +2" };
  }

  if (["Wynaut", "Wobbuffet"].includes(switchMon.species)) {
    const isFaster = isAIFaster(switchMon, playerMon, battleState);
    const isOHKOd = playerMon.moves.some((m) =>
      doesMoveKO(m, playerMon, switchMon, battleState, true),
    );

    if (!(isFaster && isOHKOd)) {
      return { score: 2, reasoning: "Wobbuffet/Wynaut: +2" };
    }
  }

  // Normal scoring
  const monSpeed = getEffectiveStat(
    switchMon.stats.spe,
    switchMon.statModifiers.spe,
  );
  const playerSpeed = getEffectiveStat(
    playerMon.stats.spe,
    playerMon.statModifiers.spe,
  );
  const isFaster = monSpeed > playerSpeed;

  const isOHKOd = playerMon.moves.some((m) =>
    doesMoveKO(m, playerMon, switchMon, battleState, true),
  );

  // +5: Faster and OHKOs
  const canOHKO = switchMon.moves.some((m) =>
    doesMoveKO(m, switchMon, playerMon, battleState, true),
  );

  if (isFaster && canOHKO) {
    return { score: 5, reasoning: "Faster + OHKO player: +5" };
  }

  // +4: Slower but OHKOs and not OHKO'd
  if (!isFaster && canOHKO && !isOHKOd) {
    return { score: 4, reasoning: "Slower, OHKOs, not OHKO'd: +4" };
  }

  // +3: Faster and deals more damage %
  // +2: Slower and deals more damage %
  // (Simplified - would need full damage comparison)

  // +1: Faster
  if (isFaster) {
    return { score: 1, reasoning: "Faster: +1" };
  }

  // 0: Default
  return { score: 0, reasoning: "Default: 0" };
}
