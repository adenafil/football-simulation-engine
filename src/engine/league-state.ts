import type { Club } from "../domain/club";
import type { MatchContext, MatchResult } from "../domain/match-context";
import type { Player } from "../domain/player";
import type { TeamSetup } from "./match-simulator";
import { simulateMatch } from "./match-simulator";
import { defaultCompetitionRules, type CompetitionRules } from "./competition-rules";
import {
  applyMatchAvailabilityConsequences,
  getAvailableSquad,
  tickRecoveryByMatches,
  type SeasonPlayerStatus,
} from "./season-state";

export interface Fixture {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  matchday: number;
}

export interface LeagueTableEntry {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface MatchdaySimulationInput {
  fixture: Fixture;
  homeSetup: TeamSetup;
  awaySetup: TeamSetup;
  context: MatchContext;
}

export interface MatchdaySimulationResult {
  results: MatchResult[];
  updatedTable: LeagueTableEntry[];
  updatedStatuses: Map<string, SeasonPlayerStatus>;
}

export function initializeLeagueTable(clubs: Club[]): LeagueTableEntry[] {
  return clubs.map(club => ({
    teamId: club.id,
    teamName: club.name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));
}

export function updateLeagueTableFromMatch(
  currentTable: LeagueTableEntry[],
  result: MatchResult,
  rules: CompetitionRules = defaultCompetitionRules,
): LeagueTableEntry[] {
  const nextTable = currentTable.map(entry => ({ ...entry }));
  const homeEntry = nextTable.find(entry => entry.teamId === result.homeTeamId);
  const awayEntry = nextTable.find(entry => entry.teamId === result.awayTeamId);

  if (!homeEntry || !awayEntry) {
    throw new Error("Match result contains team not present in league table");
  }

  homeEntry.played++;
  awayEntry.played++;
  homeEntry.goalsFor += result.homeScore;
  homeEntry.goalsAgainst += result.awayScore;
  awayEntry.goalsFor += result.awayScore;
  awayEntry.goalsAgainst += result.homeScore;
  homeEntry.goalDifference = homeEntry.goalsFor - homeEntry.goalsAgainst;
  awayEntry.goalDifference = awayEntry.goalsFor - awayEntry.goalsAgainst;

  if (result.homeScore > result.awayScore) {
    homeEntry.wins++;
    homeEntry.points += rules.points.win;
    awayEntry.losses++;
    awayEntry.points += rules.points.loss;
  } else if (result.homeScore < result.awayScore) {
    awayEntry.wins++;
    awayEntry.points += rules.points.win;
    homeEntry.losses++;
    homeEntry.points += rules.points.loss;
  } else {
    homeEntry.draws++;
    awayEntry.draws++;
    homeEntry.points += rules.points.draw;
    awayEntry.points += rules.points.draw;
  }

  return sortLeagueTable(nextTable);
}

export function sortLeagueTable(entries: LeagueTableEntry[]): LeagueTableEntry[] {
  return [...entries].sort((a, b) =>
    b.points - a.points
    || b.goalDifference - a.goalDifference
    || b.goalsFor - a.goalsFor
    || a.teamName.localeCompare(b.teamName),
  );
}

export function simulateMatchday(
  inputs: MatchdaySimulationInput[],
  currentTable: LeagueTableEntry[],
  currentStatuses: Map<string, SeasonPlayerStatus>,
  rules: CompetitionRules = defaultCompetitionRules,
): MatchdaySimulationResult {
  let updatedTable = currentTable;
  let updatedStatuses = new Map(currentStatuses);
  const results: MatchResult[] = [];

  for (const input of inputs) {
    const result = simulateMatch(input.homeSetup, input.awaySetup, input.context);
    results.push(result);
    updatedTable = updateLeagueTableFromMatch(updatedTable, result, rules);
    updatedStatuses = applyMatchAvailabilityConsequences(updatedStatuses, result.availability, rules);
  }

  updatedStatuses = tickRecoveryByMatches(updatedStatuses, rules.recovery.ticksPerMatchday);

  return {
    results,
    updatedTable,
    updatedStatuses,
  };
}

export function getEligiblePlayersForClub(
  players: Player[],
  statuses: Map<string, SeasonPlayerStatus>,
): Player[] {
  return getAvailableSquad(players, statuses).available;
}
