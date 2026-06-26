import type { Player, TechnicalAttributes, MentalAttributes, PhysicalAttributes, GoalkeepingAttributes } from "../domain/player";
import type { PlayerMatchStats } from "../domain/match-context";
import type { Tactic } from "../domain/tactic";
import type { RoleDefinition, PhaseWeights } from "./role-weights";
import { getRoleDefinition } from "./role-weights";
import { getTacticModifiers } from "./tactic-modifiers";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min = 0, max = 99): number {
  return Math.max(min, Math.min(max, value));
}

function weightedAverage(
  attrs: Record<string, number>,
  weights: Record<string, number>,
): number {
  let sum = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const val = attrs[key];
    if (val !== undefined) {
      sum += val * weight;
      weightSum += weight;
    }
  }
  return weightSum > 0 ? sum / weightSum : 50;
}

export function computeTechnicalScore(player: Player): number {
  const attrs = player.attributes.technical as Record<string, number>;
  const weights: Record<string, number> = {
    crossing: 0.1,
    dribbling: 0.15,
    finishing: 0.1,
    firstTouch: 0.15,
    heading: 0.05,
    longShots: 0.05,
    marking: 0.05,
    passing: 0.2,
    tackling: 0.05,
    technique: 0.1,
  };
  if (player.positions.includes("GK")) {
    weights.passing = 0.2;
    weights.technique = 0.2;
    weights.dribbling = 0.1;
    weights.firstTouch = 0.2;
    weights.finishing = 0.05;
    weights.heading = 0.05;
    weights.marking = 0.05;
    weights.tackling = 0.05;
    weights.crossing = 0.05;
    weights.longShots = 0.05;
  }
  return weightedAverage(attrs, weights);
}

export function computeMentalScore(player: Player): number {
  const attrs = player.attributes.mental as Record<string, number>;
  const weights: Record<string, number> = {
    aggression: 0.05,
    anticipation: 0.1,
    bravery: 0.05,
    composure: 0.1,
    concentration: 0.1,
    decisions: 0.1,
    determination: 0.05,
    flair: 0.05,
    leadership: 0.05,
    offTheBall: 0.05,
    positioning: 0.1,
    teamwork: 0.05,
    vision: 0.1,
    workRate: 0.05,
  };
  return weightedAverage(attrs, weights);
}

export function computePhysicalScore(player: Player): number {
  const attrs = player.attributes.physical as Record<string, number>;
  const weights: Record<string, number> = {
    acceleration: 0.15,
    agility: 0.1,
    balance: 0.1,
    jumpingReach: 0.1,
    naturalFitness: 0.1,
    pace: 0.15,
    stamina: 0.15,
    strength: 0.15,
  };
  return weightedAverage(attrs, weights);
}

export function computeGoalkeepingScore(player: Player): number {
  if (!player.attributes.goalkeeping) return 0;
  const attrs = player.attributes.goalkeeping as Record<string, number>;
  const weights: Record<string, number> = {
    aerialReach: 0.1,
    commandOfArea: 0.1,
    communication: 0.05,
    eccentricity: 0.02,
    firstTouch: 0.05,
    handling: 0.15,
    kicking: 0.05,
    oneOnOnes: 0.15,
    passing: 0.05,
    punching: 0.03,
    reflexes: 0.15,
    rushingOut: 0.05,
    throwing: 0.05,
  };
  return weightedAverage(attrs, weights);
}

export interface PhaseScores {
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

export interface PlayerRatingComponents {
  technical: number;
  mental: number;
  physical: number;
  goalkeeping: number;
  overall: number;
}

export function computePlayerRating(player: Player): PlayerRatingComponents {
  const technical = computeTechnicalScore(player);
  const mental = computeMentalScore(player);
  const physical = computePhysicalScore(player);
  const goalkeeping = computeGoalkeepingScore(player);

  let overall: number;
  if (player.positions.includes("GK")) {
    overall = technical * 0.15 + mental * 0.3 + physical * 0.2 + goalkeeping * 0.35;
  } else {
    overall = technical * 0.35 + mental * 0.35 + physical * 0.3;
  }

  return { technical, mental, physical, goalkeeping, overall };
}

export function computePlayerPhaseScores(
  player: Player,
  roleDef: RoleDefinition,
  condition: number = 100,
  morale: number = 100,
): PhaseScores {
  const tech = player.attributes.technical;
  const mental = player.attributes.mental;
  const phys = player.attributes.physical;

  const techAttrs: Record<string, number> = tech as Record<string, number>;
  const mentalAttrs: Record<string, number> = mental as Record<string, number>;
  const physAttrs: Record<string, number> = phys as Record<string, number>;

  const attrWeights = roleDef.attributeWeights;

  const techScore = weightedAverage(techAttrs, attrWeights.technical as Record<string, number>);
  const mentalScore = weightedAverage(mentalAttrs, attrWeights.mental as Record<string, number>);
  const physScore = weightedAverage(physAttrs, attrWeights.physical as Record<string, number>);

  const baseScore = techScore * 0.4 + mentalScore * 0.35 + physScore * 0.25;

  const conditionPenalty = Math.max(0, 1 - (100 - condition) / 200);
  const moraleBoost = 1 + (morale - 50) / 200;

  const phaseWeights = roleDef.phaseWeights;

  const phases: PhaseScores = {
    buildUp: baseScore * phaseWeights.buildUp * 5 * conditionPenalty * moraleBoost,
    progression: baseScore * phaseWeights.progression * 5 * conditionPenalty * moraleBoost,
    finalThird: baseScore * phaseWeights.finalThird * 5 * conditionPenalty * moraleBoost,
    finishing: baseScore * phaseWeights.finishing * 5 * conditionPenalty * moraleBoost,
    defensiveSolidity: baseScore * phaseWeights.defensiveSolidity * 5 * conditionPenalty * moraleBoost,
    pressing: baseScore * phaseWeights.pressing * 5 * conditionPenalty * moraleBoost,
    aerial: baseScore * phaseWeights.aerial * 5 * conditionPenalty * moraleBoost,
    transitionAttack: baseScore * phaseWeights.transitionAttack * 5 * conditionPenalty * moraleBoost,
    transitionDefense: baseScore * phaseWeights.transitionDefense * 5 * conditionPenalty * moraleBoost,
  };

  return phases;
}

export function computeTeamPhaseScores(
  players: { player: Player; role: RoleDefinition }[],
  tactic: Tactic,
  averageCondition: number = 90,
  averageMorale: number = 80,
): PhaseScores {
  const tacticMods = getTacticModifiers(tactic);

  const total: PhaseScores = {
    buildUp: 0,
    progression: 0,
    finalThird: 0,
    finishing: 0,
    defensiveSolidity: 0,
    pressing: 0,
    aerial: 0,
    transitionAttack: 0,
    transitionDefense: 0,
  };

  for (const { player, role } of players) {
    const p = computePlayerPhaseScores(player, role, averageCondition, averageMorale);
    for (const key of Object.keys(total) as (keyof PhaseScores)[]) {
      total[key] += p[key];
    }
  }

  const avgFactor = 11 / players.length;

  for (const key of Object.keys(total) as (keyof PhaseScores)[]) {
    total[key] = (total[key] / 11) * avgFactor;
    const mod = tacticMods[key] ?? 0;
    total[key] = total[key] * (1 + mod);
  }

  return total;
}

export function computeGoalkeeperPhaseScores(player: Player): PhaseScores {
  const gkScore = computeGoalkeepingScore(player);
  const mental = player.attributes.mental;
  const phys = player.attributes.physical;

  const mentalScore = (mental.composure + mental.concentration + mental.decisions + mental.positioning + mental.anticipation) / 5;
  const physScore = (phys.agility + phys.balance + phys.jumpingReach + phys.strength) / 4;

  const base = gkScore * 0.5 + mentalScore * 0.3 + physScore * 0.2;

  return {
    buildUp: base * 0.1,
    progression: base * 0.05,
    finalThird: 0,
    finishing: 0,
    defensiveSolidity: base * 0.35,
    pressing: 0,
    aerial: base * 0.25,
    transitionAttack: 0,
    transitionDefense: base * 0.05,
  };
}

export interface TeamStrength {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeping: number;
  pressing: number;
  aerial: number;
  transition: number;
  overall: number;
}

export function computeTeamStrength(
  outfieldPlayers: { player: Player; role: RoleDefinition }[],
  goalkeeper: { player: Player; role: RoleDefinition },
  tactic: Tactic,
): TeamStrength {
  const phaseScores = computeTeamPhaseScores(outfieldPlayers, tactic);
  const gkPhases = computeGoalkeeperPhaseScores(goalkeeper.player);

  return {
    attack: phaseScores.finalThird + phaseScores.finishing + phaseScores.transitionAttack,
    midfield: phaseScores.buildUp + phaseScores.progression + phaseScores.pressing,
    defense: phaseScores.defensiveSolidity + phaseScores.transitionDefense + gkPhases.defensiveSolidity,
    goalkeeping: gkPhases.defensiveSolidity + gkPhases.aerial,
    pressing: phaseScores.pressing,
    aerial: phaseScores.aerial + gkPhases.aerial,
    transition: phaseScores.transitionAttack + phaseScores.transitionDefense,
    overall: 0,
  };
}

export function computeMatchPlayerRating(
  player: Player,
  matchStats: PlayerMatchStats,
  didWin: boolean,
  keptCleanSheet: boolean,
): number {
  const isGoalkeeper = player.positions.includes("GK");
  const isDefensivePlayer = isGoalkeeper || player.positions.some(position => ["CB", "LB", "RB", "LWB", "RWB", "DM"].includes(position));

  let rating = 6.0;
  rating += Math.min(0.7, (matchStats.minutesPlayed / 90) * 0.6);
  rating += matchStats.goals * 1.1;
  rating += matchStats.assists * 0.8;
  rating += matchStats.shotsOnTarget * 0.15;
  rating += matchStats.keyPasses * 0.12;
  rating += Math.min(0.6, matchStats.passesCompleted / 80);

  if (isDefensivePlayer) {
    rating += matchStats.tackles * 0.08;
    rating += matchStats.interceptions * 0.1;
    if (keptCleanSheet) rating += 0.45;
  } else {
    rating += matchStats.tackles * 0.03;
    rating += matchStats.interceptions * 0.04;
  }

  if (didWin) rating += 0.15;
  rating -= matchStats.yellowCards * 0.25;
  rating -= matchStats.redCards * 1.0;

  if (matchStats.shots >= 3 && matchStats.goals === 0) {
    rating -= 0.15;
  }

  return clamp(rating, 4.5, 10);
}
