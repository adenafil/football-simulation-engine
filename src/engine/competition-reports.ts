import type { MatchResult } from "../domain/match-context";
import type { LeagueTableEntry } from "./league-state";
import type { GroupStageGroupResult, GroupStageSimulationResult } from "./group-stage";
import type { KnockoutRoundResult, KnockoutTieResult, KnockoutTournamentState } from "./knockout-state";
import type { TournamentSimulationState } from "./tournament-simulator";

export interface GroupReportRow {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupStageReport {
  group: string;
  standings: GroupReportRow[];
  totalGoals: number;
  averageGoalsPerMatch: number;
  matchesPlayed: number;
}

export interface KnockoutMatchSummary {
  tieId: string;
  homeTeamName: string;
  awayTeamName: string;
  aggregateHomeScore: number;
  aggregateAwayScore: number;
  winnerTeamName: string;
  decidedBy: string;
  legs: { homeTeamName: string; awayTeamName: string; homeScore: number; awayScore: number; minute: number }[];
}

export interface KnockoutRoundReport {
  roundName: string;
  matches: KnockoutMatchSummary[];
  advancingTeams: string[];
}

export interface KnockoutBracketReport {
  rounds: KnockoutRoundReport[];
  champion: string;
  totalMatches: number;
  totalGoals: number;
}

export interface TournamentReport {
  groupStage: GroupStageReport[];
  knockout: KnockoutBracketReport;
  champion: string;
  totalMatches: number;
  totalGoals: number;
  topScorers: { playerId: string; playerName: string; teamName: string; goals: number }[];
  topAssisters: { playerId: string; playerName: string; teamName: string; assists: number }[];
}

export function buildGroupStageReport(result: GroupStageSimulationResult): GroupStageReport[] {
  return result.groups.map(group => {
    const standings: GroupReportRow[] = group.table.map((entry, idx) => ({
      position: idx + 1,
      teamId: entry.teamId,
      teamName: entry.teamName,
      played: entry.played,
      won: entry.wins,
      drawn: entry.draws,
      lost: entry.losses,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
      points: entry.points,
    }));

    const totalGoals = group.results.reduce((sum, r) => sum + r.homeScore + r.awayScore, 0);
    const matchesPlayed = group.results.length;

    return {
      group: group.group,
      standings,
      totalGoals,
      averageGoalsPerMatch: matchesPlayed > 0 ? totalGoals / matchesPlayed : 0,
      matchesPlayed,
    };
  });
}

function buildKnockoutMatchSummary(tieResult: KnockoutTieResult, homeTeamName: string, awayTeamName: string): KnockoutMatchSummary {
  return {
    tieId: tieResult.tieId,
    homeTeamName,
    awayTeamName,
    aggregateHomeScore: tieResult.aggregateHomeScore,
    aggregateAwayScore: tieResult.aggregateAwayScore,
    winnerTeamName: tieResult.winnerTeamName,
    decidedBy: tieResult.decidedBy,
    legs: tieResult.legs.map(leg => ({
      homeTeamName: leg.homeTeamName,
      awayTeamName: leg.awayTeamName,
      homeScore: leg.homeScore,
      awayScore: leg.awayScore,
      minute: leg.events.length > 0 ? leg.events[leg.events.length - 1]!.minute : 90,
    })),
  };
}

export function buildKnockoutBracketReport(tournament: KnockoutTournamentState): KnockoutBracketReport {
  const rounds: KnockoutRoundReport[] = [];
  let totalMatches = 0;
  let totalGoals = 0;

  for (const round of tournament.rounds) {
    if (!round.result) continue;
    const roundResult = round.result;
    const roundName = round.name;
    const matches = roundResult.ties.map(tie => {
      return buildKnockoutMatchSummary(tie, "Home", "Away");
    });

    totalMatches += roundResult.ties.length;
    totalGoals += roundResult.ties.reduce((sum, tie) => sum + tie.aggregateHomeScore + tie.aggregateAwayScore, 0);

    rounds.push({
      roundName,
      matches,
      advancingTeams: roundResult.advancingTeamIds,
    });
  }

  return {
    rounds,
    champion: tournament.championTeamName,
    totalMatches,
    totalGoals,
  };
}

export function buildTournamentReport(tournament: TournamentSimulationState): TournamentReport {
  const groupStage = buildGroupStageReport(tournament.groupStage);
  const knockout = buildKnockoutBracketReport(tournament.knockout);

  const allResults = tournament.groupStage.groups.flatMap(g => g.results);
  const allKnockoutResults = tournament.knockout.rounds
    .filter(r => r.result)
    .flatMap(r => r.result!.ties.flatMap(t => t.legs));

  const totalGoals = allResults.reduce((sum, r) => sum + r.homeScore + r.awayScore, 0)
    + allKnockoutResults.reduce((sum, r) => sum + r.homeScore + r.awayScore, 0);

  const playerGoals = new Map<string, { playerName: string; teamName: string; goals: number }>();
  const playerAssists = new Map<string, { playerName: string; teamName: string; assists: number }>();

  for (const result of [...allResults, ...allKnockoutResults]) {
    for (const stat of result.playerMatchStats) {
      if (stat.goals > 0) {
        const existing = playerGoals.get(stat.playerId) ?? { playerName: stat.playerName, teamName: stat.team, goals: 0 };
        existing.goals += stat.goals;
        playerGoals.set(stat.playerId, existing);
      }
      if (stat.assists > 0) {
        const existing = playerAssists.get(stat.playerId) ?? { playerName: stat.playerName, teamName: stat.team, assists: 0 };
        existing.assists += stat.assists;
        playerAssists.set(stat.playerId, existing);
      }
    }
  }

  const topScorers = [...playerGoals.values()]
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 10)
    .map((entry, idx) => ({
      playerId: [...playerGoals.keys()][idx] ?? "",
      ...entry,
    }));

  const topAssisters = [...playerAssists.values()]
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 10)
    .map((entry, idx) => ({
      playerId: [...playerAssists.keys()][idx] ?? "",
      ...entry,
    }));

  return {
    groupStage,
    knockout,
    champion: tournament.championTeamName,
    totalMatches: allResults.length + allKnockoutResults.length,
    totalGoals,
    topScorers,
    topAssisters,
  };
}

export function exportReportAsJson(report: TournamentReport): string {
  return JSON.stringify(report, null, 2);
}
