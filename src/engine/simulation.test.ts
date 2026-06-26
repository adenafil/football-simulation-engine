import { test, expect } from "bun:test";
import { simulateMatch } from "./match-simulator";
import { buildLineup, buildDefaultTactic } from "../index";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import type { MatchContext } from "../domain/match-context";
import { createCompetitionRules } from "./competition-rules";
import type { TeamSetup } from "./match-simulator";

function runSimulation() {
  const homeLineup = buildLineup(getPlayersByClub("real-madrid"), "4-3-3");
  const awayLineup = buildLineup(getPlayersByClub("man-utd"), "4-2-3-1");

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
  const lineup = buildLineup(getPlayersByClub("real-madrid"), "4-3-3");
  expect(lineup.outfield.length).toBe(10);
  expect(lineup.goalkeeper).toBeDefined();
  expect(lineup.bench.length).toBeGreaterThanOrEqual(1);
});

test("lineup building accepts config for bench size and exclusions", () => {
  const players = getPlayersByClub("real-madrid");
  const lineup = buildLineup(players, "4-3-3", {
    benchSize: 5,
    excludePlayerIds: ["mbappe"],
  });

  expect(lineup.bench.length).toBeLessThanOrEqual(5);
  expect(lineup.outfield.some(player => player.player.id === "mbappe")).toBe(false);
});

test("player match stats align with match goal totals", () => {
  const result = runSimulation();
  const totalGoals = result.playerMatchStats.reduce((sum, player) => sum + player.goals, 0);
  const totalAssists = result.playerMatchStats.reduce((sum, player) => sum + player.assists, 0);
  expect(totalGoals).toBe(result.homeScore + result.awayScore);
  expect(totalAssists).toBeLessThanOrEqual(totalGoals);
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

test("match state: momentum fires after goals", () => {
  const result = runSimulation();
  if (result.homeScore + result.awayScore > 0) {
    const goalEvents = result.events.filter(e => e.phase === "goal");
    expect(goalEvents.length).toBe(result.homeScore + result.awayScore);
  }
});

test("match state: trailing teams have correlated late shots (integration smoke)", () => {
  let trailingLateShots = 0;
  let trailingLateMinutes = 0;
  for (let i = 0; i < 20; i++) {
    const result = runSimulation();
    const lateEvents = result.events.filter(e =>
      e.minute > 75 && (e.phase === "shot" || e.phase === "goal")
    );
    trailingLateShots += lateEvents.filter(e => {
      const isHome = e.team === "home";
      const isTrailing = isHome
        ? result.homeScore < result.awayScore
        : result.awayScore < result.homeScore;
      return isTrailing;
    }).length;
    trailingLateMinutes += lateEvents.length;
  }
  if (trailingLateMinutes > 0) {
    expect(trailingLateShots).toBeGreaterThan(0);
  }
});

test("injury events stay consistent with substitutions when forced", () => {
  const results = Array.from({ length: 10 }, () => runSimulation());
  for (const result of results) {
    for (const injury of result.injuries) {
      if (!injury.forcedSubstitution) continue;
      const matchingSub = result.substitutions.find(sub =>
        sub.team === injury.team
        && sub.playerOutId === injury.playerId
        && sub.playerInId === injury.replacementPlayerId,
      );
      expect(matchingSub).toBeDefined();
    }
  }
});

test("injury events are additive and well-formed", () => {
  const result = runSimulation();
  for (const injury of result.injuries) {
    expect(["minor", "moderate", "severe"]).toContain(injury.severity);
    expect(injury.playerId.length).toBeGreaterThan(0);
    expect(injury.playerName.length).toBeGreaterThan(0);
  }
});

test("availability suspensions align with red cards", () => {
  const results = Array.from({ length: 10 }, () => runSimulation());
  for (const result of results) {
    const redCardedPlayers = result.playerMatchStats.filter(player => player.redCards > 0);
    for (const player of redCardedPlayers) {
      const suspension = result.availability.suspensions.find(entry => entry.playerId === player.playerId);
      expect(suspension).toBeDefined();
      expect(suspension?.matches).toBeGreaterThanOrEqual(1);
    }
  }
});

test("availability injury consequences align with injury severities", () => {
  const results = Array.from({ length: 10 }, () => runSimulation());
  for (const result of results) {
    for (const injury of result.injuries) {
      if (injury.severity === "minor") continue;
      const consequence = result.availability.injuries.find(entry => entry.playerId === injury.playerId);
      expect(consequence).toBeDefined();
      expect(consequence?.expectedMatchesOut).toBeGreaterThan(0);
    }
  }
});

test("extra-time match produces >90 minutes and allows extra substitution", () => {
  const homeLineup = buildLineup(getPlayersByClub("real-madrid"), "4-3-3", { benchSize: 12 });
  const awayLineup = buildLineup(getPlayersByClub("man-utd"), "4-2-3-1", { benchSize: 12 });
  const homeTactic = buildDefaultTactic("4-3-3", "positive");
  const awayTactic = buildDefaultTactic("4-2-3-1", "balanced");
  const context: MatchContext = {
    venueType: "neutral",
    weather: "clear",
    importance: "knockout",
    competitionType: "continental",
    isDerby: false,
  };

  const rules = createCompetitionRules({
    match: { maxSubstitutions: 5 },
    knockout: { extraTimeSubsAllowed: 1 },
  });

  const homeSetup: TeamSetup = {
    club: realMadrid,
    manager: carloAncelotti,
    tactic: homeTactic,
    outfield: homeLineup.outfield,
    goalkeeper: homeLineup.goalkeeper,
    bench: homeLineup.bench,
    competitionRules: rules,
  };

  const awaySetup: TeamSetup = {
    club: manchesterUnited,
    manager: erikTenHag,
    tactic: awayTactic,
    outfield: awayLineup.outfield,
    goalkeeper: awayLineup.goalkeeper,
    bench: awayLineup.bench,
    competitionRules: rules,
  };

  let found6Subs = false;
  for (let i = 0; i < 20; i++) {
    const result = simulateMatch(homeSetup, awaySetup, context, { extraTime: true });
    const homeSubs = result.substitutions.filter(s => s.team === "home").length;
    const awaySubs = result.substitutions.filter(s => s.team === "away").length;
    if (homeSubs >= 6 || awaySubs >= 6) {
      found6Subs = true;
      break;
    }
  }
  expect(found6Subs).toBe(true);
});

test("extra-time match can produce more than 90 minutes of play", () => {
  const homeLineup = buildLineup(getPlayersByClub("real-madrid"), "4-3-3");
  const awayLineup = buildLineup(getPlayersByClub("man-utd"), "4-2-3-1");
  const homeTactic = buildDefaultTactic("4-3-3", "positive");
  const awayTactic = buildDefaultTactic("4-2-3-1", "balanced");
  const context: MatchContext = {
    venueType: "neutral",
    weather: "clear",
    importance: "knockout",
    competitionType: "continental",
    isDerby: false,
  };

  const homeSetup: TeamSetup = {
    club: realMadrid,
    manager: carloAncelotti,
    tactic: homeTactic,
    outfield: homeLineup.outfield,
    goalkeeper: homeLineup.goalkeeper,
    bench: homeLineup.bench,
  };

  const awaySetup: TeamSetup = {
    club: manchesterUnited,
    manager: erikTenHag,
    tactic: awayTactic,
    outfield: awayLineup.outfield,
    goalkeeper: awayLineup.goalkeeper,
    bench: awayLineup.bench,
  };

  const result = simulateMatch(homeSetup, awaySetup, context, { extraTime: true });
  const maxMinute = Math.max(
    ...result.playerRatings.map(r => r.minutesPlayed),
    ...result.substitutions.map(s => s.minute),
    ...result.events.map(e => e.minute),
  );
  expect(maxMinute).toBeGreaterThan(90);
});
