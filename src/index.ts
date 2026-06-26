export type { Club, ClubFacilities, ClubFinances, ClubStatus } from "./domain/club";
export type { Manager } from "./domain/manager";
export type {
  CompetitionType,
  InjuryEvent,
  InjuryAvailabilityConsequence,
  MatchContext,
  MatchAvailabilityConsequences,
  MatchImportance,
  MatchResult,
  MatchStats,
  PlayerMatchStats,
  PlayerRating,
  PossessionEvent,
  PossessionParticipants,
  SubstitutionEvent,
  SuspensionConsequence,
  VenueType,
  Weather,
} from "./domain/match-context";
export type {
  Foot,
  GoalkeepingAttributes,
  MentalAttributes,
  PhysicalAttributes,
  Player,
  PlayerAttributes,
  Position,
  Role,
  SetPieceAttributes,
  TechnicalAttributes,
} from "./domain/player";
export type {
  DefensiveLine,
  Directness,
  Formation,
  Mentality,
  PressingIntensity,
  Tactic,
  Tempo,
  Width,
} from "./domain/tactic";
export { simulateMatch, type LineupPlayer, type TeamSetup } from "./engine/match-simulator";
export { buildDefaultTactic, buildLineup, type BuildLineupConfig, type BuiltLineup } from "./engine/lineup-builder";
export {
  competitionRulePresets,
  createCompetitionRules,
  defaultCompetitionRules,
  type CompetitionInjuryRules,
  type CompetitionKnockoutRules,
  type CompetitionMatchRules,
  type CompetitionPointsRules,
  type CompetitionRecoveryRules,
  type CompetitionRules,
  type CompetitionRuleOverrides,
  type CompetitionSuspensionRules,
} from "./engine/competition-rules";
export {
  applyMatchAvailabilityConsequences,
  getAvailableSquad,
  getStartingCondition,
  initializeSeasonPlayerStatuses,
  resetYellowCards,
  tickRecoveryByMatches,
  tickRecovery,
  updatePlayerFitness,
  type SeasonAvailabilityStatus,
  type SeasonPlayerStatus,
  type SeasonSquadAvailability,
} from "./engine/season-state";
export {
  getEligiblePlayersForClub,
  initializeLeagueTable,
  simulateMatchday,
  sortLeagueTable,
  updateLeagueTableFromMatch,
  type Fixture,
  type LeagueTableEntry,
  type MatchdaySimulationInput,
  type MatchdaySimulationResult,
} from "./engine/league-state";
export {
  generateRoundRobinFixtures,
  simulateSeason,
  type SeasonClubAggregateStats,
  type SeasonLeaderboardEntry,
  type SeasonPlayerAggregateStats,
  type SeasonSimulationState,
  type SeasonTeamDefinition,
  type SimulateSeasonOptions,
} from "./engine/season-simulator";
export {
  advanceKnockoutRound,
  createKnockoutBracket,
  simulateKnockoutRound,
  simulateKnockoutTie,
  type KnockoutBracket,
  type KnockoutRoundResult,
  type KnockoutTeamDefinition,
  type KnockoutTie,
  type KnockoutTieResult,
  type PenaltyShootoutResult,
  type SimulateKnockoutOptions,
} from "./engine/knockout-state";
export {
  createInitialKnockoutRound,
  simulateKnockoutTournament,
  type KnockoutTournamentRound,
  type KnockoutTournamentState,
  type SimulateKnockoutTournamentOptions,
} from "./engine/knockout-tournament";
export {
  getQualifiedTeams,
  simulateGroupStage,
  type GroupFixture,
  type GroupStageGroupResult,
  type GroupStageSimulationResult,
  type GroupStageTeamDefinition,
  type SimulateGroupStageOptions,
} from "./engine/group-stage";
export {
  drawGroupsFromPots,
  seedKnockoutBracket,
  type GroupDrawPot,
  type GroupDrawResult,
  type GroupDrawRules,
  type KnockoutDrawRules,
  type SeededKnockoutTeam,
} from "./engine/draw-engine";
export {
  simulateTournament,
  type TournamentSimulationOptions,
  type TournamentSimulationState,
} from "./engine/tournament-simulator";
export {
  createSeasonSummary,
  deserializeSeasonState,
  exportSeasonSnapshot,
  serializeSeasonState,
  type SeasonSummary,
  type SerializedSeasonPlayerStatus,
  type SerializedSeasonSimulationState,
} from "./engine/season-persistence";
export {
  buildGroupStageReport,
  buildKnockoutBracketReport,
  buildTournamentReport,
  exportReportAsJson,
  type GroupReportRow,
  type GroupStageReport,
  type KnockoutBracketReport,
  type KnockoutMatchSummary,
  type KnockoutRoundReport,
  type TournamentReport,
} from "./engine/competition-reports";
export {
  computeGoalkeeperPhaseScores,
  computePlayerPhaseScores,
  computePlayerRating,
  computeTeamPhaseScores,
  computeTeamStrength,
  type PhaseScores,
  type PlayerRatingComponents,
  type TeamStrength,
} from "./engine/ratings";
