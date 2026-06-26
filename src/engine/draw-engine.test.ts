import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { drawGroupsFromPots, seedKnockoutBracket } from "./draw-engine";

test("drawGroupsFromPots assigns teams into groups", () => {
  const result = drawGroupsFromPots([
    {
      name: "Pot 1",
      teams: [
        {
          club: realMadrid,
          manager: carloAncelotti,
          players: getPlayersByClub("real-madrid"),
          formation: "4-3-3",
          mentality: "positive",
        },
      ],
    },
    {
      name: "Pot 2",
      teams: [
        {
          club: manchesterUnited,
          manager: erikTenHag,
          players: getPlayersByClub("man-utd"),
          formation: "4-2-3-1",
          mentality: "balanced",
        },
      ],
    },
  ], {
    groupCount: 1,
    preventSameNation: false,
  });

  expect(Object.keys(result.groups).length).toBe(1);
  expect(result.groups.A?.length).toBe(2);
});

test("drawGroupsFromPots can enforce same-league separation when solvable", () => {
  const result = drawGroupsFromPots([
    {
      name: "Pot 1",
      teams: [
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
      ],
    },
  ], {
    groupCount: 2,
    preventSameNation: false,
    preventSameLeague: true,
  });

  expect(result.groups.A?.length).toBe(1);
  expect(result.groups.B?.length).toBe(1);
});

test("seedKnockoutBracket creates seeded ties", () => {
  const ties = seedKnockoutBracket([
    {
      club: realMadrid,
      manager: carloAncelotti,
      players: getPlayersByClub("real-madrid"),
      formation: "4-3-3",
      mentality: "positive",
      previousGroup: "A",
    },
  ], [
    {
      club: manchesterUnited,
      manager: erikTenHag,
      players: getPlayersByClub("man-utd"),
      formation: "4-2-3-1",
      mentality: "balanced",
      previousGroup: "B",
    },
  ], {
    preventSameNation: false,
    preventSameGroup: true,
  });

  expect(ties.length).toBe(1);
  expect(ties[0]?.homeTeamId).toBe(realMadrid.id);
  expect(ties[0]?.awayTeamId).toBe(manchesterUnited.id);
});
