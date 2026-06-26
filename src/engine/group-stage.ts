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

interface MiniTableEntry {
  teamId: string;
  teamName: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  goalsAgainst: number;
  played: number;
}

function buildMiniTable(
  teamIds: string[],
  results: MatchResult[],
): Map<string, MiniTableEntry> {
  const entries = new Map<string, MiniTableEntry>(
    teamIds.map(id => [id, {
      teamId: id,
      teamName: "",
      points: 0,
      goalDifference: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      played: 0,
    }]),
  );

  for (const result of results) {
    if (!teamIds.includes(result.homeTeamId) || !teamIds.includes(result.awayTeamId)) continue;
    const home = entries.get(result.homeTeamId)!;
    const away = entries.get(result.awayTeamId)!;

    home.teamName = result.homeTeamId;
    away.teamName = result.awayTeamId;

    home.played++;
    away.played++;
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

  return entries;
}

function getMutualResults(
  teamIds: string[],
  results: MatchResult[],
): MatchResult[] {
  return results.filter(
    r => teamIds.includes(r.homeTeamId) && teamIds.includes(r.awayTeamId),
  );
}

function compareMiniTableEntries(
  a: MiniTableEntry,
  b: MiniTableEntry,
  tiebreakers: GroupTiebreaker[],
  fairPlayScores: Map<string, number>,
  reputationMap: Map<string, number>,
): number {
  for (const tiebreaker of tiebreakers) {
    let diff = 0;
    switch (tiebreaker) {
      case "headToHead":
        break;
      case "goalDifference":
        diff = b.goalDifference - a.goalDifference;
        break;
      case "goalsFor":
        diff = b.goalsFor - a.goalsFor;
        break;
      case "fewestGoalsAgainst":
        diff = a.goalsAgainst - b.goalsAgainst;
        break;
      case "fairPlay":
        diff = (fairPlayScores.get(a.teamId) ?? 0) - (fairPlayScores.get(b.teamId) ?? 0);
        break;
      case "clubReputation":
        diff = (reputationMap.get(b.teamId) ?? 0) - (reputationMap.get(a.teamId) ?? 0);
        break;
      case "teamName":
        diff = a.teamName.localeCompare(b.teamName);
        break;
    }
    if (diff !== 0) return diff;
  }
  return 0;
}

function resolveTiedGroup(
  teamIds: string[],
  allResults: MatchResult[],
  tiebreakers: GroupTiebreaker[],
  fairPlayScores: Map<string, number>,
  reputationMap: Map<string, number>,
  entryMap: Map<string, LeagueTableEntry>,
  depth: number = 0,
): string[] {
  if (teamIds.length <= 1 || depth > 10) return teamIds;
  if (teamIds.length === 2) {
    const [aId, bId] = teamIds;
    const aEntry = entryMap.get(aId)!;
    const bEntry = entryMap.get(bId)!;
    const h2h = getMutualResults(teamIds, allResults);
    const h2hMap = buildMiniTable(teamIds, h2h);
    const aMini = h2hMap.get(aId)!;
    const bMini = h2hMap.get(bId)!;
    aMini.teamName = aEntry.teamName;
    bMini.teamName = bEntry.teamName;

    const tiebreakersWithoutH2H = tiebreakers.filter(t => t !== "headToHead");
    const diff = compareMiniTableEntries(aMini, bMini, tiebreakersWithoutH2H, fairPlayScores, reputationMap);
    if (diff < 0) return [bId, aId];
    if (diff > 0) return [aId, bId];
    return [aId, bId].sort((x, y) => (entryMap.get(x)?.teamName ?? "").localeCompare(entryMap.get(y)?.teamName ?? ""));
  }

  const mutualResults = getMutualResults(teamIds, allResults);
  const miniTable = buildMiniTable(teamIds, mutualResults);

  for (const [id, entry] of entryMap) {
    const mini = miniTable.get(id);
    if (mini) mini.teamName = entry.teamName;
  }

  const tiebreakersWithoutH2H = tiebreakers.filter(t => t !== "headToHead");

  const sorted = [...miniTable.values()].sort((a, b) =>
    compareMiniTableEntries(a, b, tiebreakersWithoutH2H, fairPlayScores, reputationMap));

  const result: string[] = [];
  let i = 0;

  while (i < sorted.length) {
    const current = sorted[i]!;
    const tiedSubset: MiniTableEntry[] = [current];

    let j = i + 1;
    while (j < sorted.length) {
      const next = sorted[j]!;
      const diff = compareMiniTableEntries(current, next, tiebreakersWithoutH2H, fairPlayScores, reputationMap);
      if (diff === 0) {
        tiedSubset.push(next);
        j++;
      } else {
        break;
      }
    }

    if (tiedSubset.length === 1) {
      result.push(current.teamId);
    } else {
      const tiedIds = tiedSubset.map(e => e.teamId);
      const resolved = resolveTiedGroup(
        tiedIds,
        allResults,
        tiebreakers,
        fairPlayScores,
        reputationMap,
        entryMap,
        depth + 1,
      );
      result.push(...resolved);
    }

    i = j;
  }

  return result;
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
  const entryMap = new Map(entries.map(entry => [entry.teamId, entry]));

  for (const points of sortedPoints) {
    const bucket = byPoints.get(points) ?? [];
    if (bucket.length <= 1) {
      resolved.push(...bucket);
      continue;
    }

    const teamIds = bucket.map(entry => entry.teamId);
    const headToHeadStats = buildMiniTable(teamIds, getMutualResults(teamIds, results));
    const orderedIds = resolveTiedGroup(
      teamIds,
      results,
      rules.group.tiebreakers,
      fairPlayScores,
      reputationMap,
      entryMap,
    );

    for (const id of orderedIds) {
      const entry = entryMap.get(id);
      if (entry) resolved.push(entry);
    }
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
