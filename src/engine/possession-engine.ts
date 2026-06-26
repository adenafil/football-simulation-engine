import type { PhaseScores } from "./ratings";
import type { Tactic } from "../domain/tactic";
import type { Manager } from "../domain/manager";

export interface PossessionOutcome {
  description: string;
  shot: boolean;
  shotOnTarget: boolean;
  goal: boolean;
  xG: number;
  corner: boolean;
  foul: boolean;
  yellowCard: boolean;
  redCard: boolean;
  offside: boolean;
  attackingPhase: string;
}

export interface PossessionInput {
  phaseScores: { home: PhaseScores; away: PhaseScores };
  tactics: { home: Tactic; away: Tactic };
  managers: { home: Manager; away: Manager };
  isHomeAttacking: boolean;
  minute: number;
  homeStamina: number;
  awayStamina: number;
}

function random(): number {
  return Math.random();
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function chance(attack: number, defense: number, attackMul: number, defMul: number, constant: number): number {
  const a = attack * attackMul;
  const d = defense * defMul;
  return clamp(a / (a + d + constant));
}

export function simulatePossession(input: PossessionInput): PossessionOutcome {
  const { phaseScores, isHomeAttacking, minute, homeStamina, awayStamina } = input;

  const attacker = isHomeAttacking ? phaseScores.home : phaseScores.away;
  const defender = isHomeAttacking ? phaseScores.away : phaseScores.home;

  const staminaPenalty = isHomeAttacking
    ? 1 - (100 - homeStamina) / 400
    : 1 - (100 - awayStamina) / 400;

  const fatigueMod = Math.max(0.7, Math.min(1, staminaPenalty));

  const buildUpScore = attacker.buildUp * fatigueMod;
  const defBuildUpResist = defender.defensiveSolidity * 0.4 + defender.pressing * 0.3;
  const progressionScore = attacker.progression * fatigueMod;
  const finalThirdScore = attacker.finalThird * fatigueMod;
  const finishingScore = attacker.finishing * fatigueMod;
  const defBlock = defender.defensiveSolidity * 0.35 + defender.transitionDefense * 0.25;
  const gkFactor = defender.defensiveSolidity * 0.2;

  let outcome: PossessionOutcome = {
    description: "",
    shot: false,
    shotOnTarget: false,
    goal: false,
    xG: 0,
    corner: false,
    foul: false,
    yellowCard: false,
    redCard: false,
    offside: false,
    attackingPhase: "none",
  };

  const buildUpChance = chance(buildUpScore, defBuildUpResist, 1.5, 0.5, 3);
  if (random() > buildUpChance) {
    outcome.description = isHomeAttacking
      ? "home build-up broken by defensive pressure"
      : "away build-up broken by defensive pressure";
    outcome.attackingPhase = "buildUp";
    return outcome;
  }

  outcome.attackingPhase = "buildUp";

  const progressionChance = chance(progressionScore, defBlock, 1.5, 0.4, 4);
  if (random() > progressionChance) {
    outcome.description = isHomeAttacking
      ? "home progression stopped in midfield"
      : "away progression stopped in midfield";
    outcome.attackingPhase = "progression";
    outcome.foul = random() < 0.15;
    if (outcome.foul) {
      outcome.yellowCard = random() < 0.2;
    }
    return outcome;
  }

  outcome.attackingPhase = "progression";

  const finalThirdChance = chance(finalThirdScore, defBlock, 1.5, 0.4, 4);
  if (random() > finalThirdChance) {
    outcome.attackingPhase = "finalThird";
    outcome.corner = random() < 0.25;
    outcome.foul = random() < 0.1;
    outcome.description = isHomeAttacking
      ? "home attack blocked in final third"
      : "away attack blocked in final third";
    if (outcome.corner) {
      outcome.description += " - corner won";
    }
    return outcome;
  }

  outcome.attackingPhase = "finalThird";

  const shotChance = chance(finishingScore, gkFactor, 1.5, 0.4, 5);
  if (random() > shotChance) {
    outcome.offside = random() < 0.12;
    outcome.attackingPhase = "finalThird";
    outcome.corner = random() < 0.15;

    if (outcome.offside) {
      outcome.description = isHomeAttacking
        ? "home caught offside"
        : "away caught offside";
    } else if (outcome.corner) {
      outcome.description = isHomeAttacking
        ? "home shot blocked - corner"
        : "away shot blocked - corner";
    } else {
      outcome.description = isHomeAttacking
        ? "home shot blocked"
        : "away shot blocked";
    }
    return outcome;
  }

  outcome.shot = true;
  const shotQuality = clamp(finishingScore * 0.8 / (finishingScore * 0.8 + gkFactor * 0.5 + 8));

  const onTargetChance = clamp((30 + finishingScore * 0.3) / 100);
  outcome.shotOnTarget = random() < onTargetChance;

  outcome.xG = clamp(shotQuality * 0.12);

  if (random() < outcome.xG) {
    outcome.goal = true;
    outcome.description = isHomeAttacking
      ? "GOAL! Home scores!"
      : "GOAL! Away scores!";
    outcome.attackingPhase = "goal";
  } else if (outcome.shotOnTarget) {
    outcome.description = isHomeAttacking
      ? "home shot saved by goalkeeper"
      : "away shot saved by goalkeeper";
    outcome.attackingPhase = "shot";
  } else {
    outcome.description = isHomeAttacking
      ? "home shot goes wide"
      : "away shot goes wide";
    outcome.attackingPhase = "shot";
  }

  return outcome;
}

export function getPossessionShare(
  homePhaseScores: PhaseScores,
  awayPhaseScores: PhaseScores,
  homeAdvantage: number = 0.05,
): number {
  const homeMidfield = homePhaseScores.buildUp + homePhaseScores.progression + homePhaseScores.pressing;
  const awayMidfield = awayPhaseScores.buildUp + awayPhaseScores.progression + awayPhaseScores.pressing;

  const homeShare = clamp((homeMidfield + 3 + homeAdvantage * 10) / (homeMidfield + awayMidfield + 6));
  return homeShare;
}
