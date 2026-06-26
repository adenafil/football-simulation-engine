import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { drawGroupsFromPots, seedKnockoutBracket, type GroupDrawPot } from "./draw-engine";

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

test("drawGroupsFromPots enforces maxTeamsPerNation constraint", () => {
  const makeTeam = (id: string, nation: string) => ({
    club: { ...realMadrid, id, name: id, shortName: id.slice(0, 3).toUpperCase(), nation },
    manager: carloAncelotti,
    players: getPlayersByClub("real-madrid"),
    formation: "4-3-3" as const,
  });

  const result = drawGroupsFromPots([
    {
      name: "Pot A",
      teams: [
        makeTeam("team-1", "Spain"),
        makeTeam("team-2", "England"),
      ],
    },
    {
      name: "Pot B",
      teams: [
        makeTeam("team-3", "Spain"),
        makeTeam("team-4", "England"),
      ],
    },
  ], {
    groupCount: 2,
    preventSameNation: false,
    maxTeamsPerNation: 1,
  });

  for (const group of Object.values(result.groups)) {
    const nations = group.map(t => t.club.nation);
    const spainCount = nations.filter(n => n === "Spain").length;
    const englandCount = nations.filter(n => n === "England").length;
    expect(spainCount).toBeLessThanOrEqual(1);
    expect(englandCount).toBeLessThanOrEqual(1);
  }
});

test("drawGroupsFromPots enforces protectedNationPairs constraint", () => {
  const makeTeam = (id: string, nation: string) => ({
    club: { ...realMadrid, id, name: id, shortName: id.slice(0, 3).toUpperCase(), nation },
    manager: carloAncelotti,
    players: getPlayersByClub("real-madrid"),
    formation: "4-3-3" as const,
  });

  const result = drawGroupsFromPots([
    {
      name: "Pot A",
      teams: [
        makeTeam("team-1", "Spain"),
        makeTeam("team-2", "France"),
      ],
    },
    {
      name: "Pot B",
      teams: [
        makeTeam("team-3", "England"),
        makeTeam("team-4", "Germany"),
      ],
    },
  ], {
    groupCount: 2,
    preventSameNation: false,
    protectedNationPairs: [["Spain", "England"]],
  });

  for (const group of Object.values(result.groups)) {
    const nations = group.map(t => t.club.nation);
    const hasSpain = nations.includes("Spain");
    const hasEngland = nations.includes("England");
    expect(hasSpain && hasEngland).toBe(false);
  }
});
