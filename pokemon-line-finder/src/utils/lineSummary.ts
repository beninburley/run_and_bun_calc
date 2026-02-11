import { BattleState, LineOfPlay, Status } from "../types";

type FieldEffectSummary = {
  global: string[];
  playerSide: string[];
  opponentSide: string[];
};

export function getLineFinalState(line: LineOfPlay): BattleState | null {
  if (!line.turns.length) {
    return null;
  }
  return line.turns[line.turns.length - 1].resultingState;
}

export function getHazardSummary(
  state: BattleState,
  side: "player" | "opponent",
): string[] {
  const hazards =
    side === "player" ? state.playerHazards : state.opponentHazards;
  const summary: string[] = [];

  if (hazards.stealthRock) {
    summary.push("Stealth Rock");
  }
  if (hazards.spikes > 0) {
    summary.push(`Spikes x${hazards.spikes}`);
  }
  if (hazards.toxicSpikes > 0) {
    summary.push(`Toxic Spikes x${hazards.toxicSpikes}`);
  }
  if (hazards.stickyWeb) {
    summary.push("Sticky Web");
  }

  return summary;
}

export function getFieldEffectSummary(state: BattleState): FieldEffectSummary {
  const global: string[] = [];
  const playerSide: string[] = [];
  const opponentSide: string[] = [];

  if (state.weather !== "clear") {
    global.push(`Weather: ${formatWeather(state.weather)}`);
  }
  if (state.terrain !== "none") {
    global.push(`Terrain: ${formatTerrain(state.terrain)}`);
  }
  if (state.trickRoom > 0) {
    global.push(`Trick Room (${state.trickRoom})`);
  }

  const playerScreens = buildScreenSummary(state.playerScreens);
  const opponentScreens = buildScreenSummary(state.opponentScreens);
  if (playerScreens.length) {
    playerSide.push(...playerScreens.map((screen) => `Screens: ${screen}`));
  }
  if (opponentScreens.length) {
    opponentSide.push(...opponentScreens.map((screen) => `Screens: ${screen}`));
  }

  if (state.tailwind.player > 0) {
    playerSide.push(`Tailwind (${state.tailwind.player})`);
  }
  if (state.tailwind.opponent > 0) {
    opponentSide.push(`Tailwind (${state.tailwind.opponent})`);
  }

  return { global, playerSide, opponentSide };
}

export function getStatusSummary(state: BattleState): {
  playerStatus: string;
  opponentStatus: string;
} {
  return {
    playerStatus: formatStatus(state.playerActive.status),
    opponentStatus: formatStatus(state.opponentActive.status),
  };
}

function buildScreenSummary(screens: BattleState["playerScreens"]): string[] {
  const summary: string[] = [];
  if (screens.reflect > 0) {
    summary.push(`Reflect (${screens.reflect})`);
  }
  if (screens.lightScreen > 0) {
    summary.push(`Light Screen (${screens.lightScreen})`);
  }
  if (screens.auroraVeil > 0) {
    summary.push(`Aurora Veil (${screens.auroraVeil})`);
  }
  return summary;
}

function formatStatus(status: Status): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "badly-poison":
      return "Badly Poisoned";
    default:
      return capitalize(status);
  }
}

function formatWeather(weather: BattleState["weather"]): string {
  switch (weather) {
    case "harsh-sun":
      return "Harsh Sun";
    case "heavy-rain":
      return "Heavy Rain";
    default:
      return capitalize(weather);
  }
}

function formatTerrain(terrain: BattleState["terrain"]): string {
  if (terrain === "none") {
    return "None";
  }
  return capitalize(terrain);
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
