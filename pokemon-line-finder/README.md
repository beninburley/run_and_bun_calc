# Pokémon Run & Bun - Line Finder

A TypeScript + React web application that calculates optimal battle strategies for Pokémon Nuzlocke battles in the **Run & Bun** ROM hack.

![Status](https://img.shields.io/badge/status-MVP%20Complete-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![React](https://img.shields.io/badge/React-18.3-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)

## 🎯 Purpose

This tool helps Nuzlocke players:

- Find **safe battle strategies** that minimize team casualties
- Understand **AI opponent behavior** precisely
- Analyze **risk factors** (damage rolls, accuracy, crits)
- Prioritize **guaranteed outcomes** over probabilistic ones

## ✨ Features

### Core Engine

- ✅ **Accurate Damage Calculator**: Gen 6+ formula with all modifiers
- ✅ **AI Behavior Simulator**: Exact Run & Bun AI logic implementation
- ✅ **Battle Simulator**: Full turn-by-turn state management
- ✅ **Line Finder**: Heuristic-guided search for optimal strategies

### Risk Assessment

- ✅ Guaranteed vs. probabilistic outcome detection
- ✅ Multi-factor risk analysis (damage rolls, accuracy, crits)
- ✅ Success probability calculations
- ✅ Nuzlocke-safe defaults (no unnecessary deaths)

### User Interface

- ✅ Battle scenario testing
- ✅ Strategy visualization
- ✅ Risk highlighting
- ✅ Turn-by-turn explanations

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (you have v20.18.0)
- npm 10+

### Installation

```bash
cd pokemon-line-finder
npm install
```

### Run Development Server

```bash
npm run dev
```

Visit **http://localhost:5173** in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 🎮 Usage

### Testing with Mock Battles

The application includes two test scenarios:

#### Battle 1: Simple (Type Advantage)

**Player**: Charizard (Level 50)  
**Opponent**: Venusaur (Level 48)

Good for testing basic type effectiveness and guaranteed KOs.

#### Battle 2: Complex (Multi-Pokemon)

**Player**: Lucario + Garchomp  
**Opponent**: Steelix + Alakazam

Tests priority moves, resistances, and strategic switching.

### Finding Lines

1. Select a battle scenario
2. Click "Find Battle Lines"
3. Review generated strategies:
   - ✅ marks guaranteed success
   - % shows success probability
   - Risk level indicates danger
   - Turn-by-turn breakdown explains the strategy

### Understanding Results

Each line displays:

```
Line 1 ✅ (Guaranteed)
Risk Level: NONE | Turns: 1 | Casualties: None

Strategy:
1. Turn 1: Use Flamethrower, then Opponent uses Energy Ball

Key Risks:
• None - this is a guaranteed win
```

## 📁 Project Structure

```
pokemon-line-finder/
├── src/
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts        # Core types (Pokemon, Battle, Lines)
│   ├── data/
│   │   └── constants.ts    # Game data (types, natures, AI scores)
│   ├── engine/
│   │   ├── damage.ts       # Damage calculation engine
│   │   ├── ai.ts           # AI decision logic
│   │   ├── battle.ts       # Battle simulation
│   │   └── lineFinder.ts   # Line-finding algorithm
│   ├── utils/
│   │   └── testData.ts     # Mock Pokemon for testing
│   ├── App.tsx             # Main React component
│   └── main.tsx            # Application entry point
├── PROJECT_SUMMARY.md      # Detailed implementation notes
└── README.md               # This file
```

## 🧮 How It Works

### Damage Calculation

Uses the Gen 6+ damage formula:

```
Damage = (((2 × Level / 5 + 2) × Power × A/D) / 50 + 2) × Modifiers
```

Modifiers include:

- STAB (1.5× for same-type moves)
- Type effectiveness (0×, 0.25×, 0.5×, 1×, 2×, 4×)
- Weather (1.5× boost for Fire in Sun, Water in Rain, etc.)
- Critical hits (1.5×)
- Screens (0.5× damage reduction)
- Burn (0.5× physical attack)
- Random variation (85-100%)

### AI Behavior

Implements exact AI logic from `ai_logic.txt`:

1. **Move Scoring**: Each move gets a score based on:
   - Highest damage (+6/+8)
   - KO potential (+3/+6 bonus)
   - Speed advantage
   - Special move conditions

2. **AI Randomization**: ~80% base score, ~20% +2 bonus

3. **Switch Logic**: Three conditions:
   - Only ineffective moves available (score ≤ -5)
   - Viable switch target exists
   - Current HP > 50%
   - Then 50% chance to switch

### Line Finding

Uses **heuristic-guided beam search**:

1. **Generate** possible player actions (moves + switches)
2. **Simulate** AI response using exact AI logic
3. **Evaluate** resulting state quality
4. **Prune** unpromising branches
5. **Expand** top 3 candidates (beam width)
6. **Repeat** until victory or depth limit

**Pruning Criteria:**

- Max depth reached
- Too many casualties
- Risk threshold exceeded
- Team wiped

**Success = Player wins with acceptable risk**

## 🎯 Design Principles

### 1. Correctness Over Completeness

- Accurate damage calculations
- Exact AI behavior replication
- Proper probability handling

### 2. Risk Awareness

- Guaranteed outcomes prioritized
- Explicit RNG tracking
- Conservative defaults for Nuzlocke safety

### 3. Explainability

- Every line includes reasoning
- Risks clearly documented
- AI decisions transparent

### 4. Extensibility

- Modular architecture
- Clear extension points
- Type-safe interfaces

## 📊 Example Output

```typescript
{
  id: "line_1",
  turns: 1,
  victory: true,
  playerCasualties: [],

  overallRisk: "none",
  guaranteedSuccess: true,
  successProbability: 100,

  requiresCrits: false,
  requiresHits: false,

  explanation: [
    "Turn 1: Use Flamethrower, then Opponent uses Energy Ball"
  ],

  keyRisks: []
}
```

## 🔧 Configuration

Default search options (in `lineFinder.ts`):

```typescript
{
  maxDepth: 20,           // Max turns to search
  maxLines: 10,           // Max results to return

  allowDeaths: false,     // Nuzlocke mode
  maxDeaths: 0,
  allowCritDependence: false,
  allowAccuracyDependence: false,
  minSuccessProbability: 95,  // Require 95%+ success

  prioritize: 'safety'    // vs 'speed', 'pp-conservation'
}
```

Modify in `App.tsx` when calling `findLines()`.

## 🧪 Testing

### Manual Testing

Run the dev server and use the UI to test Battle 1 and Battle 2 scenarios.

### Unit Testing (Planned)

```bash
npm test  # Coming soon
```

### Test Coverage Goals

- [ ] Damage calculation edge cases
- [ ] AI scoring accuracy
- [ ] Battle state transitions
- [ ] Line finding correctness

## 📚 Documentation

- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Detailed implementation notes
- [ai_logic.txt](../ai_logic.txt) - AI behavior documentation
- [ai_switch_logic.txt](../ai_switch_logic.txt) - Switch logic documentation

## 🛣️ Roadmap

### Phase 1: MVP ✅

- [x] Core engine (damage, AI, battle, search)
- [x] Basic UI
- [x] Test scenarios

### Phase 2: Data Integration

- [ ] PokeAPI integration
- [ ] Run & Bun dex data
- [ ] Trainer team data
- [ ] Import/export teams

### Phase 3: Enhanced Features

- [ ] Item usage
- [ ] Pre-damage scenarios
- [ ] PP stalling
- [ ] Sacrifice plays
- [ ] Risk sliders

### Phase 4: Polish

- [ ] Improved UI/UX
- [ ] Save/load strategies
- [ ] Mobile responsiveness
- [ ] Performance optimization

## ⚠️ Current Limitations

### Simplified Mechanics

- No ability effects implemented yet
- No held item effects (beyond tracking)
- Limited field effects
- No multi-hit variance

### AI Behavior

- Some edge cases simplified
- Double battles not supported
- Replicates some game bugs intentionally

### Search

- Fixed beam width
- Simplified probability calculations
- No parallel processing

## 🤝 Contributing

This is currently a solo development project, but feedback and suggestions are welcome!

### Setup for Development

1. Clone the repo
2. `npm install`
3. `npm run dev`
4. Make changes
5. Test in browser

## 📝 License

MIT License - Feel free to use, modify, and distribute.

## 🙏 Acknowledgments

- **Dekzeh** - Run & Bun ROM hack and damage calculator
- **Croven** - AI logic documentation
- Community contributors to Run & Bun documentation

## 🐛 Known Issues

- None currently! 🎉

## 📧 Contact

For questions or issues, please check the documentation first:

- Project summary in [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- AI logic in `ai_logic.txt`

---

**Status**: MVP Complete ✅  
**Last Updated**: February 9, 2026  
**Version**: 0.0.1-mvp
