import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { advanceKnockoutRound, createKnockoutBracket, simulateKnockoutRound, simulateKnockoutTie } from "./knockout-state";
import { competitionRulePresets } from "./competition-rules";

const teams = [
  {
    club: realMadrid,
    manager: carloAncelotti,
    players: getPlayersByClub("real-madrid"),
    formation: "4-3-3" as const,
    mentality: "positive" as const,
  },
  {
    club: manchesterUnited,
    manager: erikTenHag,
    players: getPlayersByClub("man-utd"),
    formation: "4-2-3-1" as const,
    mentality: "balanced" as const,
  },
];

test("simulateKnockoutTie resolves a one-leg tie with a winner", () => {
  const result = simulateKnockoutTie({
    id: "tie-1",
    homeTeamId: realMadrid.id,
    awayTeamId: manchesterUnited.id,
    legs: 1,
  }, teams);

  expect(result.legs.length).toBe(1);
  expect([realMadrid.id, manchesterUnited.id]).toContain(result.winnerTeamId);
});

test("simulateKnockoutTie supports two-leg aggregate ties", () => {
  const result = simulateKnockoutTie({
    id: "tie-2",
    homeTeamId: realMadrid.id,
    awayTeamId: manchesterUnited.id,
    legs: 2,
  }, teams);

  expect(result.legs.length).toBe(2);
  expect(result.aggregateHomeScore + result.aggregateAwayScore).toBeGreaterThanOrEqual(0);
  expect(["aggregate", "away-goals", "extra-time", "penalties"]).toContain(result.decidedBy);
});

test("simulateKnockoutRound returns advancing teams", () => {
  const round = simulateKnockoutRound([
    {
      id: "tie-3",
      homeTeamId: realMadrid.id,
      awayTeamId: manchesterUnited.id,
      legs: 1,
    },
  ], teams);

  expect(round.ties.length).toBe(1);
  expect(round.advancingTeamIds.length).toBe(1);
});

test("advanceKnockoutRound creates next-round ties from winners", () => {
  const nextRound = advanceKnockoutRound({
    ties: [],
    advancingTeamIds: [realMadrid.id, manchesterUnited.id],
  }, "semi-final");

  expect(nextRound.length).toBe(1);
  expect(nextRound[0]?.stage).toBe("semi-final");
});

test("createKnockoutBracket wraps initial ties", () => {
  const bracket = createKnockoutBracket([
    { id: "tie-a", homeTeamId: realMadrid.id, awayTeamId: manchesterUnited.id, legs: 1 },
  ]);
  expect(bracket.rounds.length).toBe(1);
  expect(bracket.rounds[0]?.length).toBe(1);
});

test("knockout tie can use away goals preset logic", () => {
  const result = simulateKnockoutTie({
    id: "ucl-tie",
    homeTeamId: realMadrid.id,
    awayTeamId: manchesterUnited.id,
    legs: 2,
    stage: "quarter-final",
  }, teams, {
    stageRules: {
      "quarter-final": {
        knockout: competitionRulePresets.uclClassicAwayGoals.knockout,
      },
    },
  });

  expect(result.awayGoalsHome).toBeGreaterThanOrEqual(0);
  expect(result.awayGoalsAway).toBeGreaterThanOrEqual(0);
});
