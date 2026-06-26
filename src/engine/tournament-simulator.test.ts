import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { simulateTournament } from "./tournament-simulator";

test("simulateTournament runs group stage then knockout and returns champion", () => {
  const tournament = simulateTournament([
    {
      club: realMadrid,
      manager: carloAncelotti,
      players: getPlayersByClub("real-madrid"),
      formation: "4-3-3",
      mentality: "positive",
      group: "A",
    },
    {
      club: manchesterUnited,
      manager: erikTenHag,
      players: getPlayersByClub("man-utd"),
      formation: "4-2-3-1",
      mentality: "balanced",
      group: "A",
    },
  ], {
    groupStage: {
      qualifiersPerGroup: 1,
    },
    knockout: {
      initialLegs: 1,
      finalLegs: 1,
    },
  });

  expect(tournament.groupStage.groups.length).toBe(1);
  expect(tournament.knockout.rounds.length).toBeGreaterThanOrEqual(0);
  expect(tournament.championTeamName.length).toBeGreaterThan(0);
});
