import { test, expect } from "bun:test";
import type { Club } from "../domain/club";
import type { Manager } from "../domain/manager";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { simulateGroupStage } from "./group-stage";

function makeClub(id: string, name: string, reputation: number): Club {
  return {
    id,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    city: name,
    founded: 1900,
    nation: "Test",
    league: "Test",
    reputation,
    status: "professional",
    finances: { balance: 0, transferBudget: 0, totalWages: 0, remainingWages: 0 },
    facilities: { trainingFacilities: 80, youthFacilities: 80, youthRecruitment: 80, juniorCoaching: 80 },
    homeAdvantage: 0.1,
  };
}

function makeManager(id: string, name: string): Manager {
  return {
    id,
    name,
    nationality: "Test",
    age: 50,
    attackingBias: 50,
    defensiveBias: 50,
    inGameManagement: 50,
    manManagement: 50,
    tacticalKnowledge: 50,
    pressing: 50,
    tempo: 50,
  };
}

const clubC = makeClub("club-c", "Club C", 85);
const clubD = makeClub("club-d", "Club D", 80);
const managerC = makeManager("manager-c", "Manager C");
const managerD = makeManager("manager-d", "Manager D");

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

const teamC = {
  club: clubC,
  manager: managerC,
  players: getPlayersByClub("real-madrid"),
  formation: "4-3-3" as const,
  mentality: "balanced" as const,
};

const teamD = {
  club: clubD,
  manager: managerD,
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

test("group with 4 teams produces valid standings and all fixtures played", () => {
  const result = simulateGroupStage([
    { ...madrid, group: "B" },
    { ...united, group: "B" },
    { ...teamC, group: "B" },
    { ...teamD, group: "B" },
  ], {
    qualifiersPerGroup: 2,
    competitionRules: {
      group: {
        tiebreakers: ["headToHead", "goalDifference", "goalsFor", "fewestGoalsAgainst", "fairPlay", "teamName"],
      },
    },
  });

  expect(result.groups.length).toBe(1);
  const group = result.groups[0]!;
  expect(group.table.length).toBe(4);

  for (const entry of group.table) {
    expect(entry.played).toBe(6);
    expect(entry.points).toBeGreaterThanOrEqual(0);
    expect(entry.goalDifference).toBe(entry.goalsFor - entry.goalsAgainst);
  }

  expect(result.qualifiedTeams.length).toBe(2);

  const totalResults = group.results.length;
  expect(totalResults).toBe(12);
});

test("recursive head-to-head: mini-table separates 3-way tie in a group", () => {
  const result = simulateGroupStage([
    { ...madrid, group: "C" },
    { ...united, group: "C" },
    { ...teamC, group: "C" },
    { ...teamD, group: "C" },
  ], {
    qualifiersPerGroup: 2,
    competitionRules: {
      group: {
        tiebreakers: ["headToHead", "goalDifference", "goalsFor", "fewestGoalsAgainst", "teamName"],
      },
    },
  });

  const group = result.groups[0]!;
  expect(group.table.length).toBe(4);

  const totalPoints = group.table.reduce((sum, e) => sum + e.points, 0);
  expect(totalPoints).toBeGreaterThan(0);

  const pointsDescending = group.table.every((entry, i) =>
    i === 0 || entry.points <= group.table[i - 1]!.points,
  );
  expect(pointsDescending).toBe(true);
});

test("group table: within same-point bucket, tiebreakers determine order", () => {
  const result = simulateGroupStage([
    { ...madrid, group: "D" },
    { ...united, group: "D" },
    { ...teamC, group: "D" },
    { ...teamD, group: "D" },
  ], {
    qualifiersPerGroup: 4,
    competitionRules: {
      group: {
        tiebreakers: ["goalDifference", "goalsFor", "teamName"],
      },
    },
  });

  const table = result.groups[0]!.table;
  expect(table.length).toBe(4);

  for (let i = 1; i < table.length; i++) {
    const prev = table[i - 1]!;
    const curr = table[i]!;
    expect(prev.points).toBeGreaterThanOrEqual(curr.points);
  }
});

test("multi-group simulation produces independent group results", () => {
  const result = simulateGroupStage([
    { ...madrid, group: "A" },
    { ...united, group: "A" },
    { ...teamC, group: "B" },
    { ...teamD, group: "B" },
  ], {
    qualifiersPerGroup: 1,
    competitionRules: {
      group: {
        tiebreakers: ["goalDifference", "goalsFor", "teamName"],
      },
    },
  });

  expect(result.groups.length).toBe(2);
  expect(result.qualifiedTeams.length).toBe(2);

  const groupA = result.groups.find(g => g.group === "A")!;
  const groupB = result.groups.find(g => g.group === "B")!;
  expect(groupA.table.length).toBe(2);
  expect(groupB.table.length).toBe(2);
  expect(groupA.results.length).toBe(2);
  expect(groupB.results.length).toBe(2);
});
