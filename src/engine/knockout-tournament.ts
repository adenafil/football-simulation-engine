import type { CompetitionRuleOverrides } from "./competition-rules";
import {
  advanceKnockoutRound,
  createKnockoutBracket,
  simulateKnockoutRound,
  type KnockoutBracket,
  type KnockoutRoundResult,
  type KnockoutTeamDefinition,
  type KnockoutTie,
  type SimulateKnockoutOptions,
} from "./knockout-state";
import type { SeasonPlayerStatus } from "./season-state";

export interface KnockoutTournamentRound {
  name: string;
  ties: KnockoutTie[];
  result?: KnockoutRoundResult;
}

export interface KnockoutTournamentState {
  bracket: KnockoutBracket;
  rounds: KnockoutTournamentRound[];
  championTeamId: string;
  championTeamName: string;
}

export interface SimulateKnockoutTournamentOptions extends SimulateKnockoutOptions {
  initialLegs?: 1 | 2;
  finalLegs?: 1 | 2;
  stageRules?: Record<string, CompetitionRuleOverrides>;
  statuses?: Map<string, SeasonPlayerStatus>;
}

function nextPowerOfTwo(value: number): number {
  let power = 1;
  while (power < value) power *= 2;
  return power;
}

function getRoundName(teamCount: number): string {
  if (teamCount === 2) return "final";
  if (teamCount === 4) return "semi-final";
  if (teamCount === 8) return "quarter-final";
  if (teamCount === 16) return "round-of-16";
  return `round-of-${teamCount}`;
}

export function createInitialKnockoutRound(
  teams: KnockoutTeamDefinition[],
  initialLegs: 1 | 2 = 1,
): KnockoutTie[] {
  if (teams.length < 2) return [];

  const teamIds = teams.map(team => team.club.id);
  const paddedSize = nextPowerOfTwo(teamIds.length);
  const paddedIds = [...teamIds];

  while (paddedIds.length < paddedSize) {
    paddedIds.push("__bye__");
  }

  const roundName = getRoundName(paddedSize);
  const ties: KnockoutTie[] = [];

  for (let i = 0; i < paddedIds.length; i += 2) {
    const homeTeamId = paddedIds[i]!;
    const awayTeamId = paddedIds[i + 1]!;
    if (homeTeamId === "__bye__" || awayTeamId === "__bye__") continue;

    ties.push({
      id: `${roundName}-${homeTeamId}-${awayTeamId}`,
      homeTeamId,
      awayTeamId,
      legs: initialLegs,
      stage: roundName,
    });
  }

  return ties;
}

export function simulateKnockoutTournament(
  teams: KnockoutTeamDefinition[],
  options: SimulateKnockoutTournamentOptions = {},
): KnockoutTournamentState {
  if (teams.length === 1) {
    return {
      bracket: { rounds: [] },
      rounds: [],
      championTeamId: teams[0]!.club.id,
      championTeamName: teams[0]!.club.name,
    };
  }

  const initialRound = createInitialKnockoutRound(teams, options.initialLegs ?? 1);
  const bracket = createKnockoutBracket(initialRound);
  const rounds: KnockoutTournamentRound[] = [];

  let currentTies = initialRound;
  let latestResult: KnockoutRoundResult | undefined;

  while (currentTies.length > 0) {
    const roundName = currentTies[0]?.stage ?? `round-${rounds.length + 1}`;
    const effectiveTies = currentTies.map(tie => ({
      ...tie,
      legs: roundName === "final" ? options.finalLegs ?? 1 : tie.legs,
    }));

    latestResult = simulateKnockoutRound(effectiveTies, teams, options);
    rounds.push({
      name: roundName,
      ties: effectiveTies,
      result: latestResult,
    });

    if (latestResult.advancingTeamIds.length <= 1) {
      break;
    }

    const nextRoundTeamCount = latestResult.advancingTeamIds.length;
    const nextRoundName = getRoundName(nextRoundTeamCount);
    currentTies = advanceKnockoutRound(latestResult, nextRoundName).map(tie => ({
      ...tie,
      legs: nextRoundName === "final" ? options.finalLegs ?? 1 : 1,
      stage: nextRoundName,
    }));
    bracket.rounds.push(currentTies);
  }

  if (!latestResult || latestResult.advancingTeamIds.length === 0) {
    throw new Error("Knockout tournament ended without a champion");
  }

  const championTeamId = latestResult.advancingTeamIds[0]!;
  const championTeam = teams.find(team => team.club.id === championTeamId);
  if (!championTeam) {
    throw new Error(`Champion team not found: ${championTeamId}`);
  }

  return {
    bracket,
    rounds,
    championTeamId,
    championTeamName: championTeam.club.name,
  };
}
