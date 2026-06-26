import type { MatchContext } from "../domain/match-context";
import type { CompetitionRuleOverrides } from "./competition-rules";
import {
  getQualifiedTeams,
  simulateGroupStage,
  type GroupStageSimulationResult,
  type GroupStageTeamDefinition,
  type SimulateGroupStageOptions,
} from "./group-stage";
import {
  simulateKnockoutTournament,
  type KnockoutTournamentState,
  type SimulateKnockoutTournamentOptions,
} from "./knockout-tournament";

export interface TournamentSimulationOptions {
  groupStage?: Omit<SimulateGroupStageOptions, "context" | "competitionRules">;
  knockout?: Omit<SimulateKnockoutTournamentOptions, "competitionRules">;
  competitionRules?: CompetitionRuleOverrides;
  context?: MatchContext;
}

export interface TournamentSimulationState {
  groupStage: GroupStageSimulationResult;
  knockout: KnockoutTournamentState;
  championTeamId: string;
  championTeamName: string;
}

export function simulateTournament(
  teams: GroupStageTeamDefinition[],
  options: TournamentSimulationOptions = {},
): TournamentSimulationState {
  const groupStage = simulateGroupStage(teams, {
    ...options.groupStage,
    context: options.context,
    competitionRules: options.competitionRules,
  });

  const qualifiedTeams = getQualifiedTeams(groupStage, options.groupStage?.qualifiersPerGroup ?? 2);
  const knockout = simulateKnockoutTournament(qualifiedTeams, {
    ...options.knockout,
    competitionRules: options.competitionRules,
  });

  return {
    groupStage,
    knockout,
    championTeamId: knockout.championTeamId,
    championTeamName: knockout.championTeamName,
  };
}
