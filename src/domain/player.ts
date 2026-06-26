export type Foot = "left" | "right";

export type Position = "GK" | "CB" | "LB" | "RB" | "DM" | "CM" | "LM" | "RM" | "AML" | "AMC" | "AMR" | "ST" | "CF" | "LWB" | "RWB";

export type Role =
  | "Goalkeeper"
  | "Ball-Playing Goalkeeper"
  | "No-Nonsense Goalkeeper"
  | "Sweeper Keeper"
  | "Line-Holding Goalkeeper"
  | "Centre-Back"
  | "Ball-Playing Defender"
  | "No-Nonsense Centre-Back"
  | "Wide Centre-Back"
  | "Full-Back"
  | "Wing-Back"
  | "Complete Wing-Back"
  | "Inverted Full-Back"
  | "No-Nonsense Full-Back"
  | "Defensive Midfielder"
  | "Half-Back"
  | "Anchor Man"
  | "Regista"
  | "Roaming Playmaker"
  | "Central Midfielder"
  | "Box-to-Box Midfielder"
  | "Ball-Winning Midfielder"
  | "Mezzala"
  | "Advanced Playmaker"
  | "Enganche"
  | "Deep-Lying Playmaker"
  | "Wide Midfielder"
  | "Winger"
  | "Inside Winger"
  | "Inside Forward"
  | "Wide Playmaker"
  | "Racing Winger"
  | "Channel Forward"
  | "Advanced Forward"
  | "Poacher"
  | "Target Man"
  | "Deep-Lying Forward"
  | "Complete Forward"
  | "Shadow Striker"
  | "Trequartista"
  | "False Nine"
  | "Pressing Forward";

export interface TechnicalAttributes {
  crossing: number;
  dribbling: number;
  finishing: number;
  firstTouch: number;
  heading: number;
  longShots: number;
  marking: number;
  passing: number;
  tackling: number;
  technique: number;
}

export interface MentalAttributes {
  aggression: number;
  anticipation: number;
  bravery: number;
  composure: number;
  concentration: number;
  decisions: number;
  determination: number;
  flair: number;
  leadership: number;
  offTheBall: number;
  positioning: number;
  teamwork: number;
  vision: number;
  workRate: number;
}

export interface PhysicalAttributes {
  acceleration: number;
  agility: number;
  balance: number;
  jumpingReach: number;
  naturalFitness: number;
  pace: number;
  stamina: number;
  strength: number;
}

export interface GoalkeepingAttributes {
  aerialReach: number;
  commandOfArea: number;
  communication: number;
  eccentricity: number;
  firstTouch: number;
  handling: number;
  kicking: number;
  oneOnOnes: number;
  passing: number;
  punching: number;
  reflexes: number;
  rushingOut: number;
  throwing: number;
}

export interface SetPieceAttributes {
  corners: number;
  freeKickTaking: number;
  longThrows: number;
  penaltyTaking: number;
}

export interface PlayerAttributes {
  technical: TechnicalAttributes;
  mental: MentalAttributes;
  physical: PhysicalAttributes;
  goalkeeping?: GoalkeepingAttributes;
  setPieces: SetPieceAttributes;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  positions: Position[];
  preferredFoot: Foot;
  secondaryFoot: Foot;
  footRating: number;
  height: number;
  caps: number;
  goals: number;
  clubId: string;
  nation: string;
  contractEnd: string;
  wages: number;
  sellValue: number;
  attributes: PlayerAttributes;
  consistency: number;
  importantMatches: number;
  injuryProneness: number;
  morale: number;
  condition: number;
  sharpness: number;
  roleSuitability: Partial<Record<Role, number>>;
}
