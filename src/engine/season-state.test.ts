import { test, expect } from "bun:test";
import { getPlayersByClub } from "../data/players";
import {
  applyMatchAvailabilityConsequences,
  getAvailableSquad,
  initializeSeasonPlayerStatuses,
  tickRecovery,
} from "./season-state";
import type { MatchAvailabilityConsequences } from "../domain/match-context";

test("applyMatchAvailabilityConsequences adds suspensions and injuries", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 5);
  const statuses = initializeSeasonPlayerStatuses(players);

  const consequences: MatchAvailabilityConsequences = {
    suspensions: [
      {
        playerId: players[0]!.id,
        playerName: players[0]!.name,
        team: "home",
        reason: "red-card",
        matches: 1,
      },
    ],
    injuries: [
      {
        playerId: players[1]!.id,
        playerName: players[1]!.name,
        team: "home",
        severity: "severe",
        expectedMatchesOut: 5,
        status: "unavailable",
      },
    ],
  };

  const updated = applyMatchAvailabilityConsequences(statuses, consequences);
  expect(updated.get(players[0]!.id)?.suspensionMatchesRemaining).toBe(1);
  expect(updated.get(players[1]!.id)?.injuryMatchesRemaining).toBe(5);
});

test("tickRecovery decrements suspension and injury counters", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 2);
  const statuses = initializeSeasonPlayerStatuses(players);
  const updated = applyMatchAvailabilityConsequences(statuses, {
    suspensions: [{ playerId: players[0]!.id, playerName: players[0]!.name, team: "home", reason: "red-card", matches: 2 }],
    injuries: [{ playerId: players[1]!.id, playerName: players[1]!.name, team: "home", severity: "moderate", expectedMatchesOut: 2, status: "doubtful" }],
  });

  const next = tickRecovery(updated);
  expect(next.get(players[0]!.id)?.suspensionMatchesRemaining).toBe(1);
  expect(next.get(players[1]!.id)?.injuryMatchesRemaining).toBe(1);
});

test("getAvailableSquad separates available doubtful and unavailable players", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 4);
  const statuses = initializeSeasonPlayerStatuses(players);
  const updated = applyMatchAvailabilityConsequences(statuses, {
    suspensions: [{ playerId: players[0]!.id, playerName: players[0]!.name, team: "home", reason: "red-card", matches: 1 }],
    injuries: [
      { playerId: players[1]!.id, playerName: players[1]!.name, team: "home", severity: "moderate", expectedMatchesOut: 2, status: "doubtful" },
      { playerId: players[2]!.id, playerName: players[2]!.name, team: "home", severity: "severe", expectedMatchesOut: 5, status: "unavailable" },
    ],
  });

  const squad = getAvailableSquad(players, updated);
  expect(squad.unavailable.some(player => player.id === players[0]!.id)).toBe(true);
  expect(squad.doubtful.some(player => player.id === players[1]!.id)).toBe(true);
  expect(squad.unavailable.some(player => player.id === players[2]!.id)).toBe(true);
  expect(squad.available.some(player => player.id === players[3]!.id)).toBe(true);
});
