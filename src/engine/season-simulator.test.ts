import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { generateRoundRobinFixtures, simulateSeason } from "./season-simulator";

test("generateRoundRobinFixtures creates home and away pairings", () => {
  const fixtures = generateRoundRobinFixtures([realMadrid, manchesterUnited], true);
  expect(fixtures.length).toBe(2);
  expect(fixtures.some(fixture => fixture.homeTeamId === realMadrid.id && fixture.awayTeamId === manchesterUnited.id)).toBe(true);
  expect(fixtures.some(fixture => fixture.homeTeamId === manchesterUnited.id && fixture.awayTeamId === realMadrid.id)).toBe(true);
});

test("simulateSeason returns completed table and leaderboards", () => {
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
  });

  expect(season.fixtures.length).toBe(2);
  expect(season.playedResults.length).toBe(2);
  expect(season.table.length).toBe(2);
  expect(season.table.reduce((sum, entry) => sum + entry.played, 0)).toBe(4);
  expect(season.playerSeasonStats.length).toBeGreaterThan(0);
  expect(season.clubSeasonStats.length).toBe(2);
  expect(season.topScorers.length).toBeGreaterThanOrEqual(0);
  expect(season.topAssists.length).toBeGreaterThanOrEqual(0);
  expect(season.topAverageRatings.length).toBeGreaterThanOrEqual(0);
});
