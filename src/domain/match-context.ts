export type VenueType = "home" | "away" | "neutral";

export type Weather = "clear" | "rain" | "snow" | "wind" | "hot";

export type MatchImportance = "friendly" | "league" | "continental" | "cup" | "final";

export type CompetitionType = "friendly" | "league" | "cup" | "continental";

export interface MatchContext {
  venueType: VenueType;
  weather: Weather;
  importance: MatchImportance;
  competitionType: CompetitionType;
  travelDistance?: number;
  isDerby: boolean;
}

export interface SubstitutionEvent {
  minute: number;
  team: "home" | "away";
  playerOutId: string;
  playerOutName: string;
  playerInId: string;
  playerInName: string;
  reason: "fatigue" | "chasing-goal" | "protect-lead";
}

export interface InjuryEvent {
  minute: number;
  team: "home" | "away";
  playerId: string;
  playerName: string;
  severity: "minor" | "moderate" | "severe";
  forcedSubstitution: boolean;
  replacementPlayerId?: string;
  replacementPlayerName?: string;
}

export interface PossessionParticipants {
  buildUpPlayerId?: string;
  progressionPlayerId?: string;
  creatorPlayerId?: string;
  shooterPlayerId?: string;
  assisterPlayerId?: string;
  defenderPlayerId?: string;
}

export interface PossessionEvent {
  minute: number;
  team: "home" | "away";
  phase: "buildUp" | "progression" | "finalThird" | "shot" | "goal" | "substitution" | "injury";
  description: string;
  participants?: PossessionParticipants;
}

export interface PlayerMatchStats {
  playerId: string;
  name: string;
  team: "home" | "away";
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  keyPasses: number;
  passesCompleted: number;
  tackles: number;
  interceptions: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
}

export interface PlayerRating {
  playerId: string;
  name: string;
  rating: number;
  goals: number;
  assists: number;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  passesCompleted: number;
  shots: number;
  shotsOnTarget: number;
  minutesPlayed: number;
}

export interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  offsides: { home: number; away: number };
  xG: { home: number; away: number };
}

export interface SuspensionConsequence {
  playerId: string;
  playerName: string;
  team: "home" | "away";
  reason: "red-card";
  matches: number;
}

export interface InjuryAvailabilityConsequence {
  playerId: string;
  playerName: string;
  team: "home" | "away";
  severity: "minor" | "moderate" | "severe";
  expectedMatchesOut: number;
  status: "available" | "doubtful" | "unavailable";
}

export interface MatchAvailabilityConsequences {
  suspensions: SuspensionConsequence[];
  injuries: InjuryAvailabilityConsequence[];
}

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  events: PossessionEvent[];
  stats: MatchStats;
  playerMatchStats: PlayerMatchStats[];
  playerRatings: PlayerRating[];
  manOfMatch: string;
  homeFormation: string;
  awayFormation: string;
  substitutions: SubstitutionEvent[];
  injuries: InjuryEvent[];
  availability: MatchAvailabilityConsequences;
}
