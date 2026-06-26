# football-simulation

`football-simulation` is a Bun-first TypeScript library for simulating football matches from your own squads, tactics, and managers.

The project is being shaped as a reusable engine package first. The sample clubs, players, and managers inside this repo are internal fixtures for tests and demo runs, not part of the intended public library API.

## Install

```bash
bun install xxx-soon-to-be-published-package-name
```

## Library Usage

```ts
import {
  buildDefaultTactic,
  buildLineup,
  simulateMatch,
  type MatchContext,
  type TeamSetup,
} from "football-simulation";
```

### Expected Flow

1. Create your own `Player[]` dataset
2. Build a lineup from those players
3. Create `Club`, `Manager`, and `Tactic` inputs
4. Call `simulateMatch(...)`

### Example

```ts
import {
  buildDefaultTactic,
  buildLineup,
  simulateMatch,
  type Club,
  type Manager,
  type MatchContext,
  type Player,
  type TeamSetup,
} from "football-simulation";

const homePlayers: Player[] = [];
const awayPlayers: Player[] = [];

const homeClub: Club = {
  id: "home-club",
  name: "Home Club",
  shortName: "HOM",
  city: "Home City",
  founded: 1900,
  nation: "Example",
  league: "Example League",
  reputation: 70,
  status: "professional",
  finances: {
    balance: 1_000_000,
    transferBudget: 500_000,
    totalWages: 200_000,
    remainingWages: 50_000,
  },
  facilities: {
    trainingFacilities: 70,
    youthFacilities: 65,
    youthRecruitment: 60,
    juniorCoaching: 60,
  },
  homeAdvantage: 0.1,
};

const awayClub: Club = { ...homeClub, id: "away-club", name: "Away Club", shortName: "AWY" };

const homeManager: Manager = {
  id: "home-manager",
  name: "Home Manager",
  age: 52,
  nationality: "Example",
  tacticalDiscipline: 75,
  adaptability: 72,
  motivation: 76,
  manManagement: 74,
  attackingBias: 60,
  defensiveBias: 55,
  rotation: 55,
  inGameManagement: 70,
  youthDevelopment: 50,
  squadSquadRotation: 55,
  preferredFormations: ["4-3-3"],
};

const awayManager: Manager = { ...homeManager, id: "away-manager", name: "Away Manager" };

const homeLineup = buildLineup(homePlayers, "4-3-3");
const awayLineup = buildLineup(awayPlayers, "4-2-3-1");

const homeSetup: TeamSetup = {
  club: homeClub,
  manager: homeManager,
  tactic: buildDefaultTactic("4-3-3", "positive"),
  goalkeeper: homeLineup.goalkeeper,
  outfield: homeLineup.outfield,
  bench: homeLineup.bench,
};

const awaySetup: TeamSetup = {
  club: awayClub,
  manager: awayManager,
  tactic: buildDefaultTactic("4-2-3-1", "balanced"),
  goalkeeper: awayLineup.goalkeeper,
  outfield: awayLineup.outfield,
  bench: awayLineup.bench,
};

const context: MatchContext = {
  venueType: "neutral",
  weather: "clear",
  importance: "league",
  competitionType: "league",
  isDerby: false,
};

const result = simulateMatch(homeSetup, awaySetup, context);
console.log(result.homeScore, result.awayScore);
console.log(result.playerMatchStats);
```

## Public API Notes

- `buildLineup(players, formation, config?)` is intentionally opinionated for now
- the API is designed so config options can be added later without changing the main usage model
- `simulateMatch(...)` is the core engine entry point
- `MatchResult.playerMatchStats` contains accumulated per-player match contributions

Current `buildLineup` config supports:

- `benchSize`
- `excludePlayerIds`
- `lockedPlayerIds`

Red cards now have structural impact during simulation: the dismissed side loses an active outfield player and their team phase scores are recalculated.

Injuries are also modeled during matches:

- low probability, fatigue-aware injury checks
- moderate and severe injuries try to trigger forced substitutions
- if no bench option or sub slot remains, the player can continue at heavily reduced condition

## Internal Fixtures

Files under `src/data/` are internal repo fixtures used for:

- tests
- demo CLI runs
- calibration while developing the engine

They should not be treated as the public consumer dataset model.

## Demo CLI

For local demo runs inside this repo:

```bash
bun run src/cli.ts
```

## Tests

```bash
bun test
```
