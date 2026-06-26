import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { simulateGroupStage } from "./group-stage";

const madrid = {
  club: realMadrid,
  manager: carloAncelotti,
  players: getPlayersByClub("real-madrid"),
  formation: "4-3-3" as const,
  mentality: "positive" as const,
};

const united = {
  club: manchesterUnited,
  manager: erikTenHag,
  players: getPlayersByClub("man-utd"),
  formation: "4-2-3-1" as const,
  mentality: "balanced" as const,
};

test("ucl preset exposes head-to-head-first group ordering strategy", () => {
  const result = simulateGroupStage([
    { ...madrid, group: "A" },
    { ...united, group: "A" },
  ], {
    qualifiersPerGroup: 1,
    competitionRules: {
      group: {
        tiebreakers: ["headToHead", "goalDifference", "goalsFor", "teamName"],
      },
    },
  });

  expect(result.groups.length).toBe(1);
  expect(result.groups[0]?.table.length).toBe(2);
});
