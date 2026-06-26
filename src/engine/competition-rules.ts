import type { InjuryAvailabilityConsequence, MatchAvailabilityConsequences } from "../domain/match-context";

export interface CompetitionPointsRules {
  win: number;
  draw: number;
  loss: number;
}

export interface YellowCardAccumulationThreshold {
  yellowCards: number;
  suspendMatches: number;
}

export interface CompetitionSuspensionRules {
  redCardBanMatches: number;
  yellowCardAccumulation: YellowCardAccumulationThreshold[];
  yellowCardResetAfter: number;
}

export interface CompetitionInjuryRules {
  moderateMatchesOut: number;
  severeMatchesOut: number;
  moderateStatus: InjuryAvailabilityConsequence["status"];
  severeStatus: InjuryAvailabilityConsequence["status"];
}

export interface CompetitionRecoveryRules {
  ticksPerMatchday: number;
}

export interface CompetitionMatchRules {
  maxBenchSize: number;
  maxSubstitutions: number;
}

export interface CompetitionKnockoutRules {
  useAwayGoals: boolean;
  allowExtraTime: boolean;
  allowPenalties: boolean;
  extraTimeSubsAllowed: number;
}

export type GroupTiebreaker = "goalDifference" | "goalsFor" | "headToHead" | "fewestGoalsAgainst" | "fairPlay" | "clubReputation" | "teamName";

export interface CompetitionGroupRules {
  tiebreakers: GroupTiebreaker[];
}

export interface CompetitionRules {
  points: CompetitionPointsRules;
  suspensions: CompetitionSuspensionRules;
  injuries: CompetitionInjuryRules;
  recovery: CompetitionRecoveryRules;
  match: CompetitionMatchRules;
  knockout: CompetitionKnockoutRules;
  group: CompetitionGroupRules;
}

export const defaultCompetitionRules: CompetitionRules = {
  points: {
    win: 3,
    draw: 1,
    loss: 0,
  },
  suspensions: {
    redCardBanMatches: 1,
    yellowCardAccumulation: [
      { yellowCards: 5, suspendMatches: 1 },
      { yellowCards: 10, suspendMatches: 2 },
      { yellowCards: 15, suspendMatches: 3 },
    ],
    yellowCardResetAfter: 19,
  },
  injuries: {
    moderateMatchesOut: 2,
    severeMatchesOut: 5,
    moderateStatus: "doubtful",
    severeStatus: "unavailable",
  },
  recovery: {
    ticksPerMatchday: 1,
  },
  match: {
    maxBenchSize: 7,
    maxSubstitutions: 5,
  },
  knockout: {
    useAwayGoals: false,
    allowExtraTime: true,
    allowPenalties: true,
    extraTimeSubsAllowed: 1,
  },
  group: {
    tiebreakers: ["goalDifference", "goalsFor", "fewestGoalsAgainst", "teamName"],
  },
};

export interface CompetitionRuleOverrides {
  points?: Partial<CompetitionPointsRules>;
  suspensions?: Partial<CompetitionSuspensionRules>;
  injuries?: Partial<CompetitionInjuryRules>;
  recovery?: Partial<CompetitionRecoveryRules>;
  match?: Partial<CompetitionMatchRules>;
  knockout?: Partial<CompetitionKnockoutRules>;
  group?: Partial<CompetitionGroupRules>;
}

export function createCompetitionRules(overrides: CompetitionRuleOverrides = {}): CompetitionRules {
  return {
    points: {
      ...defaultCompetitionRules.points,
      ...overrides.points,
    },
    suspensions: {
      ...defaultCompetitionRules.suspensions,
      ...overrides.suspensions,
    },
    injuries: {
      ...defaultCompetitionRules.injuries,
      ...overrides.injuries,
    },
    recovery: {
      ...defaultCompetitionRules.recovery,
      ...overrides.recovery,
    },
    match: {
      ...defaultCompetitionRules.match,
      ...overrides.match,
    },
    knockout: {
      ...defaultCompetitionRules.knockout,
      ...overrides.knockout,
    },
    group: {
      ...defaultCompetitionRules.group,
      ...overrides.group,
      tiebreakers: overrides.group?.tiebreakers ?? defaultCompetitionRules.group.tiebreakers,
    },
  };
}

export const competitionRulePresets = {
  standardLeague: defaultCompetitionRules,
  uclModern: createCompetitionRules({
    match: {
      maxBenchSize: 12,
      maxSubstitutions: 5,
    },
    suspensions: {
      yellowCardAccumulation: [
        { yellowCards: 2, suspendMatches: 1 },
      ],
      yellowCardResetAfter: 3,
    },
    knockout: {
      useAwayGoals: false,
      allowExtraTime: true,
      allowPenalties: true,
    },
    group: {
      tiebreakers: ["headToHead", "goalDifference", "goalsFor", "fairPlay", "clubReputation", "teamName"],
    },
  }),
  worldCupModern: createCompetitionRules({
    match: {
      maxBenchSize: 15,
      maxSubstitutions: 5,
    },
    suspensions: {
      yellowCardAccumulation: [
        { yellowCards: 2, suspendMatches: 1 },
        { yellowCards: 5, suspendMatches: 1 },
      ],
      yellowCardResetAfter: 4,
    },
    knockout: {
      useAwayGoals: false,
      allowExtraTime: true,
      allowPenalties: true,
    },
    group: {
      tiebreakers: ["goalDifference", "goalsFor", "fewestGoalsAgainst", "fairPlay", "teamName"],
    },
  }),
  worldCupClassic: createCompetitionRules({
    match: {
      maxBenchSize: 12,
      maxSubstitutions: 5,
    },
    suspensions: {
      redCardBanMatches: 1,
    },
  }),
  domesticCupModern: createCompetitionRules({
    match: {
      maxBenchSize: 9,
      maxSubstitutions: 5,
    },
    knockout: {
      useAwayGoals: false,
      allowExtraTime: true,
      allowPenalties: true,
    },
  }),
  uclClassicAwayGoals: createCompetitionRules({
    knockout: {
      useAwayGoals: true,
      allowExtraTime: true,
      allowPenalties: true,
    },
  }),
  superCup: createCompetitionRules({
    match: {
      maxBenchSize: 12,
      maxSubstitutions: 6,
    },
  }),
  twoPointLeague: createCompetitionRules({
    points: {
      win: 2,
      draw: 1,
      loss: 0,
    },
  }),
  faCupModern: createCompetitionRules({
    match: {
      maxBenchSize: 9,
      maxSubstitutions: 5,
    },
    knockout: {
      useAwayGoals: false,
      allowExtraTime: true,
      allowPenalties: true,
    },
  }),
  eflCupModern: createCompetitionRules({
    match: {
      maxBenchSize: 9,
      maxSubstitutions: 5,
    },
    knockout: {
      useAwayGoals: false,
      allowExtraTime: true,
      allowPenalties: true,
    },
  }),
  copaDelReyModern: createCompetitionRules({
    match: {
      maxBenchSize: 12,
      maxSubstitutions: 5,
    },
    knockout: {
      useAwayGoals: false,
      allowExtraTime: true,
      allowPenalties: true,
    },
  }),
  communityShield: createCompetitionRules({
    match: {
      maxBenchSize: 12,
      maxSubstitutions: 6,
    },
    knockout: {
      useAwayGoals: false,
      allowExtraTime: false,
      allowPenalties: true,
    },
  }),
};
