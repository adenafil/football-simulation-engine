import { test, expect } from "bun:test";
import { getPlayersByClub } from "../data/players";
import {
  applyMatchAvailabilityConsequences,
  getAvailableSquad,
  initializeSeasonPlayerStatuses,
  resetYellowCards,
  tickRecovery,
} from "./season-state";
import type { MatchAvailabilityConsequences } from "../domain/match-context";
import { createCompetitionRules } from "./competition-rules";

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
    yellowCards: [],
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
    yellowCards: [],
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
    yellowCards: [],
  });

  const squad = getAvailableSquad(players, updated);
  expect(squad.unavailable.some(player => player.id === players[0]!.id)).toBe(true);
  expect(squad.doubtful.some(player => player.id === players[1]!.id)).toBe(true);
  expect(squad.unavailable.some(player => player.id === players[2]!.id)).toBe(true);
  expect(squad.available.some(player => player.id === players[3]!.id)).toBe(true);
});

test("yellow card accumulation triggers suspension at threshold", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 3);
  const statuses = initializeSeasonPlayerStatuses(players);
  const rules = createCompetitionRules({
    suspensions: {
      yellowCardAccumulation: [
        { yellowCards: 3, suspendMatches: 1 },
        { yellowCards: 5, suspendMatches: 2 },
      ],
      yellowCardResetAfter: 19,
    },
  });

  const consequences: MatchAvailabilityConsequences = {
    suspensions: [],
    injuries: [],
    yellowCards: [
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
    ],
  };

  const updated = applyMatchAvailabilityConsequences(statuses, consequences, rules);
  expect(updated.get(players[0]!.id)?.yellowCards).toBe(3);
  expect(updated.get(players[0]!.id)?.yellowCardSuspensionMatchesRemaining).toBe(1);
  expect(updated.get(players[0]!.id)?.status).toBe("suspended");
});

test("yellow card accumulation: higher threshold not triggered at lower count", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 2);
  const statuses = initializeSeasonPlayerStatuses(players);
  const rules = createCompetitionRules({
    suspensions: {
      yellowCardAccumulation: [
        { yellowCards: 3, suspendMatches: 1 },
        { yellowCards: 5, suspendMatches: 2 },
      ],
      yellowCardResetAfter: 19,
    },
  });

  const consequences: MatchAvailabilityConsequences = {
    suspensions: [],
    injuries: [],
    yellowCards: [
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
    ],
  };

  const updated = applyMatchAvailabilityConsequences(statuses, consequences, rules);
  expect(updated.get(players[0]!.id)?.yellowCards).toBe(2);
  expect(updated.get(players[0]!.id)?.yellowCardSuspensionMatchesRemaining).toBe(0);
  expect(updated.get(players[0]!.id)?.status).toBe("available");
});

test("yellow card accumulation: higher threshold replaces lower at crossing", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 2);
  let statuses = initializeSeasonPlayerStatuses(players);
  const rules = createCompetitionRules({
    suspensions: {
      yellowCardAccumulation: [
        { yellowCards: 3, suspendMatches: 1 },
        { yellowCards: 5, suspendMatches: 2 },
      ],
      yellowCardResetAfter: 19,
    },
  });

  statuses = applyMatchAvailabilityConsequences(statuses, {
    suspensions: [],
    injuries: [],
    yellowCards: [
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
    ],
  }, rules);

  expect(statuses.get(players[0]!.id)?.yellowCards).toBe(3);
  expect(statuses.get(players[0]!.id)?.yellowCardSuspensionMatchesRemaining).toBe(1);

  const updated = applyMatchAvailabilityConsequences(statuses, {
    suspensions: [],
    injuries: [],
    yellowCards: [
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
    ],
  }, rules);

  expect(updated.get(players[0]!.id)?.yellowCards).toBe(5);
  expect(updated.get(players[0]!.id)?.yellowCardSuspensionMatchesRemaining).toBe(2);
});

test("tickRecovery decrements yellow card suspension counter", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 2);
  const statuses = initializeSeasonPlayerStatuses(players);
  const rules = createCompetitionRules({
    suspensions: {
      yellowCardAccumulation: [{ yellowCards: 3, suspendMatches: 1 }],
      yellowCardResetAfter: 19,
    },
  });

  const afterMatch = applyMatchAvailabilityConsequences(statuses, {
    suspensions: [],
    injuries: [],
    yellowCards: [
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
    ],
  }, rules);

  expect(afterMatch.get(players[0]!.id)?.yellowCardSuspensionMatchesRemaining).toBe(1);

  const afterTick = tickRecovery(afterMatch);
  expect(afterTick.get(players[0]!.id)?.yellowCardSuspensionMatchesRemaining).toBe(0);
  expect(afterTick.get(players[0]!.id)?.status).toBe("available");
});

test("resetYellowCards clears yellow card counts and suspensions", () => {
  const players = getPlayersByClub("real-madrid").slice(0, 2);
  const statuses = initializeSeasonPlayerStatuses(players);
  const rules = createCompetitionRules({
    suspensions: {
      yellowCardAccumulation: [{ yellowCards: 3, suspendMatches: 1 }],
      yellowCardResetAfter: 19,
    },
  });

  const afterMatch = applyMatchAvailabilityConsequences(statuses, {
    suspensions: [],
    injuries: [],
    yellowCards: [
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
      { playerId: players[0]!.id, playerName: players[0]!.name, team: "home" },
    ],
  }, rules);

  expect(afterMatch.get(players[0]!.id)?.yellowCards).toBe(3);
  expect(afterMatch.get(players[0]!.id)?.yellowCardSuspensionMatchesRemaining).toBe(1);

  const afterReset = resetYellowCards(afterMatch);
  expect(afterReset.get(players[0]!.id)?.yellowCards).toBe(0);
  expect(afterReset.get(players[0]!.id)?.yellowCardSuspensionMatchesRemaining).toBe(0);
});
