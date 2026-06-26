import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { getQualifiedTeams, simulateGroupStage } from "./group-stage";

const teams = [
  {
    club: realMadrid,
    manager: carloAncelotti,
    players: getPlayersByClub("real-madrid"),
    formation: "4-3-3" as const,
    mentality: "positive" as const,
    group: "A",
  },
  {
    club: manchesterUnited,
    manager: erikTenHag,
    players: getPlayersByClub("man-utd"),
    formation: "4-2-3-1" as const,
    mentality: "balanced" as const,
    group: "A",
  },
];

test("simulateGroupStage returns group results and qualified teams", () => {
  const result = simulateGroupStage(teams, {
    qualifiersPerGroup: 1,
  });

  expect(result.groups.length).toBe(1);
  expect(result.groups[0]?.table.length).toBe(2);
  expect(result.qualifiedTeams.length).toBe(1);
});

test("getQualifiedTeams returns expected number of teams", () => {
  const result = simulateGroupStage(teams, {
    qualifiersPerGroup: 1,
  });

  const qualified = getQualifiedTeams(result, 1);
  expect(qualified.length).toBe(1);
});
