import { test, expect } from "bun:test";
import { computeMatchPlayerRating, computePlayerRating, computeGoalkeepingScore, computeTeamPhaseScores } from "./ratings";
import { getRoleDefinition } from "./role-weights";
import { mbappe, courtois, viniJr, bellingham } from "../data/players";
import type { Tactic, Formation } from "../domain/tactic";
import type { PlayerMatchStats } from "../domain/match-context";

test("Mbappe has high technical score", () => {
  const rating = computePlayerRating(mbappe);
  expect(rating.technical).toBeGreaterThan(70);
  expect(rating.overall).toBeGreaterThan(70);
});

test("Courtois has high goalkeeping score", () => {
  const gkScore = computeGoalkeepingScore(courtois);
  expect(gkScore).toBeGreaterThan(75);
});

test("Bellingham has balanced attributes", () => {
  const rating = computePlayerRating(bellingham);
  expect(rating.technical).toBeGreaterThan(70);
  expect(rating.mental).toBeGreaterThan(70);
  expect(rating.physical).toBeGreaterThan(70);
});

test("Vini Jr has high physical score (pace/acceleration)", () => {
  const rating = computePlayerRating(viniJr);
  expect(rating.physical).toBeGreaterThan(75);
});

test("Courtois goalkeeping higher than outfield", () => {
  const gkVal = computeGoalkeepingScore(courtois);
  const mbappeGk = computeGoalkeepingScore(mbappe);
  expect(gkVal).toBeGreaterThan(mbappeGk);
});

test("Team phase scores produce reasonable values", () => {
  const tactic: Tactic = {
    formation: "4-3-3" as Formation,
    mentality: "positive",
    tempo: "normal",
    width: "normal",
    pressing: "high",
    defensiveLine: "normal",
    directness: "mixed",
    counterAttack: true,
    counterPress: false,
    timeWasting: false,
    creativeFreedom: 50,
    useOffsideTrap: false,
    focusPlay: "mixed",
    defensiveShape: "standard",
  };

  const players = [mbappe, viniJr, bellingham];
  const playersWithRoles = players.map(p => {
    const role = p.positions.includes("ST") ? getRoleDefinition("Advanced Forward")
      : p.positions.includes("AML") ? getRoleDefinition("Inside Forward")
      : getRoleDefinition("Advanced Playmaker");
    return { player: p, role };
  });

  const scores = computeTeamPhaseScores(playersWithRoles, tactic, 95, 85);
  expect(scores.buildUp).toBeGreaterThan(0);
  expect(scores.progression).toBeGreaterThan(0);
  expect(scores.finalThird).toBeGreaterThan(0);
  expect(scores.finishing).toBeGreaterThan(0);
});

test("match player rating rewards goals and assists", () => {
  const eliteForwardStats: PlayerMatchStats = {
    playerId: mbappe.id,
    name: mbappe.name,
    team: "home",
    minutesPlayed: 90,
    goals: 2,
    assists: 1,
    shots: 5,
    shotsOnTarget: 3,
    keyPasses: 2,
    passesCompleted: 24,
    tackles: 0,
    interceptions: 0,
    foulsCommitted: 0,
    yellowCards: 0,
    redCards: 0,
  };

  const quietForwardStats: PlayerMatchStats = {
    ...eliteForwardStats,
    goals: 0,
    assists: 0,
    shots: 1,
    shotsOnTarget: 0,
    keyPasses: 0,
  };

  const eliteRating = computeMatchPlayerRating(mbappe, eliteForwardStats, true, false);
  const quietRating = computeMatchPlayerRating(mbappe, quietForwardStats, true, false);
  expect(eliteRating).toBeGreaterThan(quietRating);
});
