import type { Club } from "../domain/club";
import type { Manager } from "../domain/manager";
import type { MatchContext, MatchResult } from "../domain/match-context";
import type { Player } from "../domain/player";
import type { Formation, Mentality } from "../domain/tactic";
import { buildDefaultTactic, buildLineup } from "./lineup-builder";
import type { TeamSetup } from "./match-simulator";
import { simulateMatch } from "./match-simulator";
import { createCompetitionRules, type CompetitionRuleOverrides, type CompetitionRules } from "./competition-rules";
import { getEligiblePlayersForClub } from "./league-state";
import { initializeSeasonPlayerStatuses, type SeasonPlayerStatus } from "./season-state";

export interface KnockoutTeamDefinition {
  club: Club;
  manager: Manager;
  players: Player[];
  formation: Formation;
  mentality?: Mentality;
}

export interface KnockoutTie {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  legs: 1 | 2;
  context?: MatchContext;
  stage?: string;
}

export interface PenaltyShootoutResult {
  homePenalties: number;
  awayPenalties: number;
  winnerTeamId: string;
}

export interface KnockoutTieResult {
  tieId: string;
  legs: MatchResult[];
  aggregateHomeScore: number;
  aggregateAwayScore: number;
  awayGoalsHome: number;
  awayGoalsAway: number;
  winnerTeamId: string;
  winnerTeamName: string;
  decidedBy: "aggregate" | "away-goals" | "extra-time" | "penalties";
  penaltyShootout?: PenaltyShootoutResult;
}

export interface KnockoutBracket {
  rounds: KnockoutTie[][];
}

export interface KnockoutRoundResult {
  ties: KnockoutTieResult[];
  advancingTeamIds: string[];
}

export interface SimulateKnockoutOptions {
  competitionRules?: CompetitionRuleOverrides;
  statuses?: Map<string, SeasonPlayerStatus>;
  stageRules?: Record<string, CompetitionRuleOverrides>;
}

function defaultContext(): MatchContext {
  return {
    venueType: "neutral",
    weather: "clear",
    importance: "cup",
    competitionType: "cup",
    isDerby: false,
  };
}

function buildTeamSetup(
  definition: KnockoutTeamDefinition,
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

function simulatePenaltyShootout(homeTeamId: string, awayTeamId: string): PenaltyShootoutResult {
  let homePenalties = 0;
  let awayPenalties = 0;

  for (let round = 0; round < 5; round++) {
    if (Math.random() < 0.76) homePenalties++;
    if (Math.random() < 0.76) awayPenalties++;
  }

  while (homePenalties === awayPenalties) {
    if (Math.random() < 0.76) homePenalties++;
    if (Math.random() < 0.76) awayPenalties++;
  }

  return {
    homePenalties,
    awayPenalties,
    winnerTeamId: homePenalties > awayPenalties ? homeTeamId : awayTeamId,
  };
}

function resolveExtraTimeWinner(firstLegHomeScore: number, firstLegAwayScore: number): "home" | "away" {
  const homeChance = 0.5 + (firstLegHomeScore - firstLegAwayScore) * 0.03;
  return Math.random() < Math.max(0.25, Math.min(0.75, homeChance)) ? "home" : "away";
}

export function simulateKnockoutTie(
  tie: KnockoutTie,
  teams: KnockoutTeamDefinition[],
  options: SimulateKnockoutOptions = {},
): KnockoutTieResult {
  const stageOverrides = tie.stage ? options.stageRules?.[tie.stage] : undefined;
  const rules = createCompetitionRules({
    ...options.competitionRules,
    ...stageOverrides,
  });
  const statuses = options.statuses ?? initializeSeasonPlayerStatuses(teams.flatMap(team => team.players));
  const teamsById = new Map(teams.map(team => [team.club.id, team]));
  const home = teamsById.get(tie.homeTeamId);
  const away = teamsById.get(tie.awayTeamId);

  if (!home || !away) {
    throw new Error(`Unknown team in tie: ${tie.homeTeamId} vs ${tie.awayTeamId}`);
  }

  const homeSetup = buildTeamSetup(home, statuses, rules);
  const awaySetup = buildTeamSetup(away, statuses, rules);
  const firstLeg = simulateMatch(homeSetup, awaySetup, tie.context ?? defaultContext());
  const legs: MatchResult[] = [firstLeg];

  let aggregateHomeScore = firstLeg.homeScore;
  let aggregateAwayScore = firstLeg.awayScore;
  let awayGoalsHome = 0;
  let awayGoalsAway = firstLeg.awayScore;

  if (tie.legs === 2) {
    const secondLeg = simulateMatch(
      buildTeamSetup(away, statuses, rules),
      buildTeamSetup(home, statuses, rules),
      tie.context ?? defaultContext(),
    );
    legs.push(secondLeg);
    aggregateHomeScore += secondLeg.awayScore;
    aggregateAwayScore += secondLeg.homeScore;
    awayGoalsHome += secondLeg.awayScore;
    awayGoalsAway += firstLeg.awayScore;
  }

  if (aggregateHomeScore !== aggregateAwayScore) {
    const winner = aggregateHomeScore > aggregateAwayScore ? home : away;
    return {
      tieId: tie.id,
      legs,
      aggregateHomeScore,
      aggregateAwayScore,
      awayGoalsHome,
      awayGoalsAway,
      winnerTeamId: winner.club.id,
      winnerTeamName: winner.club.name,
      decidedBy: "aggregate",
    };
  }

  if (tie.legs === 2 && rules.knockout.useAwayGoals && awayGoalsHome !== awayGoalsAway) {
    const winner = awayGoalsHome > awayGoalsAway ? home : away;
    return {
      tieId: tie.id,
      legs,
      aggregateHomeScore,
      aggregateAwayScore,
      awayGoalsHome,
      awayGoalsAway,
      winnerTeamId: winner.club.id,
      winnerTeamName: winner.club.name,
      decidedBy: "away-goals",
    };
  }

  if (!rules.knockout.allowExtraTime && rules.knockout.allowPenalties) {
    const penalties = simulatePenaltyShootout(home.club.id, away.club.id);
    const winner = penalties.winnerTeamId === home.club.id ? home : away;
    return {
      tieId: tie.id,
      legs,
      aggregateHomeScore,
      aggregateAwayScore,
      awayGoalsHome,
      awayGoalsAway,
      winnerTeamId: winner.club.id,
      winnerTeamName: winner.club.name,
      decidedBy: "penalties",
      penaltyShootout: penalties,
    };
  }

  const extraTimeWinner = resolveExtraTimeWinner(aggregateHomeScore, aggregateAwayScore);
  if (rules.knockout.allowExtraTime && Math.random() < 0.55) {
    const winner = extraTimeWinner === "home" ? home : away;
    if (extraTimeWinner === "home") aggregateHomeScore += 1;
    else aggregateAwayScore += 1;
    return {
      tieId: tie.id,
      legs,
      aggregateHomeScore,
      aggregateAwayScore,
      awayGoalsHome,
      awayGoalsAway,
      winnerTeamId: winner.club.id,
      winnerTeamName: winner.club.name,
      decidedBy: "extra-time",
    };
  }

  if (!rules.knockout.allowPenalties) {
    const winner = extraTimeWinner === "home" ? home : away;
    return {
      tieId: tie.id,
      legs,
      aggregateHomeScore,
      aggregateAwayScore,
      awayGoalsHome,
      awayGoalsAway,
      winnerTeamId: winner.club.id,
      winnerTeamName: winner.club.name,
      decidedBy: "extra-time",
    };
  }

  const penalties = simulatePenaltyShootout(home.club.id, away.club.id);
  const winner = penalties.winnerTeamId === home.club.id ? home : away;
  return {
    tieId: tie.id,
    legs,
    aggregateHomeScore,
    aggregateAwayScore,
    awayGoalsHome,
    awayGoalsAway,
    winnerTeamId: winner.club.id,
    winnerTeamName: winner.club.name,
    decidedBy: "penalties",
    penaltyShootout: penalties,
  };
}

export function advanceKnockoutRound(roundResult: KnockoutRoundResult, nextRoundName: string): KnockoutTie[] {
  const advancing = roundResult.advancingTeamIds;
  const ties: KnockoutTie[] = [];
  for (let i = 0; i < advancing.length; i += 2) {
    const homeTeamId = advancing[i];
    const awayTeamId = advancing[i + 1];
    if (!homeTeamId || !awayTeamId) continue;
    ties.push({
      id: `${nextRoundName}-${homeTeamId}-${awayTeamId}`,
      homeTeamId,
      awayTeamId,
      legs: 1,
      stage: nextRoundName,
    });
  }
  return ties;
}

export function createKnockoutBracket(initialRound: KnockoutTie[]): KnockoutBracket {
  return {
    rounds: [initialRound],
  };
}

export function simulateKnockoutRound(
  ties: KnockoutTie[],
  teams: KnockoutTeamDefinition[],
  options: SimulateKnockoutOptions = {},
): KnockoutRoundResult {
  const results = ties.map(tie => simulateKnockoutTie(tie, teams, options));
  return {
    ties: results,
    advancingTeamIds: results.map(result => result.winnerTeamId),
  };
}
