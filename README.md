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

Each `MatchResult` now also includes `availability`, which summarizes immediate post-match consequences:

- `availability.suspensions` for red-card bans
- `availability.injuries` for players expected to miss future matches

## Season State Helpers

The library also exposes helpers to carry availability forward between matches:

- `initializeSeasonPlayerStatuses(players)`
- `applyMatchAvailabilityConsequences(statuses, result.availability)`
- `tickRecovery(statuses)`
- `getAvailableSquad(players, statuses)`

This keeps season progression outside the match engine while still using the engine's post-match consequences.

## League Helpers

The library also provides reusable building blocks for matchday and table simulation:

- `initializeLeagueTable(clubs)`
- `updateLeagueTableFromMatch(table, result)`
- `simulateMatchday(inputs, table, statuses)`
- `getEligiblePlayersForClub(players, statuses)`

This lets you build a season loop without coupling standings logic to the match simulator itself.

## Season Simulation

For a fuller league flow, the library now includes:

- `generateRoundRobinFixtures(clubs, includeReturnLegs?)`
- `simulateSeason(teams, options?)`

`simulateSeason(...)` returns:

- generated fixtures
- played match results
- final table
- carried player statuses
- aggregated player season stats
- aggregated club season stats
- top scorer leaderboard
- top assist leaderboard
- clean sheet leaderboard
- average rating leaderboard
- card leaderboard

## Persistence Helpers

For save/load and external transport, the library also provides:

- `serializeSeasonState(state)`
- `deserializeSeasonState(serialized)`
- `createSeasonSummary(state)`
- `exportSeasonSnapshot(state)`

This makes it easier to persist a season to JSON, resume it later, or expose compact summaries to a UI or API.

## Competition Rules

Competition behavior can now be configured instead of hardcoded. The library exposes:

- `defaultCompetitionRules`
- `createCompetitionRules(overrides)`

You can override rules for:

- points systems
- suspension lengths
- injury absence mapping
- recovery ticks per matchday
- matchday bench limits

This makes it possible to model leagues, cups, and tournament rule variations over time.

## Knockout Simulation

The library now also supports knockout-style ties:

- `simulateKnockoutTie(...)`
- `simulateKnockoutRound(...)`

Supported behavior:

- one-leg ties
- two-leg aggregate ties
- extra time resolution
- penalty shootout fallback

For full cup-style progression, the library also provides:

- `createInitialKnockoutRound(teams, initialLegs?)`
- `simulateKnockoutTournament(teams, options?)`

This can auto-progress rounds until a champion is produced.

## Group Stage Simulation

For competitions like UCL or World Cup style formats, the library now also provides:

- `simulateGroupStage(teams, options?)`
- `getQualifiedTeams(result, countPerGroup?)`

This allows a group phase to be simulated first, then the qualified teams can be fed into knockout simulation.

## Full Tournament Simulation

For a complete group-to-knockout competition flow, the library also provides:

- `simulateTournament(teams, options?)`

This will:

1. simulate the group stage
2. qualify teams
3. run the knockout bracket
4. return the final champion

## Draw And Seeding

For competitions that need automated setup, the library also provides:

- `drawGroupsFromPots(pots, rules)`
- `seedKnockoutBracket(seededTeams, unseededTeams, rules)`

This is useful for pot-based group draws and seeded knockout pairings with simple protections like:

- anti same nation
- anti same group

## Competition Preset Packs

Preset rules are now available for faster setup, including examples such as:

- `competitionRulePresets.uclModern`
- `competitionRulePresets.uclClassicAwayGoals`
- `competitionRulePresets.worldCupModern`
- `competitionRulePresets.faCupModern`
- `competitionRulePresets.eflCupModern`
- `competitionRulePresets.copaDelReyModern`
- `competitionRulePresets.communityShield`

These presets can still be overridden further with `createCompetitionRules(...)` or per-call overrides.

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
