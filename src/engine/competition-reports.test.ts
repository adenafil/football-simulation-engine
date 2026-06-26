import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { simulateGroupStage } from "./group-stage";
import { simulateKnockoutTournament } from "./knockout-tournament";
import {
  buildGroupStageReport,
  buildKnockoutBracketReport,
  buildTournamentReport,
  exportReportAsJson,
} from "./competition-reports";
import { simulateTournament } from "./tournament-simulator";
import { createCompetitionRules } from "./competition-rules";

function makeClub(id: string, name: string, reputation: number) {
  return {
    id,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    city: name,
    founded: 1900,
    nation: "Test",
    league: "Test",
    reputation,
    status: "professional" as const,
    finances: { balance: 0, transferBudget: 0, totalWages: 0, remainingWages: 0 },
    facilities: { trainingFacilities: 80, youthFacilities: 80, youthRecruitment: 80, juniorCoaching: 80 },
    homeAdvantage: 0.1,
  };
}

function makeManager(id: string, name: string) {
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
const clubE = makeClub("club-e", "Club E", 75);
const clubF = makeClub("club-f", "Club F", 70);
const managerC = makeManager("manager-c", "Manager C");
const managerD = makeManager("manager-d", "Manager D");
const managerE = makeManager("manager-e", "Manager E");
const managerF = makeManager("manager-f", "Manager F");

const madrid = {
  club: realMadrid,
  manager: carloAncelotti,
  players: getPlayersByClub("real-madrid"),
  formation: "4-3-3" as const,
};

const united = {
  club: manchesterUnited,
  manager: erikTenHag,
  players: getPlayersByClub("man-utd"),
  formation: "4-2-3-1" as const,
};

const teamC = { club: clubC, manager: managerC, players: getPlayersByClub("real-madrid"), formation: "4-3-3" as const };
const teamD = { club: clubD, manager: managerD, players: getPlayersByClub("man-utd"), formation: "4-2-3-1" as const };
const teamE = { club: clubE, manager: managerE, players: getPlayersByClub("real-madrid"), formation: "4-3-3" as const };
const teamF = { club: clubF, manager: managerF, players: getPlayersByClub("man-utd"), formation: "4-2-3-1" as const };

test("buildGroupStageReport produces valid standings", () => {
  const result = simulateGroupStage([
    { ...madrid, group: "A" },
    { ...united, group: "A" },
    { ...teamC, group: "A" },
    { ...teamD, group: "A" },
  ], { qualifiersPerGroup: 2 });

  const reports = buildGroupStageReport(result);
  expect(reports.length).toBe(1);
  expect(reports[0]!.group).toBe("A");
  expect(reports[0]!.standings.length).toBe(4);
  expect(reports[0]!.matchesPlayed).toBe(12);
  expect(reports[0]!.totalGoals).toBeGreaterThanOrEqual(0);

  for (const row of reports[0]!.standings) {
    expect(row.played).toBe(6);
    expect(row.won + row.drawn + row.lost).toBe(row.played);
  }
});

test("buildTournamentReport produces full tournament summary", () => {
  const tournament = simulateTournament([
    { ...madrid, group: "A" },
    { ...united, group: "A" },
    { ...teamC, group: "B" },
    { ...teamD, group: "B" },
  ], {
    qualifiersPerGroup: 2,
    competitionRules: {
      group: { tiebreakers: ["goalDifference", "goalsFor", "teamName"] },
    },
  });

  const report = buildTournamentReport(tournament);
  expect(report.champion).toBeDefined();
  expect(report.totalMatches).toBeGreaterThan(0);
  expect(report.totalGoals).toBeGreaterThanOrEqual(0);
  expect(report.groupStage.length).toBe(2);
  expect(report.knockout.rounds.length).toBeGreaterThan(0);
});

test("exportReportAsJson produces valid JSON", () => {
  const tournament = simulateTournament([
    { ...madrid, group: "A" },
    { ...united, group: "A" },
    { ...teamC, group: "B" },
    { ...teamD, group: "B" },
  ], {
    qualifiersPerGroup: 2,
  });

  const report = buildTournamentReport(tournament);
  const json = exportReportAsJson(report);
  const parsed = JSON.parse(json);
  expect(parsed.champion).toBeDefined();
  expect(parsed.groupStage).toBeDefined();
  expect(parsed.knockout).toBeDefined();
});
