import { useState } from "react";
import "./App.css";
import { findLines, DEFAULT_SEARCH_OPTIONS } from "./engine/lineFinder";
import { getMockBattle1, getMockBattle2 } from "./utils/testData";
import { LineOfPlay, PokemonInstance } from "./types";
import {
  runLineFinderTests,
  validateDamageCalculations,
  validateAILogic,
} from "./utils/testLineFinder";
import { getPokemonInfo } from "./data/pokemonService";
import type { CompletePokemonData } from "./data/pokemonService";
import {
  exportTeam,
  importTeam,
  validateTeam,
  copyToClipboard,
} from "./utils/teamImportExport";
import { trainerCategories, getTrainerById } from "./data/trainers";

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

  // Team import/export state
  const [currentTeam, setCurrentTeam] = useState<PokemonInstance[]>([]);
  const [importText, setImportText] = useState<string>("");
  const [exportText, setExportText] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<"json" | "showdown">(
    "showdown",
  );
  const [importStatus, setImportStatus] = useState<string>("");
  const [exportStatus, setExportStatus] = useState<string>("");

  // Trainer selection state
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Gym Leaders");

  const runLineFinder = () => {
    setIsSearching(true);
    setLines([]);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        let playerTeam: PokemonInstance[];
        let opponentTeam: PokemonInstance[];

        // Determine player team
        if (currentTeam.length > 0) {
          playerTeam = currentTeam;
        } else {
          // Use mock battle player team
          const battle =
            selectedBattle === "battle1" ? getMockBattle1() : getMockBattle2();
          playerTeam = battle.playerTeam;
        }

        // Determine opponent team
        if (selectedTrainer) {
          const trainer = getTrainerById(selectedTrainer);
          if (trainer) {
            opponentTeam = trainer.team;
            console.log(`Starting battle against ${trainer.name}...`);
          } else {
            throw new Error("Selected trainer not found");
          }
        } else {
          // Use mock battle
          const battle =
            selectedBattle === "battle1" ? getMockBattle1() : getMockBattle2();
          opponentTeam = battle.opponentTeam;
          console.log("Starting battle simulation...");
        }

        const foundLines = findLines(playerTeam, opponentTeam, {
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

  const handleImportTeam = () => {
    try {
      const result = importTeam(importText);

      if (result.format === "json") {
        const team = result.data as PokemonInstance[];
        const validation = validateTeam(team);

        if (validation.valid) {
          setCurrentTeam(team);
          setImportStatus(
            `✅ Successfully imported ${team.length} Pokemon from JSON`,
          );
        } else {
          setImportStatus(
            `❌ Validation errors:\n${validation.errors.join("\n")}`,
          );
        }
      } else {
        // Showdown format - just show what was parsed
        setImportStatus(
          `✅ Parsed ${result.data.length} Pokemon from Showdown format.\n\nNote: Showdown format import requires additional game data conversion (not yet implemented).`,
        );
      }

      setImportText("");
    } catch (error) {
      setImportStatus(`❌ Import failed: ${error}`);
    }
  };

  const handleExportTeam = () => {
    try {
      if (currentTeam.length === 0) {
        setExportStatus("❌ No team to export. Load a team first.");
        return;
      }

      const exported = exportTeam(currentTeam, exportFormat);
      setExportText(exported.data);
      setExportStatus(`✅ Team exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      setExportStatus(`❌ Export failed: ${error}`);
    }
  };

  const handleCopyExport = async () => {
    if (!exportText) {
      setExportStatus("❌ Nothing to copy");
      return;
    }

    const success = await copyToClipboard(exportText);
    if (success) {
      setExportStatus("✅ Copied to clipboard!");
    } else {
      setExportStatus("❌ Failed to copy to clipboard");
    }
  };

  const loadMockTeam = () => {
    const battle = getMockBattle1();
    setCurrentTeam(battle.playerTeam);
    setImportStatus(
      `✅ Loaded mock team: ${battle.playerTeam.map((p) => p.species).join(", ")}`,
    );
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

            {/* Trainer Selection */}
            <div
              style={{
                marginBottom: "30px",
                padding: "20px",
                background: "white",
                borderRadius: "8px",
              }}
            >
              <h3>Opponent Trainer Database</h3>
              <p style={{ fontSize: "14px", color: "#666" }}>
                Select a trainer to battle against, or use the mock battles
                below
              </p>

              {/* Category Selection */}
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Category:
                </label>
                {trainerCategories.map((category) => (
                  <label key={category.name} style={{ marginRight: "15px" }}>
                    <input
                      type="radio"
                      value={category.name}
                      checked={selectedCategory === category.name}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedTrainer(null);
                      }}
                      style={{ marginRight: "5px" }}
                    />
                    {category.name}
                  </label>
                ))}
              </div>

              {/* Trainer Selection */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontWeight: "bold",
                    marginRight: "10px",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Select Trainer:
                </label>
                <select
                  value={selectedTrainer || ""}
                  onChange={(e) => setSelectedTrainer(e.target.value || null)}
                  style={{
                    padding: "8px",
                    fontSize: "14px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    minWidth: "250px",
                  }}
                >
                  <option value="">-- Choose a trainer --</option>
                  {trainerCategories
                    .find((c) => c.name === selectedCategory)
                    ?.trainers.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name} - {trainer.location}
                      </option>
                    ))}
                </select>
              </div>

              {/* Trainer Details */}
              {selectedTrainer &&
                (() => {
                  const trainer = getTrainerById(selectedTrainer);
                  if (!trainer) return null;

                  return (
                    <div
                      style={{
                        padding: "15px",
                        background: "#f9f9f9",
                        borderRadius: "4px",
                        marginTop: "15px",
                      }}
                    >
                      <h4 style={{ marginTop: 0 }}>
                        {trainer.name} - {trainer.title}
                      </h4>
                      <p style={{ margin: "5px 0", fontSize: "14px" }}>
                        <strong>Location:</strong> {trainer.location}
                      </p>
                      <p style={{ margin: "5px 0", fontSize: "14px" }}>
                        <strong>Difficulty:</strong>{" "}
                        {"★".repeat(trainer.difficulty)}
                        {"☆".repeat(5 - trainer.difficulty)}
                      </p>
                      {trainer.notes && (
                        <p
                          style={{
                            margin: "10px 0",
                            fontSize: "13px",
                            fontStyle: "italic",
                            color: "#555",
                          }}
                        >
                          💡 {trainer.notes}
                        </p>
                      )}
                      <div style={{ marginTop: "10px" }}>
                        <strong>Team ({trainer.team.length} Pokemon):</strong>
                        <ul style={{ marginTop: "5px", fontSize: "13px" }}>
                          {trainer.team.map((pokemon, i) => (
                            <li key={i}>
                              Lv.{pokemon.level} {pokemon.species} -{" "}
                              {pokemon.moves.map((m) => m.name).join(", ")}
                              {pokemon.item && ` @ ${pokemon.item}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
            </div>

            <h3 style={{ marginTop: "30px" }}>Mock Battles (For Testing)</h3>
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
                marginTop: "10px",
              }}
            >
              {isSearching
                ? "Searching..."
                : selectedTrainer
                  ? `Find Lines vs ${getTrainerById(selectedTrainer)?.name || "Trainer"}`
                  : "Find Battle Lines (Mock Battle)"}
            </button>

            {currentTeam.length === 0 && (
              <p style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
                💡 No team loaded. Using mock player team. Import a team in the
                Team Builder tab to use your own team.
              </p>
            )}
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
          <h2>Team Builder & Import/Export</h2>

          {/* Team Import/Export Section */}
          <div
            style={{
              marginBottom: "30px",
              padding: "20px",
              background: "white",
              borderRadius: "8px",
            }}
          >
            <h3>Team Management</h3>

            <div style={{ marginBottom: "20px" }}>
              <strong>Current Team:</strong>{" "}
              {currentTeam.length === 0 ? (
                <span style={{ color: "#999" }}>No team loaded</span>
              ) : (
                <span>
                  {currentTeam.map((p) => p.species).join(", ")} (
                  {currentTeam.length} Pokemon)
                </span>
              )}
            </div>

            <button
              onClick={loadMockTeam}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                cursor: "pointer",
                backgroundColor: "#646cff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                marginRight: "10px",
              }}
            >
              Load Mock Team (Charizard)
            </button>

            {/* Import Section */}
            <div style={{ marginTop: "20px", marginBottom: "20px" }}>
              <h4>Import Team</h4>
              <p style={{ fontSize: "14px", color: "#666" }}>
                Paste team data in JSON or Pokemon Showdown format
              </p>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste team data here..."
                style={{
                  width: "100%",
                  height: "150px",
                  padding: "10px",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  marginBottom: "10px",
                }}
              />

              <button
                onClick={handleImportTeam}
                disabled={!importText.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: importText.trim() ? "pointer" : "not-allowed",
                  backgroundColor: importText.trim() ? "#4caf50" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                Import Team
              </button>

              {importStatus && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    background: importStatus.includes("❌")
                      ? "#ffebee"
                      : "#e8f5e9",
                    color: importStatus.includes("❌") ? "#c62828" : "#2e7d32",
                    borderRadius: "4px",
                    fontSize: "14px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {importStatus}
                </div>
              )}
            </div>

            {/* Export Section */}
            <div style={{ marginTop: "20px" }}>
              <h4>Export Team</h4>
              <p style={{ fontSize: "14px", color: "#666" }}>
                Export your team to share or save
              </p>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ marginRight: "20px" }}>
                  <input
                    type="radio"
                    value="showdown"
                    checked={exportFormat === "showdown"}
                    onChange={() => setExportFormat("showdown")}
                    style={{ marginRight: "5px" }}
                  />
                  Pokemon Showdown Format
                </label>
                <label>
                  <input
                    type="radio"
                    value="json"
                    checked={exportFormat === "json"}
                    onChange={() => setExportFormat("json")}
                    style={{ marginRight: "5px" }}
                  />
                  JSON Format
                </label>
              </div>

              <button
                onClick={handleExportTeam}
                disabled={currentTeam.length === 0}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: currentTeam.length > 0 ? "pointer" : "not-allowed",
                  backgroundColor: currentTeam.length > 0 ? "#646cff" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  marginRight: "10px",
                }}
              >
                Export Team
              </button>

              {exportText && (
                <button
                  onClick={handleCopyExport}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    cursor: "pointer",
                    backgroundColor: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                  }}
                >
                  Copy to Clipboard
                </button>
              )}

              {exportStatus && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    background: exportStatus.includes("❌")
                      ? "#ffebee"
                      : "#e8f5e9",
                    color: exportStatus.includes("❌") ? "#c62828" : "#2e7d32",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  {exportStatus}
                </div>
              )}

              {exportText && (
                <textarea
                  value={exportText}
                  readOnly
                  style={{
                    width: "100%",
                    height: "200px",
                    padding: "10px",
                    fontSize: "14px",
                    fontFamily: "monospace",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    marginTop: "10px",
                    backgroundColor: "#f9f9f9",
                  }}
                />
              )}
            </div>
          </div>

          {/* Pokemon Search Section */}
          <div
            style={{
              padding: "20px",
              background: "white",
              borderRadius: "8px",
            }}
          >
            <h3>Pokemon Data Lookup</h3>
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
              <div style={{ color: "red", margin: "10px 0" }}>
                {pokemonError}
              </div>
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
                  <strong>Available Moves:</strong>{" "}
                  {pokemonData.learnset.length} moves
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
        </div>
      )}
    </div>
  );
}

export default App;
