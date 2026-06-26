import { test, expect } from "bun:test";
import { competitionRulePresets, createCompetitionRules, defaultCompetitionRules } from "./competition-rules";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { simulateSeason } from "./season-simulator";

test("createCompetitionRules merges overrides with defaults", () => {
  const rules = createCompetitionRules({
    points: { win: 2 },
    match: { maxBenchSize: 5 },
  });

  expect(rules.points.win).toBe(2);
  expect(rules.points.draw).toBe(defaultCompetitionRules.points.draw);
  expect(rules.match.maxBenchSize).toBe(5);
  expect(rules.match.maxSubstitutions).toBe(defaultCompetitionRules.match.maxSubstitutions);
});

test("simulateSeason honors custom competition points rules", () => {
  const season = simulateSeason([
    {
      club: realMadrid,
      manager: carloAncelotti,
      players: getPlayersByClub("real-madrid"),
      formation: "4-3-3",
      mentality: "positive",
    },
    {
      club: manchesterUnited,
      manager: erikTenHag,
      players: getPlayersByClub("man-utd"),
      formation: "4-2-3-1",
      mentality: "balanced",
    },
  ], {
    includeReturnLegs: true,
    competitionRules: {
      points: {
        win: 2,
        draw: 1,
        loss: 0,
      },
      match: {
        maxBenchSize: 5,
      },
    },
  });

  expect(season.table.every(entry => entry.points <= entry.played * 2)).toBe(true);
});

test("simulateSeason honors custom injury recovery mapping", () => {
  const season = simulateSeason([
    {
      club: realMadrid,
      manager: carloAncelotti,
      players: getPlayersByClub("real-madrid"),
      formation: "4-3-3",
      mentality: "positive",
    },
    {
      club: manchesterUnited,
      manager: erikTenHag,
      players: getPlayersByClub("man-utd"),
      formation: "4-2-3-1",
      mentality: "balanced",
    },
  ], {
    includeReturnLegs: true,
    competitionRules: {
      injuries: {
        severeMatchesOut: 8,
      },
    },
  });

  expect(season.playerStatuses.size).toBeGreaterThan(0);
});

test("competition presets expose distinct competition styles", () => {
  expect(competitionRulePresets.superCup.match.maxSubstitutions).toBeGreaterThan(defaultCompetitionRules.match.maxSubstitutions);
  expect(competitionRulePresets.twoPointLeague.points.win).toBe(2);
  expect(competitionRulePresets.domesticCupModern.match.maxBenchSize).toBeGreaterThanOrEqual(9);
  expect(competitionRulePresets.uclModern.group.tiebreakers[0]).toBe("headToHead");
  expect(competitionRulePresets.communityShield.knockout.allowExtraTime).toBe(false);
  expect(competitionRulePresets.faCupModern.knockout.allowPenalties).toBe(true);
  expect(competitionRulePresets.worldCupModern.match.maxBenchSize).toBeGreaterThanOrEqual(15);
});
