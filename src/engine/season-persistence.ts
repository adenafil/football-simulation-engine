import type { SeasonPlayerStatus } from "./season-state";
import type {
  SeasonClubAggregateStats,
  SeasonLeaderboardEntry,
  SeasonPlayerAggregateStats,
  SeasonSimulationState,
} from "./season-simulator";
import type { Fixture, LeagueTableEntry } from "./league-state";
import type { MatchResult } from "../domain/match-context";

export interface SerializedSeasonPlayerStatus {
  playerId: string;
  playerName: string;
  suspensionMatchesRemaining: number;
  injuryMatchesRemaining: number;
  status: SeasonPlayerStatus["status"];
}

export interface SerializedSeasonSimulationState {
  fixtures: Fixture[];
  playedResults: MatchResult[];
  table: LeagueTableEntry[];
  playerStatuses: SerializedSeasonPlayerStatus[];
  playerSeasonStats: SeasonPlayerAggregateStats[];
  clubSeasonStats: SeasonClubAggregateStats[];
  topScorers: SeasonLeaderboardEntry[];
  topAssists: SeasonLeaderboardEntry[];
  topCleanSheets: SeasonLeaderboardEntry[];
  topAverageRatings: SeasonLeaderboardEntry[];
  topCards: SeasonLeaderboardEntry[];
}

export interface SeasonSummary {
  fixturesPlayed: number;
  totalGoals: number;
  champion?: LeagueTableEntry;
  topScorer?: SeasonLeaderboardEntry;
  topAssist?: SeasonLeaderboardEntry;
  bestAverageRating?: SeasonLeaderboardEntry;
  bestDefense?: SeasonClubAggregateStats;
  bestAttack?: SeasonClubAggregateStats;
}

export function serializeSeasonState(state: SeasonSimulationState): SerializedSeasonSimulationState {
  return {
    fixtures: state.fixtures,
    playedResults: state.playedResults,
    table: state.table,
    playerStatuses: [...state.playerStatuses.values()].map(status => ({ ...status })),
    playerSeasonStats: state.playerSeasonStats,
    clubSeasonStats: state.clubSeasonStats,
    topScorers: state.topScorers,
    topAssists: state.topAssists,
    topCleanSheets: state.topCleanSheets,
    topAverageRatings: state.topAverageRatings,
    topCards: state.topCards,
  };
}

export function deserializeSeasonState(state: SerializedSeasonSimulationState): SeasonSimulationState {
  return {
    fixtures: state.fixtures,
    playedResults: state.playedResults,
    table: state.table,
    playerStatuses: new Map(state.playerStatuses.map(status => [status.playerId, { ...status }])),
    playerSeasonStats: state.playerSeasonStats,
    clubSeasonStats: state.clubSeasonStats,
    topScorers: state.topScorers,
    topAssists: state.topAssists,
    topCleanSheets: state.topCleanSheets,
    topAverageRatings: state.topAverageRatings,
    topCards: state.topCards,
  };
}

export function createSeasonSummary(state: SeasonSimulationState): SeasonSummary {
  const totalGoals = state.playedResults.reduce((sum, result) => sum + result.homeScore + result.awayScore, 0);

  return {
    fixturesPlayed: state.playedResults.length,
    totalGoals,
    champion: state.table[0],
    topScorer: state.topScorers[0],
    topAssist: state.topAssists[0],
    bestAverageRating: state.topAverageRatings[0],
    bestDefense: [...state.clubSeasonStats].sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.cleanSheets - a.cleanSheets)[0],
    bestAttack: [...state.clubSeasonStats].sort((a, b) => b.goalsFor - a.goalsFor || b.averageXG - a.averageXG)[0],
  };
}

export function exportSeasonSnapshot(state: SeasonSimulationState): string {
  return JSON.stringify({
    state: serializeSeasonState(state),
    summary: createSeasonSummary(state),
  });
}
