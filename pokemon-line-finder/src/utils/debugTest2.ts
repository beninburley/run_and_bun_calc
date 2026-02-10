// /**
//  * Debug test 2 specifically to understand why no lines are found
//  */

// import { findLines, DEFAULT_SEARCH_OPTIONS } from "../engine/lineFinder";
// import { getMockBattle2 } from "./testData";

// const { playerTeam, opponentTeam } = getMockBattle2();

// console.log("=== TEST 2 DEBUG ===");
// console.log("\nPlayer Team:");
// playerTeam.forEach((p) => {
//   console.log(
//     `  ${p.species}: ${p.stats.hp} HP, ${p.stats.atk} Atk, ${p.stats.def} Def, ${p.stats.spa} SpA, ${p.stats.spd} SpD, ${p.stats.spe} Spe`,
//   );
//   console.log(`    Moves: ${p.moves.map((m) => m.name).join(", ")}`);
// });

// console.log("\nOpponent Team:");
// opponentTeam.forEach((p) => {
//   console.log(
//     `  ${p.species}: ${p.stats.hp} HP, ${p.stats.atk} Atk, ${p.stats.def} Def, ${p.stats.spa} SpA, ${p.stats.spd} SpD, ${p.stats.spe} Spe`,
//   );
//   console.log(`    Moves: ${p.moves.map((m) => m.name).join(", ")}`);
// });

// console.log("\nRunning line finder with debug enabled...");
// console.log("Search options:", DEFAULT_SEARCH_OPTIONS);

// const lines = findLines(playerTeam, opponentTeam, DEFAULT_SEARCH_OPTIONS, true);

// console.log(`\n=== RESULT: Found ${lines.length} lines ===`);

// if (lines.length > 0) {
//   console.log("\nBest line:");
//   const bestLine = lines[0];
//   bestLine.turns.forEach((turn, i) => {
//     const playerMove =
//       turn.playerAction.type === "move"
//         ? turn.playerAction.moveName
//         : `Switch to ${turn.playerAction.targetName}`;
//     const opponentMove =
//       turn.opponentAction.type === "move"
//         ? turn.opponentAction.moveName
//         : `Switch to opponent`;
//     console.log(`  Turn ${i + 1}: ${playerMove} vs ${opponentMove}`);
//   });
//   console.log(
//     `  Risk: ${bestLine.guaranteedSuccess ? "guaranteed" : "probabilistic"} (${bestLine.overallRisk})`,
//   );
//   console.log(`  Success Probability: ${bestLine.successProbability}%`);
// }
