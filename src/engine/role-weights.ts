import type { Role, Position } from "../domain/player";

export interface PhaseWeights {
  buildUp: number;
  progression: number;
  finalThird: number;
  finishing: number;
  defensiveSolidity: number;
  pressing: number;
  aerial: number;
  transitionAttack: number;
  transitionDefense: number;
}

export interface AttributeWeights {
  technical: Partial<Record<keyof import("../domain/player").TechnicalAttributes, number>>;
  mental: Partial<Record<keyof import("../domain/player").MentalAttributes, number>>;
  physical: Partial<Record<keyof import("../domain/player").PhysicalAttributes, number>>;
}

export interface RoleDefinition {
  name: Role;
  primaryPositions: Position[];
  phaseWeights: PhaseWeights;
  attributeWeights: AttributeWeights;
}

const roleDefinitions: RoleDefinition[] = [
  {
    name: "Goalkeeper",
    primaryPositions: ["GK"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.05,
      finalThird: 0,
      finishing: 0,
      defensiveSolidity: 0.5,
      pressing: 0,
      aerial: 0.3,
      transitionAttack: 0,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { passing: 0.1, technique: 0.1 },
      mental: { composure: 0.15, concentration: 0.2, decisions: 0.15, positioning: 0.2, anticipation: 0.15, determination: 0.05, flair: 0.05, aggression: 0.05 },
      physical: { agility: 0.2, balance: 0.1, jumpingReach: 0.2, strength: 0.1, naturalFitness: 0.1, acceleration: 0.1, pace: 0.1, stamina: 0.1 },
    },
  },
  {
    name: "Sweeper Keeper",
    primaryPositions: ["GK"],
    phaseWeights: {
      buildUp: 0.2,
      progression: 0.15,
      finalThird: 0,
      finishing: 0,
      defensiveSolidity: 0.4,
      pressing: 0,
      aerial: 0.2,
      transitionAttack: 0.05,
      transitionDefense: 0,
    },
    attributeWeights: {
      technical: { passing: 0.2, technique: 0.15 },
      mental: { composure: 0.15, concentration: 0.15, decisions: 0.15, positioning: 0.15, anticipation: 0.1, determination: 0.05, flair: 0.1, aggression: 0.05 },
      physical: { agility: 0.2, balance: 0.1, jumpingReach: 0.15, strength: 0.1, naturalFitness: 0.1, acceleration: 0.15, pace: 0.15, stamina: 0.1 },
    },
  },
  {
    name: "Centre-Back",
    primaryPositions: ["CB"],
    phaseWeights: {
      buildUp: 0.15,
      progression: 0.05,
      finalThird: 0.05,
      finishing: 0.02,
      defensiveSolidity: 0.4,
      pressing: 0.05,
      aerial: 0.2,
      transitionAttack: 0.03,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { heading: 0.15, marking: 0.2, tackling: 0.2, passing: 0.15, technique: 0.1, firstTouch: 0.1, crossing: 0.05, dribbling: 0.05 },
      mental: { anticipation: 0.15, bravery: 0.1, composure: 0.1, concentration: 0.15, decisions: 0.15, positioning: 0.2, aggression: 0.05, determination: 0.05, teamwork: 0.05 },
      physical: { jumpingReach: 0.2, strength: 0.2, pace: 0.15, acceleration: 0.1, stamina: 0.15, balance: 0.1, agility: 0.1 },
    },
  },
  {
    name: "Ball-Playing Defender",
    primaryPositions: ["CB"],
    phaseWeights: {
      buildUp: 0.25,
      progression: 0.15,
      finalThird: 0.05,
      finishing: 0.02,
      defensiveSolidity: 0.3,
      pressing: 0.05,
      aerial: 0.1,
      transitionAttack: 0.05,
      transitionDefense: 0.03,
    },
    attributeWeights: {
      technical: { heading: 0.1, marking: 0.15, tackling: 0.15, passing: 0.2, technique: 0.15, firstTouch: 0.15, dribbling: 0.1 },
      mental: { anticipation: 0.1, bravery: 0.05, composure: 0.15, concentration: 0.1, decisions: 0.15, positioning: 0.15, vision: 0.1, flair: 0.05, aggression: 0.05, determination: 0.05, teamwork: 0.05 },
      physical: { jumpingReach: 0.15, strength: 0.15, pace: 0.15, acceleration: 0.1, stamina: 0.15, balance: 0.1, agility: 0.1 },
    },
  },
  {
    name: "Full-Back",
    primaryPositions: ["LB", "RB"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.15,
      finalThird: 0.15,
      finishing: 0.03,
      defensiveSolidity: 0.25,
      pressing: 0.1,
      aerial: 0.05,
      transitionAttack: 0.1,
      transitionDefense: 0.07,
    },
    attributeWeights: {
      technical: { crossing: 0.15, dribbling: 0.1, tackling: 0.15, marking: 0.15, passing: 0.15, technique: 0.1, firstTouch: 0.1, heading: 0.05 },
      mental: { anticipation: 0.1, composure: 0.1, concentration: 0.1, decisions: 0.15, positioning: 0.15, teamwork: 0.1, workRate: 0.1, aggression: 0.05, determination: 0.05 },
      physical: { pace: 0.2, acceleration: 0.15, stamina: 0.2, strength: 0.1, agility: 0.1, balance: 0.1, naturalFitness: 0.05 },
    },
  },
  {
    name: "Wing-Back",
    primaryPositions: ["LWB", "RWB", "LM", "RM"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.2,
      finalThird: 0.2,
      finishing: 0.05,
      defensiveSolidity: 0.15,
      pressing: 0.1,
      aerial: 0.03,
      transitionAttack: 0.15,
      transitionDefense: 0.07,
    },
    attributeWeights: {
      technical: { crossing: 0.2, dribbling: 0.15, tackling: 0.1, marking: 0.1, passing: 0.15, technique: 0.1, firstTouch: 0.1, finishing: 0.05 },
      mental: { composure: 0.1, decisions: 0.15, positioning: 0.1, teamwork: 0.1, workRate: 0.15, flair: 0.1, anticipation: 0.05, aggression: 0.05, determination: 0.05 },
      physical: { pace: 0.2, acceleration: 0.15, stamina: 0.25, agility: 0.1, balance: 0.1, strength: 0.05, naturalFitness: 0.05 },
    },
  },
  {
    name: "Defensive Midfielder",
    primaryPositions: ["DM", "CM"],
    phaseWeights: {
      buildUp: 0.15,
      progression: 0.1,
      finalThird: 0.05,
      finishing: 0.03,
      defensiveSolidity: 0.35,
      pressing: 0.15,
      aerial: 0.07,
      transitionAttack: 0.05,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { tackling: 0.2, marking: 0.15, passing: 0.2, technique: 0.1, firstTouch: 0.1, heading: 0.1, dribbling: 0.05, longShots: 0.05 },
      mental: { anticipation: 0.15, bravery: 0.1, composure: 0.1, concentration: 0.15, decisions: 0.15, positioning: 0.15, workRate: 0.1, aggression: 0.05, determination: 0.05, teamwork: 0.1 },
      physical: { stamina: 0.25, strength: 0.2, pace: 0.1, acceleration: 0.1, balance: 0.1, jumpingReach: 0.1, agility: 0.05 },
    },
  },
  {
    name: "Central Midfielder",
    primaryPositions: ["CM"],
    phaseWeights: {
      buildUp: 0.15,
      progression: 0.15,
      finalThird: 0.1,
      finishing: 0.05,
      defensiveSolidity: 0.2,
      pressing: 0.15,
      aerial: 0.05,
      transitionAttack: 0.1,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { passing: 0.2, technique: 0.15, firstTouch: 0.15, dribbling: 0.1, tackling: 0.1, marking: 0.05, longShots: 0.1, finishing: 0.05 },
      mental: { composure: 0.1, concentration: 0.1, decisions: 0.15, positioning: 0.1, teamwork: 0.1, vision: 0.15, workRate: 0.1, anticipation: 0.05, determination: 0.05, flair: 0.05 },
      physical: { stamina: 0.2, pace: 0.1, acceleration: 0.1, strength: 0.1, agility: 0.1, balance: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "Box-to-Box Midfielder",
    primaryPositions: ["CM"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.15,
      finalThird: 0.15,
      finishing: 0.1,
      defensiveSolidity: 0.1,
      pressing: 0.2,
      aerial: 0.05,
      transitionAttack: 0.1,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { passing: 0.15, technique: 0.1, firstTouch: 0.1, dribbling: 0.1, tackling: 0.1, longShots: 0.15, finishing: 0.1, heading: 0.05 },
      mental: { composure: 0.1, decisions: 0.1, positioning: 0.1, teamwork: 0.1, vision: 0.1, workRate: 0.15, determination: 0.1, bravery: 0.1, anticipation: 0.05, aggression: 0.05 },
      physical: { stamina: 0.3, pace: 0.15, acceleration: 0.1, strength: 0.1, agility: 0.05, balance: 0.05, naturalFitness: 0.1 },
    },
  },
  {
    name: "Ball-Winning Midfielder",
    primaryPositions: ["CM", "DM"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.05,
      finalThird: 0.03,
      finishing: 0.02,
      defensiveSolidity: 0.3,
      pressing: 0.35,
      aerial: 0.1,
      transitionAttack: 0.05,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { tackling: 0.25, marking: 0.2, passing: 0.1, technique: 0.05, heading: 0.1, firstTouch: 0.05, dribbling: 0.05 },
      mental: { aggression: 0.15, bravery: 0.15, anticipation: 0.15, determination: 0.1, workRate: 0.15, positioning: 0.1, concentration: 0.1, teamwork: 0.1, decisions: 0.05 },
      physical: { stamina: 0.25, strength: 0.2, pace: 0.1, acceleration: 0.1, balance: 0.1, agility: 0.05, jumpingReach: 0.1 },
    },
  },
  {
    name: "Deep-Lying Playmaker",
    primaryPositions: ["CM", "DM"],
    phaseWeights: {
      buildUp: 0.25,
      progression: 0.2,
      finalThird: 0.1,
      finishing: 0.02,
      defensiveSolidity: 0.15,
      pressing: 0.08,
      aerial: 0.03,
      transitionAttack: 0.1,
      transitionDefense: 0.07,
    },
    attributeWeights: {
      technical: { passing: 0.3, technique: 0.15, firstTouch: 0.15, dribbling: 0.05, tackling: 0.05, longShots: 0.05, crossing: 0.05 },
      mental: { composure: 0.15, decisions: 0.15, vision: 0.2, anticipation: 0.1, concentration: 0.1, positioning: 0.05, flair: 0.1, determination: 0.05 },
      physical: { stamina: 0.15, pace: 0.05, acceleration: 0.05, strength: 0.1, agility: 0.1, balance: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "Roaming Playmaker",
    primaryPositions: ["CM"],
    phaseWeights: {
      buildUp: 0.15,
      progression: 0.2,
      finalThird: 0.2,
      finishing: 0.05,
      defensiveSolidity: 0.05,
      pressing: 0.1,
      aerial: 0.02,
      transitionAttack: 0.15,
      transitionDefense: 0.08,
    },
    attributeWeights: {
      technical: { passing: 0.2, technique: 0.15, firstTouch: 0.15, dribbling: 0.15, longShots: 0.05, finishing: 0.05 },
      mental: { composure: 0.15, decisions: 0.1, vision: 0.2, flair: 0.15, workRate: 0.1, anticipation: 0.05, determination: 0.05, teamwork: 0.05 },
      physical: { stamina: 0.2, pace: 0.1, acceleration: 0.1, agility: 0.1, balance: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "Advanced Playmaker",
    primaryPositions: ["AMC", "CM"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.2,
      finalThird: 0.25,
      finishing: 0.05,
      defensiveSolidity: 0.03,
      pressing: 0.07,
      aerial: 0.02,
      transitionAttack: 0.2,
      transitionDefense: 0.08,
    },
    attributeWeights: {
      technical: { passing: 0.2, technique: 0.15, firstTouch: 0.15, dribbling: 0.15, longShots: 0.1, finishing: 0.05 },
      mental: { composure: 0.1, decisions: 0.1, vision: 0.25, flair: 0.15, anticipation: 0.05, determination: 0.05, offTheBall: 0.1, teamwork: 0.05 },
      physical: { agility: 0.15, balance: 0.15, pace: 0.1, acceleration: 0.1, stamina: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "Winger",
    primaryPositions: ["AML", "AMR", "LM", "RM"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.15,
      finalThird: 0.2,
      finishing: 0.05,
      defensiveSolidity: 0.05,
      pressing: 0.1,
      aerial: 0.03,
      transitionAttack: 0.3,
      transitionDefense: 0.07,
    },
    attributeWeights: {
      technical: { crossing: 0.2, dribbling: 0.25, passing: 0.15, technique: 0.1, firstTouch: 0.1, finishing: 0.05, longShots: 0.05 },
      mental: { composure: 0.1, decisions: 0.1, flair: 0.15, teamwork: 0.05, workRate: 0.1, offTheBall: 0.1, vision: 0.1, determination: 0.05 },
      physical: { pace: 0.25, acceleration: 0.2, agility: 0.1, balance: 0.05, stamina: 0.15, naturalFitness: 0.05 },
    },
  },
  {
    name: "Inside Forward",
    primaryPositions: ["AML", "AMR", "ST"],
    phaseWeights: {
      buildUp: 0.03,
      progression: 0.1,
      finalThird: 0.2,
      finishing: 0.25,
      defensiveSolidity: 0.02,
      pressing: 0.08,
      aerial: 0.02,
      transitionAttack: 0.25,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { dribbling: 0.2, finishing: 0.25, firstTouch: 0.1, passing: 0.05, technique: 0.1, longShots: 0.1, crossing: 0.05 },
      mental: { composure: 0.15, decisions: 0.1, flair: 0.1, offTheBall: 0.15, determination: 0.05, anticipation: 0.05, vision: 0.05, workRate: 0.05 },
      physical: { pace: 0.2, acceleration: 0.2, agility: 0.1, balance: 0.05, stamina: 0.1, strength: 0.05 },
    },
  },
  {
    name: "Inside Winger",
    primaryPositions: ["AML", "AMR"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.15,
      finalThird: 0.2,
      finishing: 0.1,
      defensiveSolidity: 0.03,
      pressing: 0.1,
      aerial: 0.02,
      transitionAttack: 0.3,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { dribbling: 0.2, finishing: 0.15, firstTouch: 0.1, passing: 0.15, technique: 0.1, crossing: 0.1, longShots: 0.05 },
      mental: { composure: 0.1, decisions: 0.1, flair: 0.15, offTheBall: 0.1, vision: 0.1, teamwork: 0.05, workRate: 0.05, determination: 0.05 },
      physical: { pace: 0.2, acceleration: 0.2, agility: 0.15, balance: 0.05, stamina: 0.1, strength: 0.05 },
    },
  },
  {
    name: "Wide Playmaker",
    primaryPositions: ["AML", "AMR", "LM", "RM"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.2,
      finalThird: 0.2,
      finishing: 0.03,
      defensiveSolidity: 0.03,
      pressing: 0.07,
      aerial: 0.02,
      transitionAttack: 0.25,
      transitionDefense: 0.1,
    },
    attributeWeights: {
      technical: { crossing: 0.2, dribbling: 0.15, passing: 0.2, technique: 0.1, firstTouch: 0.1, finishing: 0.03, longShots: 0.05 },
      mental: { composure: 0.1, decisions: 0.1, vision: 0.2, flair: 0.1, teamwork: 0.1, workRate: 0.05, offTheBall: 0.05, determination: 0.05 },
      physical: { pace: 0.15, acceleration: 0.1, agility: 0.1, balance: 0.05, stamina: 0.2, naturalFitness: 0.1 },
    },
  },
  {
    name: "Advanced Forward",
    primaryPositions: ["ST"],
    phaseWeights: {
      buildUp: 0.03,
      progression: 0.05,
      finalThird: 0.15,
      finishing: 0.35,
      defensiveSolidity: 0.02,
      pressing: 0.1,
      aerial: 0.1,
      transitionAttack: 0.15,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { finishing: 0.3, dribbling: 0.1, firstTouch: 0.1, technique: 0.1, heading: 0.1, longShots: 0.05, passing: 0.05 },
      mental: { composure: 0.2, offTheBall: 0.15, anticipation: 0.1, decisions: 0.1, determination: 0.1, flair: 0.05, bravery: 0.05, workRate: 0.05 },
      physical: { pace: 0.15, acceleration: 0.15, strength: 0.1, jumpingReach: 0.1, agility: 0.05, balance: 0.1, stamina: 0.1 },
    },
  },
  {
    name: "Poacher",
    primaryPositions: ["ST"],
    phaseWeights: {
      buildUp: 0.02,
      progression: 0.03,
      finalThird: 0.15,
      finishing: 0.45,
      defensiveSolidity: 0.01,
      pressing: 0.05,
      aerial: 0.1,
      transitionAttack: 0.15,
      transitionDefense: 0.04,
    },
    attributeWeights: {
      technical: { finishing: 0.35, firstTouch: 0.15, heading: 0.15, technique: 0.1, dribbling: 0.05, longShots: 0.05, passing: 0.05 },
      mental: { composure: 0.2, offTheBall: 0.2, anticipation: 0.15, decisions: 0.1, determination: 0.1, bravery: 0.05, flair: 0.05 },
      physical: { pace: 0.1, acceleration: 0.15, agility: 0.1, balance: 0.1, strength: 0.1, jumpingReach: 0.15, stamina: 0.05 },
    },
  },
  {
    name: "Target Man",
    primaryPositions: ["ST"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.05,
      finalThird: 0.15,
      finishing: 0.2,
      defensiveSolidity: 0.02,
      pressing: 0.1,
      aerial: 0.25,
      transitionAttack: 0.08,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { heading: 0.25, finishing: 0.2, firstTouch: 0.15, passing: 0.1, technique: 0.1, dribbling: 0.05, longShots: 0.05 },
      mental: { bravery: 0.15, composure: 0.1, decisions: 0.1, determination: 0.15, offTheBall: 0.1, teamwork: 0.1, anticipation: 0.05, aggression: 0.05 },
      physical: { strength: 0.3, jumpingReach: 0.25, balance: 0.1, pace: 0.05, acceleration: 0.05, stamina: 0.1, agility: 0.05 },
    },
  },
  {
    name: "Deep-Lying Forward",
    primaryPositions: ["ST", "CF"],
    phaseWeights: {
      buildUp: 0.15,
      progression: 0.1,
      finalThird: 0.15,
      finishing: 0.2,
      defensiveSolidity: 0.02,
      pressing: 0.08,
      aerial: 0.05,
      transitionAttack: 0.15,
      transitionDefense: 0.1,
    },
    attributeWeights: {
      technical: { finishing: 0.15, passing: 0.2, firstTouch: 0.15, technique: 0.15, dribbling: 0.1, heading: 0.05, longShots: 0.1 },
      mental: { composure: 0.15, decisions: 0.15, vision: 0.1, offTheBall: 0.1, teamwork: 0.1, determination: 0.05, flair: 0.05, anticipation: 0.05 },
      physical: { pace: 0.1, acceleration: 0.1, strength: 0.1, stamina: 0.15, balance: 0.1, agility: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "Complete Forward",
    primaryPositions: ["ST", "CF"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.1,
      finalThird: 0.15,
      finishing: 0.25,
      defensiveSolidity: 0.02,
      pressing: 0.08,
      aerial: 0.1,
      transitionAttack: 0.15,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { finishing: 0.2, dribbling: 0.1, firstTouch: 0.1, technique: 0.1, heading: 0.1, passing: 0.1, longShots: 0.1, crossing: 0.05 },
      mental: { composure: 0.15, decisions: 0.1, offTheBall: 0.1, vision: 0.1, determination: 0.1, flair: 0.1, anticipation: 0.05, bravery: 0.05, teamwork: 0.05 },
      physical: { pace: 0.1, acceleration: 0.1, strength: 0.15, jumpingReach: 0.1, agility: 0.1, balance: 0.1, stamina: 0.15 },
    },
  },
  {
    name: "Shadow Striker",
    primaryPositions: ["AMC", "ST"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.1,
      finalThird: 0.2,
      finishing: 0.25,
      defensiveSolidity: 0.02,
      pressing: 0.1,
      aerial: 0.03,
      transitionAttack: 0.2,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { finishing: 0.25, dribbling: 0.15, firstTouch: 0.1, technique: 0.1, longShots: 0.15, passing: 0.1 },
      mental: { composure: 0.15, offTheBall: 0.15, anticipation: 0.1, decisions: 0.1, flair: 0.1, determination: 0.05, vision: 0.1, workRate: 0.05 },
      physical: { pace: 0.1, acceleration: 0.15, agility: 0.15, balance: 0.1, stamina: 0.1, strength: 0.05 },
    },
  },
  {
    name: "Trequartista",
    primaryPositions: ["AMC", "CF"],
    phaseWeights: {
      buildUp: 0.15,
      progression: 0.2,
      finalThird: 0.25,
      finishing: 0.05,
      defensiveSolidity: 0.01,
      pressing: 0.02,
      aerial: 0.02,
      transitionAttack: 0.25,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { dribbling: 0.2, passing: 0.2, technique: 0.15, firstTouch: 0.15, finishing: 0.05, longShots: 0.05 },
      mental: { composure: 0.1, decisions: 0.1, vision: 0.2, flair: 0.2, offTheBall: 0.1, anticipation: 0.05, determination: 0.05 },
      physical: { agility: 0.15, balance: 0.15, pace: 0.1, acceleration: 0.1, stamina: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "False Nine",
    primaryPositions: ["ST", "CF"],
    phaseWeights: {
      buildUp: 0.2,
      progression: 0.15,
      finalThird: 0.2,
      finishing: 0.1,
      defensiveSolidity: 0.02,
      pressing: 0.1,
      aerial: 0.03,
      transitionAttack: 0.15,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { passing: 0.2, dribbling: 0.15, firstTouch: 0.15, technique: 0.15, finishing: 0.1, longShots: 0.05 },
      mental: { composure: 0.1, decisions: 0.1, vision: 0.2, flair: 0.1, offTheBall: 0.1, teamwork: 0.1, anticipation: 0.05, determination: 0.05 },
      physical: { agility: 0.15, balance: 0.15, pace: 0.1, acceleration: 0.1, stamina: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "Pressing Forward",
    primaryPositions: ["ST"],
    phaseWeights: {
      buildUp: 0.03,
      progression: 0.05,
      finalThird: 0.1,
      finishing: 0.2,
      defensiveSolidity: 0.02,
      pressing: 0.35,
      aerial: 0.05,
      transitionAttack: 0.15,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { finishing: 0.15, dribbling: 0.05, firstTouch: 0.05, technique: 0.05, heading: 0.05, passing: 0.1 },
      mental: { workRate: 0.2, aggression: 0.15, bravery: 0.1, determination: 0.15, anticipation: 0.1, offTheBall: 0.1, composure: 0.05, decisions: 0.05, teamwork: 0.05 },
      physical: { stamina: 0.3, pace: 0.15, acceleration: 0.15, strength: 0.1, agility: 0.05, balance: 0.05 },
    },
  },
  {
    name: "Channel Forward",
    primaryPositions: ["ST"],
    phaseWeights: {
      buildUp: 0.03,
      progression: 0.05,
      finalThird: 0.15,
      finishing: 0.25,
      defensiveSolidity: 0.02,
      pressing: 0.1,
      aerial: 0.05,
      transitionAttack: 0.3,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { finishing: 0.2, dribbling: 0.15, firstTouch: 0.1, technique: 0.1, heading: 0.05, longShots: 0.05 },
      mental: { composure: 0.15, offTheBall: 0.15, anticipation: 0.15, decisions: 0.1, determination: 0.05, flair: 0.05, workRate: 0.05 },
      physical: { pace: 0.2, acceleration: 0.2, strength: 0.1, agility: 0.1, balance: 0.05, stamina: 0.1 },
    },
  },
  {
    name: "Wide Forward",
    primaryPositions: ["AML", "AMR"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.15,
      finalThird: 0.2,
      finishing: 0.2,
      defensiveSolidity: 0.02,
      pressing: 0.08,
      aerial: 0.03,
      transitionAttack: 0.25,
      transitionDefense: 0.02,
    },
    attributeWeights: {
      technical: { dribbling: 0.2, finishing: 0.2, firstTouch: 0.1, passing: 0.1, technique: 0.1, crossing: 0.1, longShots: 0.05 },
      mental: { composure: 0.15, offTheBall: 0.15, decisions: 0.1, flair: 0.1, anticipation: 0.05, determination: 0.05, vision: 0.05, workRate: 0.05 },
      physical: { pace: 0.2, acceleration: 0.2, agility: 0.1, balance: 0.05, stamina: 0.1 },
    },
  },
  {
    name: "Racing Winger",
    primaryPositions: ["AML", "AMR", "LM", "RM"],
    phaseWeights: {
      buildUp: 0.03,
      progression: 0.1,
      finalThird: 0.15,
      finishing: 0.05,
      defensiveSolidity: 0.03,
      pressing: 0.12,
      aerial: 0.02,
      transitionAttack: 0.4,
      transitionDefense: 0.1,
    },
    attributeWeights: {
      technical: { crossing: 0.2, dribbling: 0.2, passing: 0.1, technique: 0.05, firstTouch: 0.1, finishing: 0.05 },
      mental: { workRate: 0.15, teamwork: 0.1, determination: 0.1, offTheBall: 0.1, decisions: 0.05, flair: 0.1, composure: 0.05 },
      physical: { pace: 0.3, acceleration: 0.25, stamina: 0.2, agility: 0.05, naturalFitness: 0.05 },
    },
  },
  {
    name: "Half-Back",
    primaryPositions: ["DM", "CB"],
    phaseWeights: {
      buildUp: 0.15,
      progression: 0.05,
      finalThird: 0.02,
      finishing: 0.01,
      defensiveSolidity: 0.4,
      pressing: 0.1,
      aerial: 0.15,
      transitionAttack: 0.02,
      transitionDefense: 0.1,
    },
    attributeWeights: {
      technical: { tackling: 0.2, marking: 0.2, passing: 0.15, technique: 0.1, heading: 0.15, firstTouch: 0.05 },
      mental: { anticipation: 0.15, composure: 0.15, concentration: 0.15, decisions: 0.15, positioning: 0.2, teamwork: 0.05, determination: 0.05 },
      physical: { strength: 0.2, jumpingReach: 0.15, stamina: 0.15, pace: 0.1, acceleration: 0.1, balance: 0.15, agility: 0.05 },
    },
  },
  {
    name: "Anchor Man",
    primaryPositions: ["DM"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.05,
      finalThird: 0.02,
      finishing: 0.01,
      defensiveSolidity: 0.45,
      pressing: 0.12,
      aerial: 0.15,
      transitionAttack: 0.02,
      transitionDefense: 0.08,
    },
    attributeWeights: {
      technical: { tackling: 0.25, marking: 0.2, passing: 0.15, heading: 0.1, technique: 0.05, firstTouch: 0.05 },
      mental: { anticipation: 0.15, composure: 0.1, concentration: 0.15, decisions: 0.15, positioning: 0.2, teamwork: 0.1, determination: 0.05, aggression: 0.05 },
      physical: { strength: 0.25, stamina: 0.2, jumpingReach: 0.15, balance: 0.1, pace: 0.1, acceleration: 0.05 },
    },
  },
  {
    name: "Regista",
    primaryPositions: ["DM", "CM"],
    phaseWeights: {
      buildUp: 0.25,
      progression: 0.2,
      finalThird: 0.15,
      finishing: 0.02,
      defensiveSolidity: 0.1,
      pressing: 0.08,
      aerial: 0.03,
      transitionAttack: 0.12,
      transitionDefense: 0.05,
    },
    attributeWeights: {
      technical: { passing: 0.3, technique: 0.15, firstTouch: 0.15, dribbling: 0.1, longShots: 0.05, tackling: 0.05 },
      mental: { composure: 0.15, decisions: 0.15, vision: 0.25, flair: 0.1, anticipation: 0.05, concentration: 0.05, determination: 0.05 },
      physical: { stamina: 0.15, agility: 0.1, balance: 0.1, pace: 0.05, acceleration: 0.05, naturalFitness: 0.1 },
    },
  },
  {
    name: "Mezzala",
    primaryPositions: ["CM"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.2,
      finalThird: 0.2,
      finishing: 0.1,
      defensiveSolidity: 0.05,
      pressing: 0.1,
      aerial: 0.03,
      transitionAttack: 0.15,
      transitionDefense: 0.07,
    },
    attributeWeights: {
      technical: { dribbling: 0.15, passing: 0.2, technique: 0.15, firstTouch: 0.1, longShots: 0.15, finishing: 0.05, crossing: 0.05 },
      mental: { composure: 0.1, decisions: 0.1, vision: 0.15, flair: 0.15, offTheBall: 0.1, workRate: 0.1, anticipation: 0.05, determination: 0.05 },
      physical: { stamina: 0.2, pace: 0.1, acceleration: 0.1, agility: 0.1, balance: 0.05, naturalFitness: 0.1 },
    },
  },
  {
    name: "Enganche",
    primaryPositions: ["AMC"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.15,
      finalThird: 0.25,
      finishing: 0.1,
      defensiveSolidity: 0.02,
      pressing: 0.03,
      aerial: 0.02,
      transitionAttack: 0.25,
      transitionDefense: 0.08,
    },
    attributeWeights: {
      technical: { passing: 0.25, technique: 0.2, firstTouch: 0.15, dribbling: 0.1, finishing: 0.05, longShots: 0.1 },
      mental: { composure: 0.15, decisions: 0.1, vision: 0.25, flair: 0.1, offTheBall: 0.1, determination: 0.05, teamwork: 0.05 },
      physical: { agility: 0.15, balance: 0.15, pace: 0.05, acceleration: 0.05, stamina: 0.15, naturalFitness: 0.1 },
    },
  },
  {
    name: "Wide Midfielder",
    primaryPositions: ["LM", "RM"],
    phaseWeights: {
      buildUp: 0.1,
      progression: 0.15,
      finalThird: 0.15,
      finishing: 0.05,
      defensiveSolidity: 0.15,
      pressing: 0.1,
      aerial: 0.03,
      transitionAttack: 0.15,
      transitionDefense: 0.12,
    },
    attributeWeights: {
      technical: { crossing: 0.2, dribbling: 0.1, passing: 0.15, tackling: 0.1, marking: 0.1, technique: 0.1, firstTouch: 0.1, finishing: 0.05 },
      mental: { teamwork: 0.15, workRate: 0.15, composure: 0.1, decisions: 0.1, positioning: 0.1, determination: 0.05, anticipation: 0.05, concentration: 0.05, flair: 0.05 },
      physical: { stamina: 0.25, pace: 0.15, acceleration: 0.1, strength: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "Complete Wing-Back",
    primaryPositions: ["LWB", "RWB"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.2,
      finalThird: 0.2,
      finishing: 0.05,
      defensiveSolidity: 0.1,
      pressing: 0.1,
      aerial: 0.03,
      transitionAttack: 0.2,
      transitionDefense: 0.07,
    },
    attributeWeights: {
      technical: { crossing: 0.2, dribbling: 0.15, passing: 0.15, technique: 0.1, firstTouch: 0.1, tackling: 0.1, finishing: 0.05, longShots: 0.05 },
      mental: { composure: 0.1, decisions: 0.15, flair: 0.1, teamwork: 0.1, workRate: 0.1, offTheBall: 0.1, anticipation: 0.05, determination: 0.05, vision: 0.05 },
      physical: { pace: 0.2, acceleration: 0.15, stamina: 0.25, agility: 0.1, balance: 0.1, strength: 0.05 },
    },
  },
  {
    name: "Inverted Full-Back",
    primaryPositions: ["LB", "RB"],
    phaseWeights: {
      buildUp: 0.2,
      progression: 0.15,
      finalThird: 0.05,
      finishing: 0.02,
      defensiveSolidity: 0.25,
      pressing: 0.1,
      aerial: 0.03,
      transitionAttack: 0.08,
      transitionDefense: 0.12,
    },
    attributeWeights: {
      technical: { passing: 0.2, dribbling: 0.15, tackling: 0.15, marking: 0.1, firstTouch: 0.15, technique: 0.1, crossing: 0.05 },
      mental: { composure: 0.15, decisions: 0.15, positioning: 0.15, anticipation: 0.1, concentration: 0.1, teamwork: 0.1, vision: 0.1, workRate: 0.05 },
      physical: { stamina: 0.2, pace: 0.1, acceleration: 0.1, strength: 0.1, balance: 0.1, agility: 0.1, naturalFitness: 0.1 },
    },
  },
  {
    name: "No-Nonsense Centre-Back",
    primaryPositions: ["CB"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.03,
      finalThird: 0.02,
      finishing: 0.01,
      defensiveSolidity: 0.5,
      pressing: 0.08,
      aerial: 0.2,
      transitionAttack: 0.01,
      transitionDefense: 0.1,
    },
    attributeWeights: {
      technical: { heading: 0.2, marking: 0.25, tackling: 0.25, passing: 0.1, technique: 0.05, firstTouch: 0.05 },
      mental: { aggression: 0.1, bravery: 0.15, anticipation: 0.15, concentration: 0.15, decisions: 0.1, positioning: 0.2, determination: 0.1, teamwork: 0.05 },
      physical: { strength: 0.25, jumpingReach: 0.2, pace: 0.1, acceleration: 0.05, stamina: 0.1, balance: 0.15, agility: 0.05 },
    },
  },
  {
    name: "Wide Centre-Back",
    primaryPositions: ["CB", "LB", "RB"],
    phaseWeights: {
      buildUp: 0.15,
      progression: 0.1,
      finalThird: 0.05,
      finishing: 0.02,
      defensiveSolidity: 0.35,
      pressing: 0.08,
      aerial: 0.1,
      transitionAttack: 0.05,
      transitionDefense: 0.1,
    },
    attributeWeights: {
      technical: { heading: 0.1, marking: 0.15, tackling: 0.15, passing: 0.2, technique: 0.1, firstTouch: 0.1, dribbling: 0.1, crossing: 0.05 },
      mental: { anticipation: 0.1, composure: 0.1, concentration: 0.1, decisions: 0.15, positioning: 0.15, teamwork: 0.1, workRate: 0.1, determination: 0.05, bravery: 0.05 },
      physical: { pace: 0.15, acceleration: 0.1, stamina: 0.15, strength: 0.15, agility: 0.1, balance: 0.1, jumpingReach: 0.1 },
    },
  },
  {
    name: "No-Nonsense Full-Back",
    primaryPositions: ["LB", "RB"],
    phaseWeights: {
      buildUp: 0.05,
      progression: 0.05,
      finalThird: 0.05,
      finishing: 0.01,
      defensiveSolidity: 0.4,
      pressing: 0.1,
      aerial: 0.1,
      transitionAttack: 0.04,
      transitionDefense: 0.2,
    },
    attributeWeights: {
      technical: { tackling: 0.25, marking: 0.2, heading: 0.1, passing: 0.1, technique: 0.05, firstTouch: 0.05, crossing: 0.05 },
      mental: { aggression: 0.1, bravery: 0.15, anticipation: 0.15, concentration: 0.15, decisions: 0.1, positioning: 0.2, determination: 0.1, teamwork: 0.05 },
      physical: { strength: 0.2, pace: 0.15, stamina: 0.2, acceleration: 0.1, balance: 0.1, jumpingReach: 0.1 },
    },
  },
];

export function getRoleDefinition(role: Role): RoleDefinition {
  const def = roleDefinitions.find(r => r.name === role);
  if (!def) {
    throw new Error(`Unknown role: ${role}`);
  }
  return def;
}

export function getAllRoleDefinitions(): RoleDefinition[] {
  return roleDefinitions;
}

export function getRolesForPosition(pos: Position): Role[] {
  return roleDefinitions
    .filter(r => r.primaryPositions.includes(pos))
    .map(r => r.name);
}

export function findBestRoleForPlayer(
  playerPositions: Position[],
  roleSuitability: Partial<Record<Role, number>>,
): { role: Role; suitability: number } {
  let bestRole: Role = "Central Midfielder";
  let bestScore = 0;

  for (const pos of playerPositions) {
    const roles = getRolesForPosition(pos);
    for (const role of roles) {
      const suitability = roleSuitability[role] ?? 50;
      if (suitability > bestScore) {
        bestScore = suitability;
        bestRole = role;
      }
    }
  }

  return { role: bestRole, suitability: bestScore };
}
