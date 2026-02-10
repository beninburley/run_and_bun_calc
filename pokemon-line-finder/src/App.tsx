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
import { runItemTests } from "./utils/testItems";
import { runWeatherTests } from "./utils/testWeather";
import { runTerrainTests } from "./utils/testTerrain";
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
      output += "\n";
      runItemTests();
      output += "\n";
      runWeatherTests();
      output += "\n";
      runTerrainTests();

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

      <div className="mt-20 mb-20">
        <h2>Development Status</h2>
        <ul className="status-list">
          <li>✅ Project setup complete</li>
          <li>✅ Type definitions</li>
          <li>✅ Damage calculator</li>
          <li>✅ AI logic implementation</li>
          <li>✅ Battle simulator</li>
          <li>✅ Line-finding algorithm</li>
          <li>✅ Held items system</li>
          <li>✅ Weather effects system</li>
          <li>✅ Terrain effects system</li>
          <li>🔄 React UI (in progress)</li>
        </ul>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          onClick={() => setActiveTab("scenarios")}
          className={`tab-button ${activeTab === "scenarios" ? "active" : ""}`}
        >
          Battle Scenarios
        </button>
        <button
          onClick={() => setActiveTab("tests")}
          className={`tab-button ${activeTab === "tests" ? "active" : ""}`}
        >
          Run Tests
        </button>
        <button
          onClick={() => setActiveTab("teambuilder")}
          className={`tab-button ${activeTab === "teambuilder" ? "active" : ""}`}
        >
          Team Builder
        </button>
      </div>

      {activeTab === "scenarios" && (
        <>
          <div className="panel">
            <h2>Test Battle Scenarios</h2>

            {/* Trainer Selection */}
            <div className="card mb-30">
              <h3>Opponent Trainer Database</h3>
              <p className="text-small text-secondary">
                Select a trainer to battle against, or use the mock battles
                below
              </p>

              {/* Category Selection */}
              <div className="form-group">
                <label className="form-label">Category:</label>
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
                    />
                    {category.name}
                  </label>
                ))}
              </div>

              {/* Trainer Selection */}
              <div className="form-group">
                <label className="form-label">Select Trainer:</label>
                <select
                  value={selectedTrainer || ""}
                  onChange={(e) => setSelectedTrainer(e.target.value || null)}
                  className="form-select"
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
                    <div className="card card-highlight mt-15">
                      <h4 className="mt-0">
                        {trainer.name} - {trainer.title}
                      </h4>
                      <p className="text-small mb-5">
                        <strong>Location:</strong> {trainer.location}
                      </p>
                      <p className="text-small mb-5">
                        <strong>Difficulty:</strong>{" "}
                        {"★".repeat(trainer.difficulty)}
                        {"☆".repeat(5 - trainer.difficulty)}
                      </p>
                      {trainer.notes && (
                        <p
                          className="text-small text-muted mt-10"
                          style={{ fontStyle: "italic" }}
                        >
                          💡 {trainer.notes}
                        </p>
                      )}
                      <div className="mt-10">
                        <strong>Team ({trainer.team.length} Pokemon):</strong>
                        <ul className="text-small mt-5">
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

            <h3 className="mt-30">Mock Battles (For Testing)</h3>
            <div className="radio-group">
              <label>
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
              className="btn btn-primary mt-10"
              style={{ cursor: isSearching ? "wait" : "pointer" }}
            >
              {isSearching
                ? "Searching..."
                : selectedTrainer
                  ? `Find Lines vs ${getTrainerById(selectedTrainer)?.name || "Trainer"}`
                  : "Find Battle Lines (Mock Battle)"}
            </button>

            {currentTeam.length === 0 && (
              <p className="text-small text-secondary mt-10">
                💡 No team loaded. Using mock player team. Import a team in the
                Team Builder tab to use your own team.
              </p>
            )}
          </div>

          {lines.length > 0 && (
            <div
              className="mt-30"
              style={{
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
                  className="line-item"
                  style={{
                    backgroundColor: line.guaranteedSuccess
                      ? "var(--color-success-bg)"
                      : "var(--color-warning-bg)",
                  }}
                >
                  <h3>
                    Line {_index + 1}
                    {line.guaranteedSuccess && " ✅ (Guaranteed)"}
                    {!line.guaranteedSuccess &&
                      ` (${line.successProbability.toFixed(1)}% success)`}
                  </h3>

                  <div className="mb-10">
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
                    <div className="line-item-risk mb-5">
                      ⚠️ Requires critical hits
                    </div>
                  )}
                  {line.requiresHits && (
                    <div className="line-item-risk mb-5">
                      ⚠️ Requires moves to hit (accuracy dependent)
                    </div>
                  )}

                  <div className="mt-10">
                    <strong>Strategy:</strong>
                    <ol className="mt-5">
                      {line.explanation.map((step, i) => (
                        <li key={i} className="mb-5">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {line.keyRisks.length > 0 && (
                    <div className="card-highlight mt-10">
                      <strong>Key Risks:</strong>
                      <ul className="mt-5">
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
            <div className="text-secondary mt-20">
              <p>Click "Find Battle Lines" to calculate optimal strategies</p>
            </div>
          )}
        </>
      )}

      {activeTab === "tests" && (
        <div className="panel">
          <h2>Line Finder Tests</h2>
          <p>Validate that the line-finder produces expected results</p>

          <button onClick={runTests} className="btn btn-primary mt-10">
            Run All Tests
          </button>

          {testOutput && <div className="test-output">{testOutput}</div>}
        </div>
      )}

      {activeTab === "teambuilder" && (
        <div className="panel">
          <h2>Team Builder & Import/Export</h2>

          {/* Team Import/Export Section */}
          <div className="card mb-30">
            <h3>Team Management</h3>

            <div className="mb-20">
              <strong>Current Team:</strong>{" "}
              {currentTeam.length === 0 ? (
                <span className="text-muted">No team loaded</span>
              ) : (
                <div className="team-display mt-10">
                  {currentTeam.map((pokemon, i) => (
                    <div key={i} className="pokemon-info">
                      <div className="text-small">
                        <strong>{pokemon.species}</strong> Lv.{pokemon.level}
                      </div>
                      <div className="text-tiny text-secondary">
                        {pokemon.types.join(" / ")}
                      </div>
                      {pokemon.item && (
                        <div
                          className="text-tiny"
                          style={{ color: "#646cff", fontWeight: "500" }}
                        >
                          @ {pokemon.item}
                        </div>
                      )}
                      <div className="text-tiny text-muted">
                        {pokemon.ability}
                      </div>
                      <div className="text-tiny text-muted">
                        {pokemon.moves
                          .map((m) => m.name)
                          .slice(0, 2)
                          .join(", ")}
                        {pokemon.moves.length > 2 && "..."}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={loadMockTeam}
              className="btn btn-primary"
              style={{ marginRight: "10px" }}
            >
              Load Mock Team (Charizard)
            </button>

            {/* Import Section */}
            <div className="mt-20 mb-20">
              <h4>Import Team</h4>
              <p className="text-small text-secondary">
                Paste team data in JSON or Pokemon Showdown format
              </p>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste team data here..."
                className="form-textarea mb-10"
                style={{ height: "150px", fontFamily: "monospace" }}
              />

              <button
                onClick={handleImportTeam}
                disabled={!importText.trim()}
                className="btn"
                style={{
                  cursor: importText.trim() ? "pointer" : "not-allowed",
                  backgroundColor: importText.trim() ? "#4caf50" : "#ccc",
                }}
              >
                Import Team
              </button>

              {importStatus && (
                <div
                  className={`status-message mt-10 ${
                    importStatus.includes("❌")
                      ? "status-error"
                      : "status-success"
                  }`}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {importStatus}
                </div>
              )}
            </div>

            {/* Export Section */}
            <div className="mt-20">
              <h4>Export Team</h4>
              <p className="text-small text-secondary">
                Export your team to share or save
              </p>

              <div className="radio-group mb-10">
                <label>
                  <input
                    type="radio"
                    value="showdown"
                    checked={exportFormat === "showdown"}
                    onChange={() => setExportFormat("showdown")}
                  />
                  Pokemon Showdown Format
                </label>
                <label>
                  <input
                    type="radio"
                    value="json"
                    checked={exportFormat === "json"}
                    onChange={() => setExportFormat("json")}
                  />
                  JSON Format
                </label>
              </div>

              <button
                onClick={handleExportTeam}
                disabled={currentTeam.length === 0}
                className="btn btn-primary"
                style={{
                  cursor: currentTeam.length > 0 ? "pointer" : "not-allowed",
                  marginRight: "10px",
                }}
              >
                Export Team
              </button>

              {exportText && (
                <button
                  onClick={handleCopyExport}
                  className="btn"
                  style={{ backgroundColor: "#4caf50" }}
                >
                  Copy to Clipboard
                </button>
              )}

              {exportStatus && (
                <div
                  className={`status-message ${
                    exportStatus.includes("❌")
                      ? "status-error"
                      : "status-success"
                  }`}
                >
                  {exportStatus}
                </div>
              )}

              {exportText && (
                <textarea
                  value={exportText}
                  readOnly
                  className="form-textarea mt-10"
                  style={{ height: "200px", fontFamily: "monospace" }}
                />
              )}
            </div>
          </div>

          {/* Pokemon Search Section */}
          <div className="card">
            <h3>Pokemon Data Lookup</h3>
            <p>Search for a Pokemon to load its data from PokeAPI</p>

            <div className="mt-20 mb-20">
              <input
                type="text"
                value={pokemonSearch}
                onChange={(e) => setPokemonSearch(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchForPokemon()}
                placeholder="Enter Pokemon name (e.g., charizard)"
                className="form-input"
                style={{ width: "300px", marginRight: "10px" }}
              />
              <button
                onClick={searchForPokemon}
                disabled={isLoadingPokemon}
                className="btn btn-primary"
                style={{ cursor: isLoadingPokemon ? "wait" : "pointer" }}
              >
                {isLoadingPokemon ? "Loading..." : "Search"}
              </button>
            </div>

            {pokemonError && (
              <div className="status-message status-error mt-10">
                {pokemonError}
              </div>
            )}

            {pokemonData && (
              <div
                className="card mt-20"
                style={{
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
                  <div className="status-message status-warning mb-10">
                    ⚠️ Modified in Run & Bun:{" "}
                    {pokemonData.modifications || "Stats/moves changed"}
                  </div>
                )}

                <div className="mb-15">
                  <strong>Types:</strong> {pokemonData.types.join(", ")}
                </div>

                <div className="mb-15">
                  <strong>Base Stats:</strong>
                  <ul className="mt-5">
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

                <div className="mb-15">
                  <strong>Abilities:</strong> {pokemonData.abilities.join(", ")}
                </div>

                <div>
                  <strong>Available Moves:</strong>{" "}
                  {pokemonData.learnset.length} moves
                  <div
                    className="text-tiny text-secondary mt-5"
                    style={{ maxHeight: "100px", overflowY: "auto" }}
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
