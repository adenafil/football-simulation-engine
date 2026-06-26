import { test, expect } from "bun:test";
import { realMadrid, manchesterUnited } from "../data/clubs";
import { getPlayersByClub } from "../data/players";
import { carloAncelotti, erikTenHag } from "../data/managers";
import { buildDefaultTactic, buildLineup } from "./lineup-builder";
import {
  getEligiblePlayersForClub,
  initializeLeagueTable,
  simulateMatchday,
  updateLeagueTableFromMatch,
} from "./league-state";
import { initializeSeasonPlayerStatuses } from "./season-state";
import type { MatchContext } from "../domain/match-context";

test("updateLeagueTableFromMatch updates points and goals", () => {
  const table = initializeLeagueTable([realMadrid, manchesterUnited]);
  const updated = updateLeagueTableFromMatch(table, {
    homeTeamId: realMadrid.id,
    awayTeamId: manchesterUnited.id,
    homeTeamName: realMadrid.name,
    awayTeamName: manchesterUnited.name,
    homeScore: 2,
    awayScore: 1,
    events: [],
    stats: {
      possession: { home: 50, away: 50 },
      shots: { home: 0, away: 0 },
      shotsOnTarget: { home: 0, away: 0 },
      corners: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 },
      offsides: { home: 0, away: 0 },
      xG: { home: 0, away: 0 },
    },
    playerMatchStats: [],
    playerRatings: [],
    manOfMatch: "",
    homeFormation: "4-3-3",
    awayFormation: "4-2-3-1",
    substitutions: [],
    injuries: [],
    availability: { suspensions: [], injuries: [] },
  });

  const home = updated.find(entry => entry.teamId === realMadrid.id);
  const away = updated.find(entry => entry.teamId === manchesterUnited.id);
  expect(home?.points).toBe(3);
  expect(home?.goalsFor).toBe(2);
  expect(away?.losses).toBe(1);
});

test("simulateMatchday returns results table and updated statuses", () => {
  const homePlayers = getPlayersByClub("real-madrid");
  const awayPlayers = getPlayersByClub("man-utd");
  const homeLineup = buildLineup(homePlayers, "4-3-3");
  const awayLineup = buildLineup(awayPlayers, "4-2-3-1");

  const context: MatchContext = {
    venueType: "neutral",
    weather: "clear",
    importance: "league",
    competitionType: "league",
    isDerby: false,
  };

  const statuses = initializeSeasonPlayerStatuses([...homePlayers, ...awayPlayers]);
  const table = initializeLeagueTable([realMadrid, manchesterUnited]);
  const matchday = simulateMatchday([
    {
      fixture: {
        id: "md1-rma-mun",
        homeTeamId: realMadrid.id,
        awayTeamId: manchesterUnited.id,
        matchday: 1,
      },
      homeSetup: {
        club: realMadrid,
        manager: carloAncelotti,
        tactic: buildDefaultTactic("4-3-3", "positive"),
        outfield: homeLineup.outfield,
        goalkeeper: homeLineup.goalkeeper,
        bench: homeLineup.bench,
      },
      awaySetup: {
        club: manchesterUnited,
        manager: erikTenHag,
        tactic: buildDefaultTactic("4-2-3-1", "balanced"),
        outfield: awayLineup.outfield,
        goalkeeper: awayLineup.goalkeeper,
        bench: awayLineup.bench,
      },
      context,
    },
  ], table, statuses);

  expect(matchday.results.length).toBe(1);
  expect(matchday.updatedTable.length).toBe(2);
  expect(matchday.updatedStatuses.size).toBeGreaterThan(0);
});

test("getEligiblePlayersForClub excludes unavailable players", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 4);
  const statuses = initializeSeasonPlayerStatuses(players);
  statuses.set(players[0]!.id, {
    playerId: players[0]!.id,
    playerName: players[0]!.name,
    suspensionMatchesRemaining: 1,
    injuryMatchesRemaining: 0,
    status: "suspended",
  });

  const eligible = getEligiblePlayersForClub(players, statuses);
  expect(eligible.some(player => player.id === players[0]!.id)).toBe(false);
  expect(eligible.length).toBe(players.length - 1);
});
