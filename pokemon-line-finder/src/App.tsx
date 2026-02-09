import { useState } from "react";
import "./App.css";
import { findLines, DEFAULT_SEARCH_OPTIONS } from "./engine/lineFinder";
import { getMockBattle1, getMockBattle2 } from "./utils/testData";
import { LineOfPlay } from "./types";
import {
  runLineFinderTests,
  validateDamageCalculations,
  validateAILogic,
} from "./utils/testLineFinder";
import { getPokemonInfo } from "./data/pokemonService";
import type { CompletePokemonData } from "./data/pokemonService";

type TabType = "scenarios" | "tests" | "teambuilder";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("scenarios");
  const [lines, setLines] = useState<LineOfPlay[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<"battle1" | "battle2">(
    "battle1",
  );
  const [testOutput, setTestOutput] = useState<string>("");

  // Team builder state
  const [pokemonSearch, setPokemonSearch] = useState<string>("");
  const [pokemonData, setPokemonData] = useState<CompletePokemonData | null>(
    null,
  );
  const [isLoadingPokemon, setIsLoadingPokemon] = useState(false);
  const [pokemonError, setPokemonError] = useState<string>("");

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

  const runTests = () => {
    setTestOutput("Running tests...\n");

    // Capture console.log for display
    const originalLog = console.log;
    let output = "";
    console.log = (...args) => {
      const text = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg),
        )
        .join(" ");
      output += text + "\n";
      originalLog(...args);
    };

    try {
      // Run all test suites
      output += "\n";
      runLineFinderTests();
      output += "\n";
      validateDamageCalculations();
      output += "\n";
      validateAILogic();

      setTestOutput(output);
    } catch (error) {
      setTestOutput(output + "\n\nERROR: " + String(error));
    } finally {
      console.log = originalLog;
    }
  };

  const searchForPokemon = async () => {
    if (!pokemonSearch.trim()) return;

    setIsLoadingPokemon(true);
    setPokemonError("");
    setPokemonData(null);

    try {
      const data = await getPokemonInfo(pokemonSearch.trim());
      setPokemonData(data);
    } catch (error) {
      setPokemonError(`Error loading Pokemon: ${error}`);
    } finally {
      setIsLoadingPokemon(false);
    }
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

      {/* Tabs */}
      <div style={{ margin: "20px 0", borderBottom: "2px solid #ddd" }}>
        <button
          onClick={() => setActiveTab("scenarios")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: activeTab === "scenarios" ? "#646cff" : "#f5f5f5",
            color: activeTab === "scenarios" ? "white" : "#333",
            border: "none",
            borderRadius: "4px 4px 0 0",
            marginRight: "5px",
          }}
        >
          Battle Scenarios
        </button>
        <button
          onClick={() => setActiveTab("tests")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: activeTab === "tests" ? "#646cff" : "#f5f5f5",
            color: activeTab === "tests" ? "white" : "#333",
            border: "none",
            borderRadius: "4px 4px 0 0",
            marginRight: "5px",
          }}
        >
          Run Tests
        </button>
        <button
          onClick={() => setActiveTab("teambuilder")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor:
              activeTab === "teambuilder" ? "#646cff" : "#f5f5f5",
            color: activeTab === "teambuilder" ? "white" : "#333",
            border: "none",
            borderRadius: "4px 4px 0 0",
          }}
        >
          Team Builder
        </button>
      </div>

      {activeTab === "scenarios" && (
        <>
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
                  onChange={(e) =>
                    setSelectedBattle(e.target.value as "battle1")
                  }
                />
                Battle 1: Charizard vs Venusaur (Simple)
              </label>
              <label>
                <input
                  type="radio"
                  value="battle2"
                  checked={selectedBattle === "battle2"}
                  onChange={(e) =>
                    setSelectedBattle(e.target.value as "battle2")
                  }
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

              {lines.map((line, _index) => (
                <div
                  key={line.id}
                  style={{
                    margin: "20px 0",
                    padding: "15px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    backgroundColor: line.guaranteedSuccess
                      ? "#e8f5e9"
                      : "#fff3e0",
                  }}
                >
                  <h3>
                    Line {_index + 1}
                    {line.guaranteedSuccess && " ✅ (Guaranteed)"}
                    {!line.guaranteedSuccess &&
                      ` (${line.successProbability.toFixed(1)}% success)`}
                  </h3>

                  <div style={{ marginBottom: "10px" }}>
                    <strong>Risk Level:</strong>{" "}
                    {line.overallRisk.toUpperCase()}
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
        </>
      )}

      {activeTab === "tests" && (
        <div
          style={{
            margin: "30px 0",
            padding: "20px",
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <h2>Line Finder Tests</h2>
          <p>Validate that the line-finder produces expected results</p>

          <button
            onClick={runTests}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              cursor: "pointer",
              backgroundColor: "#646cff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              marginTop: "10px",
            }}
          >
            Run All Tests
          </button>

          {testOutput && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#1e1e1e",
                color: "#d4d4d4",
                borderRadius: "4px",
                textAlign: "left",
                fontFamily: "monospace",
                fontSize: "13px",
                whiteSpace: "pre-wrap",
                maxHeight: "600px",
                overflowY: "auto",
              }}
            >
              {testOutput}
            </div>
          )}
        </div>
      )}

      {activeTab === "teambuilder" && (
        <div
          style={{
            margin: "30px 0",
            padding: "20px",
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <h2>Team Builder (Data Fetching Test)</h2>
          <p>Search for a Pokemon to load its data from PokeAPI</p>

          <div style={{ margin: "20px 0" }}>
            <input
              type="text"
              value={pokemonSearch}
              onChange={(e) => setPokemonSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchForPokemon()}
              placeholder="Enter Pokemon name (e.g., charizard)"
              style={{
                padding: "10px",
                fontSize: "16px",
                width: "300px",
                marginRight: "10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={searchForPokemon}
              disabled={isLoadingPokemon}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                cursor: isLoadingPokemon ? "wait" : "pointer",
                backgroundColor: isLoadingPokemon ? "#ccc" : "#646cff",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              {isLoadingPokemon ? "Loading..." : "Search"}
            </button>
          </div>

          {pokemonError && (
            <div style={{ color: "red", margin: "10px 0" }}>{pokemonError}</div>
          )}

          {pokemonData && (
            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                background: "white",
                borderRadius: "8px",
                textAlign: "left",
                maxWidth: "600px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <h3>
                {pokemonData.displayName} #{pokemonData.id}
              </h3>

              {pokemonData.isModified && (
                <div
                  style={{
                    background: "#fff3cd",
                    padding: "10px",
                    borderRadius: "4px",
                    marginBottom: "10px",
                    color: "#856404",
                  }}
                >
                  ⚠️ Modified in Run & Bun:{" "}
                  {pokemonData.modifications || "Stats/moves changed"}
                </div>
              )}

              <div style={{ marginBottom: "15px" }}>
                <strong>Types:</strong> {pokemonData.types.join(", ")}
              </div>

              <div style={{ marginBottom: "15px" }}>
                <strong>Base Stats:</strong>
                <ul style={{ marginTop: "5px" }}>
                  <li>HP: {pokemonData.baseStats.hp}</li>
                  <li>Attack: {pokemonData.baseStats.atk}</li>
                  <li>Defense: {pokemonData.baseStats.def}</li>
                  <li>Sp. Atk: {pokemonData.baseStats.spa}</li>
                  <li>Sp. Def: {pokemonData.baseStats.spd}</li>
                  <li>Speed: {pokemonData.baseStats.spe}</li>
                  <li>
                    <strong>Total:</strong>{" "}
                    {Object.values(pokemonData.baseStats).reduce(
                      (a, b) => a + b,
                      0,
                    )}
                  </li>
                </ul>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <strong>Abilities:</strong> {pokemonData.abilities.join(", ")}
              </div>

              <div>
                <strong>Available Moves:</strong> {pokemonData.learnset.length}{" "}
                moves
                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "12px",
                    color: "#666",
                    maxHeight: "100px",
                    overflowY: "auto",
                  }}
                >
                  {pokemonData.learnset.slice(0, 20).join(", ")}
                  {pokemonData.learnset.length > 20 && "..."}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
