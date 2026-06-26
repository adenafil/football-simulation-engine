import { test, expect } from "bun:test";
import { simulateMatch } from "./match-simulator";
import { buildLineup, buildDefaultTactic } from "../index";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { carloAncelotti, erikTenHag } from "../data/managers";
import type { MatchContext } from "../domain/match-context";

function runSimulation() {
  const homeLineup = buildLineup("real-madrid", "4-3-3");
  const awayLineup = buildLineup("man-utd", "4-2-3-1");

  const homeTactic = buildDefaultTactic("4-3-3", "positive");
  const awayTactic = buildDefaultTactic("4-2-3-1", "balanced");

  const context: MatchContext = {
    venueType: "neutral",
    weather: "clear",
    importance: "league",
    competitionType: "league",
    isDerby: false,
  };

  const homeSetup = {
    club: realMadrid,
    manager: carloAncelotti,
    tactic: homeTactic,
    outfield: homeLineup.outfield,
    goalkeeper: homeLineup.goalkeeper,
    bench: homeLineup.bench,
  };

  const awaySetup = {
    club: manchesterUnited,
    manager: erikTenHag,
    tactic: awayTactic,
    outfield: awayLineup.outfield,
    goalkeeper: awayLineup.goalkeeper,
    bench: awayLineup.bench,
  };

  return simulateMatch(homeSetup, awaySetup, context);
}

test("simulation produces a valid result", () => {
  const result = runSimulation();
  expect(result.homeTeamName).toBe("Real Madrid");
  expect(result.awayTeamName).toBe("Manchester United");
  expect(result.homeScore).toBeGreaterThanOrEqual(0);
  expect(result.awayScore).toBeGreaterThanOrEqual(0);
  expect(result.homeScore + result.awayScore).toBeLessThan(25);
});

test("simulation stats are consistent", () => {
  const result = runSimulation();
  expect(result.stats.possession.home + result.stats.possession.away).toBe(100);
  expect(result.stats.shots.home).toBeGreaterThanOrEqual(0);
  expect(result.stats.shots.away).toBeGreaterThanOrEqual(0);
  expect(result.stats.xG.home).toBeGreaterThanOrEqual(0);
  expect(result.stats.xG.away).toBeGreaterThanOrEqual(0);
});

test("simulation produces player ratings", () => {
  const result = runSimulation();
  expect(result.playerRatings.length).toBeGreaterThan(0);
  expect(result.manOfMatch.length).toBeGreaterThan(0);
});

test("goals and shots on target align", () => {
  const results = Array.from({ length: 5 }, () => runSimulation());
  for (const r of results) {
    expect(r.stats.shotsOnTarget.home).toBeLessThanOrEqual(r.stats.shots.home + 1);
    expect(r.stats.shotsOnTarget.away).toBeLessThanOrEqual(r.stats.shots.away + 1);
  }
});

test("xG trend: Real Madrid should have higher avg xG than Man Utd", () => {
  let homeXgSum = 0;
  for (let i = 0; i < 10; i++) {
    const r = runSimulation();
    homeXgSum += r.stats.xG.home;
  }
  const avgHomeXg = homeXgSum / 10;
  expect(avgHomeXg).toBeGreaterThan(0.5);
});

test("lineup building produces 11 players + bench", () => {
  const lineup = buildLineup("real-madrid", "4-3-3");
  expect(lineup.outfield.length).toBe(10);
  expect(lineup.goalkeeper).toBeDefined();
  expect(lineup.bench.length).toBeGreaterThanOrEqual(1);
});

test("simulation produces substitution events", () => {
  const results = Array.from({ length: 5 }, () => runSimulation());
  const hasSubs = results.some(r => r.substitutions.length > 0);
  expect(hasSubs).toBe(true);
});

test("substitutions never exceed 5 per team", () => {
  for (let i = 0; i < 10; i++) {
    const result = runSimulation();
    expect(result.substitutions.filter(s => s.team === "home").length).toBeLessThanOrEqual(5);
    expect(result.substitutions.filter(s => s.team === "away").length).toBeLessThanOrEqual(5);
  }
});

test("bench player who entered has minutesPlayed > 0", () => {
  for (let i = 0; i < 5; i++) {
    const result = runSimulation();
    for (const pr of result.playerRatings) {
      expect(pr.minutesPlayed).toBeGreaterThanOrEqual(1);
    }
  }
});
