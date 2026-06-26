import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { createInitialKnockoutRound, simulateKnockoutTournament } from "./knockout-tournament";

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

test("createInitialKnockoutRound creates first round ties", () => {
  const round = createInitialKnockoutRound(teams, 1);
  expect(round.length).toBe(1);
  expect(round[0]?.stage).toBe("final");
});

test("simulateKnockoutTournament resolves a champion", () => {
  const tournament = simulateKnockoutTournament(teams, {
    initialLegs: 1,
    finalLegs: 1,
  });

  expect(tournament.rounds.length).toBeGreaterThanOrEqual(1);
  expect([realMadrid.id, manchesterUnited.id]).toContain(tournament.championTeamId);
  expect(tournament.championTeamName.length).toBeGreaterThan(0);
});
