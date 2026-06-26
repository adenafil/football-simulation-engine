import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import {
  createSeasonSummary,
  deserializeSeasonState,
  exportSeasonSnapshot,
  serializeSeasonState,
} from "./season-persistence";
import { simulateSeason } from "./season-simulator";

function buildSeason() {
  return simulateSeason([
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
  ]);
}

test("season state serializes and deserializes round-trip", () => {
  const season = buildSeason();
  const serialized = serializeSeasonState(season);
  const restored = deserializeSeasonState(serialized);

  expect(restored.fixtures.length).toBe(season.fixtures.length);
  expect(restored.playedResults.length).toBe(season.playedResults.length);
  expect(restored.table.length).toBe(season.table.length);
  expect(restored.playerStatuses.size).toBe(season.playerStatuses.size);
});

test("createSeasonSummary returns top-level season overview", () => {
  const season = buildSeason();
  const summary = createSeasonSummary(season);

  expect(summary.fixturesPlayed).toBe(season.playedResults.length);
  expect(summary.totalGoals).toBeGreaterThanOrEqual(0);
  expect(summary.champion).toBeDefined();
});

test("exportSeasonSnapshot produces valid JSON payload", () => {
  const season = buildSeason();
  const snapshot = exportSeasonSnapshot(season);
  const parsed = JSON.parse(snapshot) as { state: { table: unknown[] }; summary: { fixturesPlayed: number } };

  expect(parsed.state.table.length).toBe(season.table.length);
  expect(parsed.summary.fixturesPlayed).toBe(season.playedResults.length);
});
