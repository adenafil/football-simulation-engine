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

export interface PossessionEvent {
  minute: number;
  team: "home" | "away";
  phase: "buildUp" | "progression" | "finalThird" | "shot" | "goal";
  description: string;
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

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  events: PossessionEvent[];
  stats: MatchStats;
  playerRatings: PlayerRating[];
  manOfMatch: string;
  homeFormation: string;
  awayFormation: string;
}
