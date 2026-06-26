import type { Club } from "../domain/club";
import type { Manager } from "../domain/manager";
import type { MatchContext, MatchResult } from "../domain/match-context";
import type { Player } from "../domain/player";
import type { Formation, Mentality } from "../domain/tactic";
import { createCompetitionRules, type CompetitionRuleOverrides, type CompetitionRules, type GroupTiebreaker } from "./competition-rules";
import { buildDefaultTactic, buildLineup } from "./lineup-builder";
import {
  initializeLeagueTable,
  updateLeagueTableFromMatch,
  type Fixture,
  type LeagueTableEntry,
} from "./league-state";
import type { TeamSetup } from "./match-simulator";
import { simulateMatch } from "./match-simulator";
import { getEligiblePlayersForClub } from "./league-state";
import { initializeSeasonPlayerStatuses, type SeasonPlayerStatus } from "./season-state";
import type { KnockoutTeamDefinition } from "./knockout-state";

export interface GroupStageTeamDefinition {
  club: Club;
  manager: Manager;
  players: Player[];
  formation: Formation;
  mentality?: Mentality;
  group: string;
}

export interface GroupFixture extends Fixture {
  group: string;
}

export interface GroupStageGroupResult {
  group: string;
  table: LeagueTableEntry[];
  results: MatchResult[];
}

export interface GroupStageSimulationResult {
  groups: GroupStageGroupResult[];
  qualifiedTeams: KnockoutTeamDefinition[];
}

export interface SimulateGroupStageOptions {
  context?: MatchContext;
  competitionRules?: CompetitionRuleOverrides;
  qualifiersPerGroup?: number;
  statuses?: Map<string, SeasonPlayerStatus>;
}

function defaultContext(): MatchContext {
  return {
    venueType: "neutral",
    weather: "clear",
    importance: "continental",
    competitionType: "continental",
    isDerby: false,
  };
}

function generateGroupFixturesForTeams(teamIds: string[], group: string): GroupFixture[] {
  const fixtures: GroupFixture[] = [];
  let matchday = 1;

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const homeTeamId = teamIds[i]!;
      const awayTeamId = teamIds[j]!;
      fixtures.push({
        id: `${group}-md${matchday}-${homeTeamId}-${awayTeamId}`,
        homeTeamId,
        awayTeamId,
        matchday: matchday++,
        group,
      });
      fixtures.push({
        id: `${group}-md${matchday}-${awayTeamId}-${homeTeamId}`,
        homeTeamId: awayTeamId,
        awayTeamId: homeTeamId,
        matchday: matchday++,
        group,
      });
    }
  }

  return fixtures;
}

function getHeadToHeadStats(
  teamIds: string[],
  results: MatchResult[],
): Map<string, { points: number; goalDifference: number; goalsFor: number; goalsAgainst: number }> {
  const stats = new Map(teamIds.map(teamId => [teamId, { points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 }]));

  for (const result of results) {
    if (!teamIds.includes(result.homeTeamId) || !teamIds.includes(result.awayTeamId)) continue;
    const home = stats.get(result.homeTeamId);
    const away = stats.get(result.awayTeamId);
    if (!home || !away) continue;

    home.goalsFor += result.homeScore;
    home.goalsAgainst += result.awayScore;
    away.goalsFor += result.awayScore;
    away.goalsAgainst += result.homeScore;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (result.homeScore > result.awayScore) {
      home.points += 3;
    } else if (result.homeScore < result.awayScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  return stats;
}

function compareByTiebreaker(
  a: LeagueTableEntry,
  b: LeagueTableEntry,
  tiebreaker: GroupTiebreaker,
  headToHeadStats: Map<string, { points: number; goalDifference: number; goalsFor: number; goalsAgainst: number }>,
  fairPlayScores: Map<string, number>,
  reputationMap: Map<string, number>,
): number {
  switch (tiebreaker) {
    case "headToHead": {
      const aStats = headToHeadStats.get(a.teamId);
      const bStats = headToHeadStats.get(b.teamId);
      return (bStats?.points ?? 0) - (aStats?.points ?? 0)
        || (bStats?.goalDifference ?? 0) - (aStats?.goalDifference ?? 0)
        || (bStats?.goalsFor ?? 0) - (aStats?.goalsFor ?? 0);
    }
    case "goalDifference": return b.goalDifference - a.goalDifference;
    case "goalsFor": return b.goalsFor - a.goalsFor;
    case "fewestGoalsAgainst": return a.goalsAgainst - b.goalsAgainst;
    case "fairPlay": return (fairPlayScores.get(a.teamId) ?? 0) - (fairPlayScores.get(b.teamId) ?? 0);
    case "clubReputation": return (reputationMap.get(b.teamId) ?? 0) - (reputationMap.get(a.teamId) ?? 0);
    case "teamName": return a.teamName.localeCompare(b.teamName);
    default: return 0;
  }
}

function sortGroupTable(
  entries: LeagueTableEntry[],
  results: MatchResult[],
  rules: CompetitionRules,
): LeagueTableEntry[] {
  const fairPlayScores = new Map<string, number>();
  const reputationMap = new Map(entries.map(entry => [entry.teamId, 0]));

  for (const result of results) {
    const homeCards = result.playerMatchStats
      .filter(player => player.team === "home")
      .reduce((sum, player) => sum + player.yellowCards + player.redCards * 3, 0);
    const awayCards = result.playerMatchStats
      .filter(player => player.team === "away")
      .reduce((sum, player) => sum + player.yellowCards + player.redCards * 3, 0);

    fairPlayScores.set(result.homeTeamId, (fairPlayScores.get(result.homeTeamId) ?? 0) + homeCards);
    fairPlayScores.set(result.awayTeamId, (fairPlayScores.get(result.awayTeamId) ?? 0) + awayCards);

    const homeEntry = entries.find(entry => entry.teamId === result.homeTeamId);
    const awayEntry = entries.find(entry => entry.teamId === result.awayTeamId);
    if (homeEntry) reputationMap.set(result.homeTeamId, homeEntry.points + homeEntry.goalDifference);
    if (awayEntry) reputationMap.set(result.awayTeamId, awayEntry.points + awayEntry.goalDifference);
  }

  const byPoints = new Map<number, LeagueTableEntry[]>();
  for (const entry of entries) {
    const bucket = byPoints.get(entry.points) ?? [];
    bucket.push(entry);
    byPoints.set(entry.points, bucket);
  }

  const sortedPoints = [...byPoints.keys()].sort((a, b) => b - a);
  const resolved: LeagueTableEntry[] = [];

  for (const points of sortedPoints) {
    const bucket = byPoints.get(points) ?? [];
    if (bucket.length <= 1) {
      resolved.push(...bucket);
      continue;
    }

    const teamIds = bucket.map(entry => entry.teamId);
    const headToHeadStats = getHeadToHeadStats(teamIds, results);
    bucket.sort((a, b) => {
      for (const tiebreaker of rules.group.tiebreakers) {
        const diff = compareByTiebreaker(a, b, tiebreaker, headToHeadStats, fairPlayScores, reputationMap);
        if (diff !== 0) return diff;
      }
      return a.teamName.localeCompare(b.teamName);
    });
    resolved.push(...bucket);
  }

  return resolved;
}

function buildTeamSetup(
  definition: GroupStageTeamDefinition,
  statuses: Map<string, SeasonPlayerStatus>,
  benchSize: number,
): TeamSetup {
  const eligiblePlayers = getEligiblePlayersForClub(definition.players, statuses);
  const lineup = buildLineup(eligiblePlayers, definition.formation, {
    benchSize,
  });

  return {
    club: definition.club,
    manager: definition.manager,
    tactic: buildDefaultTactic(definition.formation, definition.mentality ?? "balanced"),
    goalkeeper: lineup.goalkeeper,
    outfield: lineup.outfield,
    bench: lineup.bench,
  };
}

export function simulateGroupStage(
  teams: GroupStageTeamDefinition[],
  options: SimulateGroupStageOptions = {},
): GroupStageSimulationResult {
  const rules = createCompetitionRules(options.competitionRules);
  const qualifiersPerGroup = options.qualifiersPerGroup ?? 2;
  const statuses = options.statuses ?? initializeSeasonPlayerStatuses(teams.flatMap(team => team.players));
  const groupedTeams = new Map<string, GroupStageTeamDefinition[]>();

  for (const team of teams) {
    const list = groupedTeams.get(team.group) ?? [];
    list.push(team);
    groupedTeams.set(team.group, list);
  }

  const groupResults: GroupStageGroupResult[] = [];
  const qualifiedTeams: KnockoutTeamDefinition[] = [];

  for (const [group, groupTeams] of groupedTeams.entries()) {
    const fixtures = generateGroupFixturesForTeams(groupTeams.map(team => team.club.id), group);
    let table = initializeLeagueTable(groupTeams.map(team => team.club));
    const results: MatchResult[] = [];
    const teamsById = new Map(groupTeams.map(team => [team.club.id, team]));

    for (const fixture of fixtures) {
      const home = teamsById.get(fixture.homeTeamId);
      const away = teamsById.get(fixture.awayTeamId);
      if (!home || !away) continue;

      const result = simulateMatch(
        {
          ...buildTeamSetup(home, statuses, rules.match.maxBenchSize),
          competitionRules: rules,
        },
        {
          ...buildTeamSetup(away, statuses, rules.match.maxBenchSize),
          competitionRules: rules,
        },
        options.context ?? defaultContext(),
      );

      results.push(result);
      table = updateLeagueTableFromMatch(table, result, rules);
    }

    const sortedTable = sortGroupTable([...table], results, rules);
    groupResults.push({
      group,
      table: sortedTable,
      results,
    });

    const qualifiedIds = sortedTable.slice(0, qualifiersPerGroup).map(entry => entry.teamId);
    for (const teamId of qualifiedIds) {
      const team = teamsById.get(teamId);
      if (!team) continue;
      qualifiedTeams.push({
        club: team.club,
        manager: team.manager,
        players: team.players,
        formation: team.formation,
        mentality: team.mentality,
      });
    }
  }

  return {
    groups: groupResults.sort((a, b) => a.group.localeCompare(b.group)),
    qualifiedTeams,
  };
}

export function getQualifiedTeams(
  result: GroupStageSimulationResult,
  countPerGroup: number = 2,
): KnockoutTeamDefinition[] {
  return result.qualifiedTeams.slice(0, result.groups.length * countPerGroup);
}
