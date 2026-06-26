import type { Club } from "../domain/club";
import type { Manager } from "../domain/manager";
import type { MatchContext, MatchResult } from "../domain/match-context";
import type { Player } from "../domain/player";
import type { Formation, Mentality } from "../domain/tactic";
import { buildDefaultTactic, buildLineup } from "./lineup-builder";
import { createCompetitionRules, type CompetitionRules, type CompetitionRuleOverrides } from "./competition-rules";
import {
  getEligiblePlayersForClub,
  initializeLeagueTable,
  simulateMatchday,
  type Fixture,
  type LeagueTableEntry,
  type MatchdaySimulationInput,
} from "./league-state";
import { initializeSeasonPlayerStatuses, type SeasonPlayerStatus } from "./season-state";
import type { TeamSetup } from "./match-simulator";

export interface SeasonTeamDefinition {
  club: Club;
  manager: Manager;
  players: Player[];
  formation: Formation;
  mentality?: Mentality;
}

export interface SeasonLeaderboardEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  value: number;
}

export interface SeasonPlayerAggregateStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  appearances: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  yellowCards: number;
  redCards: number;
  averageRating: number;
  cleanSheets: number;
}

export interface SeasonClubAggregateStats {
  teamId: string;
  teamName: string;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  averagePossession: number;
  averageXG: number;
}

export interface SeasonSimulationState {
  fixtures: Fixture[];
  playedResults: MatchResult[];
  table: LeagueTableEntry[];
  playerStatuses: Map<string, SeasonPlayerStatus>;
  playerSeasonStats: SeasonPlayerAggregateStats[];
  clubSeasonStats: SeasonClubAggregateStats[];
  topScorers: SeasonLeaderboardEntry[];
  topAssists: SeasonLeaderboardEntry[];
  topCleanSheets: SeasonLeaderboardEntry[];
  topAverageRatings: SeasonLeaderboardEntry[];
  topCards: SeasonLeaderboardEntry[];
}

export interface SimulateSeasonOptions {
  context?: MatchContext;
  includeReturnLegs?: boolean;
  competitionRules?: CompetitionRuleOverrides;
}

function defaultContext(): MatchContext {
  return {
    venueType: "neutral",
    weather: "clear",
    importance: "league",
    competitionType: "league",
    isDerby: false,
  };
}

function rotateRoundRobin(ids: string[]): string[] {
  if (ids.length <= 2) return ids;
  return [ids[0]!, ids[ids.length - 1]!, ...ids.slice(1, -1)];
}

export function generateRoundRobinFixtures(clubs: Club[], includeReturnLegs: boolean = true): Fixture[] {
  if (clubs.length < 2) return [];

  const clubIds = clubs.map(club => club.id);
  const ids = clubIds.length % 2 === 0 ? [...clubIds] : [...clubIds, "__bye__"];
  const rounds = ids.length - 1;
  const fixtures: Fixture[] = [];
  let rotation = [...ids];

  for (let round = 0; round < rounds; round++) {
    const matchday = round + 1;
    for (let i = 0; i < rotation.length / 2; i++) {
      const home = rotation[i]!;
      const away = rotation[rotation.length - 1 - i]!;
      if (home === "__bye__" || away === "__bye__") continue;
      fixtures.push({
        id: `md${matchday}-${home}-${away}`,
        homeTeamId: round % 2 === 0 ? home : away,
        awayTeamId: round % 2 === 0 ? away : home,
        matchday,
      });
    }
    rotation = rotateRoundRobin(rotation);
  }

  if (!includeReturnLegs) {
    return fixtures;
  }

  const returnLegOffset = rounds;
  const returnLegs = fixtures.map(fixture => ({
    id: `md${fixture.matchday + returnLegOffset}-${fixture.awayTeamId}-${fixture.homeTeamId}`,
    homeTeamId: fixture.awayTeamId,
    awayTeamId: fixture.homeTeamId,
    matchday: fixture.matchday + returnLegOffset,
  }));

  return [...fixtures, ...returnLegs];
}

function buildTeamSetupWithRules(
  definition: SeasonTeamDefinition,
  statuses: Map<string, SeasonPlayerStatus>,
  rules: CompetitionRules,
): TeamSetup {
  const eligiblePlayers = getEligiblePlayersForClub(definition.players, statuses);
  const lineup = buildLineup(eligiblePlayers, definition.formation, {
    benchSize: rules.match.maxBenchSize,
  });

  return {
    club: definition.club,
    manager: definition.manager,
    tactic: buildDefaultTactic(definition.formation, definition.mentality ?? "balanced"),
    goalkeeper: lineup.goalkeeper,
    outfield: lineup.outfield,
    bench: lineup.bench,
    competitionRules: rules,
  };
}

function buildLeaderboard(
  results: MatchResult[],
  teamsById: Map<string, SeasonTeamDefinition>,
  selector: (result: MatchResult) => { playerId: string; playerName: string; team: "home" | "away"; value: number }[],
): SeasonLeaderboardEntry[] {
  const aggregate = new Map<string, SeasonLeaderboardEntry>();

  for (const result of results) {
    for (const entry of selector(result)) {
      const teamId = entry.team === "home" ? result.homeTeamId : result.awayTeamId;
      const teamName = entry.team === "home" ? result.homeTeamName : result.awayTeamName;
      const existing = aggregate.get(entry.playerId);
      if (existing) {
        existing.value += entry.value;
      } else {
        aggregate.set(entry.playerId, {
          playerId: entry.playerId,
          playerName: entry.playerName,
          teamId,
          teamName,
          value: entry.value,
        });
      }
    }
  }

  return [...aggregate.values()]
    .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName))
    .slice(0, 10);
}

function buildSeasonPlayerAggregateStats(
  results: MatchResult[],
): SeasonPlayerAggregateStats[] {
  const aggregate = new Map<string, SeasonPlayerAggregateStats>();

  for (const result of results) {
    const ratingByPlayerId = new Map(result.playerRatings.map(rating => [rating.playerId, rating.rating]));

    for (const player of result.playerMatchStats) {
      const teamId = player.team === "home" ? result.homeTeamId : result.awayTeamId;
      const teamName = player.team === "home" ? result.homeTeamName : result.awayTeamName;
      const cleanSheet = player.team === "home" ? result.awayScore === 0 : result.homeScore === 0;
      const isDefensivePlayer = result.playerRatings
        .find(rating => rating.playerId === player.playerId)
        ?.name === player.name;

      const existing = aggregate.get(player.playerId) ?? {
        playerId: player.playerId,
        playerName: player.name,
        teamId,
        teamName,
        appearances: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        shotsOnTarget: 0,
        keyPasses: 0,
        tackles: 0,
        interceptions: 0,
        yellowCards: 0,
        redCards: 0,
        averageRating: 0,
        cleanSheets: 0,
      };

      existing.appearances += 1;
      existing.minutesPlayed += player.minutesPlayed;
      existing.goals += player.goals;
      existing.assists += player.assists;
      existing.shots += player.shots;
      existing.shotsOnTarget += player.shotsOnTarget;
      existing.keyPasses += player.keyPasses;
      existing.tackles += player.tackles;
      existing.interceptions += player.interceptions;
      existing.yellowCards += player.yellowCards;
      existing.redCards += player.redCards;
      existing.averageRating += ratingByPlayerId.get(player.playerId) ?? 0;
      if (cleanSheet && (player.tackles > 0 || player.interceptions > 0 || player.minutesPlayed >= 85)) {
        existing.cleanSheets += 1;
      }

      aggregate.set(player.playerId, existing);
    }
  }

  return [...aggregate.values()]
    .map(entry => ({
      ...entry,
      averageRating: entry.appearances > 0 ? entry.averageRating / entry.appearances : 0,
    }))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName));
}

function buildSeasonClubAggregateStats(results: MatchResult[]): SeasonClubAggregateStats[] {
  const aggregate = new Map<string, SeasonClubAggregateStats>();

  for (const result of results) {
    const entries = [
      {
        teamId: result.homeTeamId,
        teamName: result.homeTeamName,
        goalsFor: result.homeScore,
        goalsAgainst: result.awayScore,
        possession: result.stats.possession.home,
        xG: result.stats.xG.home,
      },
      {
        teamId: result.awayTeamId,
        teamName: result.awayTeamName,
        goalsFor: result.awayScore,
        goalsAgainst: result.homeScore,
        possession: result.stats.possession.away,
        xG: result.stats.xG.away,
      },
    ];

    for (const entry of entries) {
      const current = aggregate.get(entry.teamId) ?? {
        teamId: entry.teamId,
        teamName: entry.teamName,
        matches: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        cleanSheets: 0,
        averagePossession: 0,
        averageXG: 0,
      };

      current.matches += 1;
      current.goalsFor += entry.goalsFor;
      current.goalsAgainst += entry.goalsAgainst;
      if (entry.goalsAgainst === 0) current.cleanSheets += 1;
      current.averagePossession += entry.possession;
      current.averageXG += entry.xG;
      aggregate.set(entry.teamId, current);
    }
  }

  return [...aggregate.values()]
    .map(entry => ({
      ...entry,
      averagePossession: entry.matches > 0 ? entry.averagePossession / entry.matches : 0,
      averageXG: entry.matches > 0 ? entry.averageXG / entry.matches : 0,
    }))
    .sort((a, b) => b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName));
}

function buildLeaderboardFromSeasonStats(
  stats: SeasonPlayerAggregateStats[],
  selector: (entry: SeasonPlayerAggregateStats) => number,
): SeasonLeaderboardEntry[] {
  return [...stats]
    .map(entry => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      teamId: entry.teamId,
      teamName: entry.teamName,
      value: selector(entry),
    }))
    .filter(entry => entry.value > 0)
    .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName))
    .slice(0, 10);
}

export function simulateSeason(
  teams: SeasonTeamDefinition[],
  options: SimulateSeasonOptions = {},
): SeasonSimulationState {
  const rules = createCompetitionRules(options.competitionRules);
  const fixtures = generateRoundRobinFixtures(teams.map(team => team.club), options.includeReturnLegs ?? true);
  const teamsById = new Map(teams.map(team => [team.club.id, team]));
  const allPlayers = teams.flatMap(team => team.players);

  let table = initializeLeagueTable(teams.map(team => team.club));
  let playerStatuses = initializeSeasonPlayerStatuses(allPlayers);
  const playedResults: MatchResult[] = [];

  const groupedFixtures = new Map<number, Fixture[]>();
  for (const fixture of fixtures) {
    const list = groupedFixtures.get(fixture.matchday) ?? [];
    list.push(fixture);
    groupedFixtures.set(fixture.matchday, list);
  }

  const sortedMatchdays = [...groupedFixtures.keys()].sort((a, b) => a - b);

  for (const matchday of sortedMatchdays) {
    const fixturesForDay = groupedFixtures.get(matchday) ?? [];
    const inputs: MatchdaySimulationInput[] = fixturesForDay.map(fixture => {
      const home = teamsById.get(fixture.homeTeamId);
      const away = teamsById.get(fixture.awayTeamId);

      if (!home || !away) {
        throw new Error(`Fixture references unknown team: ${fixture.homeTeamId} vs ${fixture.awayTeamId}`);
      }

      return {
          fixture,
        homeSetup: buildTeamSetupWithRules(home, playerStatuses, rules),
        awaySetup: buildTeamSetupWithRules(away, playerStatuses, rules),
        context: options.context ?? defaultContext(),
      };
    });

    const matchdayResult = simulateMatchday(inputs, table, playerStatuses, rules);
    table = matchdayResult.updatedTable;
    playerStatuses = matchdayResult.updatedStatuses;
    playedResults.push(...matchdayResult.results);
  }

  const topScorers = buildLeaderboard(playedResults, teamsById, result =>
    result.playerMatchStats
      .filter(player => player.goals > 0)
      .map(player => ({
        playerId: player.playerId,
        playerName: player.name,
        team: player.team,
        value: player.goals,
      })),
  );

  const topAssists = buildLeaderboard(playedResults, teamsById, result =>
    result.playerMatchStats
      .filter(player => player.assists > 0)
      .map(player => ({
        playerId: player.playerId,
        playerName: player.name,
        team: player.team,
        value: player.assists,
      })),
  );

  const playerSeasonStats = buildSeasonPlayerAggregateStats(playedResults);
  const clubSeasonStats = buildSeasonClubAggregateStats(playedResults);
  const topCleanSheets = buildLeaderboardFromSeasonStats(playerSeasonStats, entry => entry.cleanSheets);
  const topAverageRatings = buildLeaderboardFromSeasonStats(playerSeasonStats, entry => Number(entry.averageRating.toFixed(2)));
  const topCards = buildLeaderboardFromSeasonStats(playerSeasonStats, entry => entry.yellowCards + entry.redCards * 2);

  return {
    fixtures,
    playedResults,
    table,
    playerStatuses,
    playerSeasonStats,
    clubSeasonStats,
    topScorers,
    topAssists,
    topCleanSheets,
    topAverageRatings,
    topCards,
  };
}
