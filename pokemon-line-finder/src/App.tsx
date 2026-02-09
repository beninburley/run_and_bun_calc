import { useState } from "react";
import "./App.css";
import { findLines, DEFAULT_SEARCH_OPTIONS } from "./engine/lineFinder";
import { getMockBattle1, getMockBattle2 } from "./utils/testData";
import { LineOfPlay } from "./types";

function App() {
  const [lines, setLines] = useState<LineOfPlay[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<"battle1" | "battle2">(
    "battle1",
  );

  const runLineFinder = () => {
    setIsSearching(true);
    setLines([]);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const battle =
          selectedBattle === "battle1" ? getMockBattle1() : getMockBattle2();

        console.log("Starting battle simulation...");
        const foundLines = findLines(battle.playerTeam, battle.opponentTeam, {
          ...DEFAULT_SEARCH_OPTIONS,
          maxLines: 5,
          maxDepth: 10,
        });

        setLines(foundLines);
        console.log("Search complete!", foundLines);
      } catch (error) {
        console.error("Error during line search:", error);
      } finally {
        setIsSearching(false);
      }
    }, 100);
  };

  return (
    <div className="App">
      <h1>Pokémon Run & Bun - Line Finder</h1>
      <p>Battle strategy calculator for Nuzlocke runs</p>

      <div style={{ margin: "20px 0" }}>
        <h2>Development Status</h2>
        <ul style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto" }}>
          <li>✅ Project setup complete</li>
          <li>✅ Type definitions</li>
          <li>✅ Damage calculator</li>
          <li>✅ AI logic implementation</li>
          <li>✅ Battle simulator</li>
          <li>✅ Line-finding algorithm</li>
          <li>🔄 React UI (in progress)</li>
        </ul>
      </div>

      <div
        style={{
          margin: "30px 0",
          padding: "20px",
          background: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <h2>Test Battle Scenarios</h2>

        <div style={{ margin: "20px 0" }}>
          <label style={{ marginRight: "10px" }}>
            <input
              type="radio"
              value="battle1"
              checked={selectedBattle === "battle1"}
              onChange={(e) => setSelectedBattle(e.target.value as "battle1")}
            />
            Battle 1: Charizard vs Venusaur (Simple)
          </label>
          <label>
            <input
              type="radio"
              value="battle2"
              checked={selectedBattle === "battle2"}
              onChange={(e) => setSelectedBattle(e.target.value as "battle2")}
            />
            Battle 2: Lucario/Garchomp vs Steelix/Alakazam (Complex)
          </label>
        </div>

        <button
          onClick={runLineFinder}
          disabled={isSearching}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: isSearching ? "wait" : "pointer",
            backgroundColor: isSearching ? "#ccc" : "#646cff",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {isSearching ? "Searching..." : "Find Battle Lines"}
        </button>
      </div>

      {lines.length > 0 && (
        <div
          style={{
            margin: "30px 0",
            textAlign: "left",
            maxWidth: "800px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <h2>
            Found {lines.length} Viable Line{lines.length !== 1 ? "s" : ""}
          </h2>

          {lines.map((line, index) => (
            <div
              key={line.id}
              style={{
                margin: "20px 0",
                padding: "15px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                backgroundColor: line.guaranteedSuccess ? "#e8f5e9" : "#fff3e0",
              }}
            >
              <h3>
                Line {index + 1}
                {line.guaranteedSuccess && " ✅ (Guaranteed)"}
                {!line.guaranteedSuccess &&
                  ` (${line.successProbability.toFixed(1)}% success)`}
              </h3>

              <div style={{ marginBottom: "10px" }}>
                <strong>Risk Level:</strong> {line.overallRisk.toUpperCase()}
                {" | "}
                <strong>Turns:</strong> {line.turns.length}
                {" | "}
                <strong>Casualties:</strong>{" "}
                {line.playerCasualties.length === 0
                  ? "None"
                  : line.playerCasualties.join(", ")}
              </div>

              {line.requiresCrits && (
                <div style={{ color: "#f57c00", marginBottom: "5px" }}>
                  ⚠️ Requires critical hits
                </div>
              )}
              {line.requiresHits && (
                <div style={{ color: "#f57c00", marginBottom: "5px" }}>
                  ⚠️ Requires moves to hit (accuracy dependent)
                </div>
              )}

              <div style={{ marginTop: "10px" }}>
                <strong>Strategy:</strong>
                <ol style={{ marginTop: "5px" }}>
                  {line.explanation.map((step, i) => (
                    <li key={i} style={{ marginBottom: "5px" }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {line.keyRisks.length > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#fff",
                    borderRadius: "4px",
                  }}
                >
                  <strong>Key Risks:</strong>
                  <ul style={{ marginTop: "5px" }}>
                    {line.keyRisks.map((risk, i) => (
                      <li key={i}>
                        {risk.description} ({risk.probability.toFixed(1)}% -{" "}
                        {risk.impact})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isSearching && lines.length === 0 && (
        <div style={{ margin: "20px 0", color: "#666" }}>
          <p>Click "Find Battle Lines" to calculate optimal strategies</p>
        </div>
      )}
    </div>
  );
}

export default App;
