import type { MatchAvailabilityConsequences } from "../domain/match-context";
import type { Player } from "../domain/player";
import { defaultCompetitionRules, type CompetitionRules } from "./competition-rules";

export type SeasonAvailabilityStatus = "available" | "doubtful" | "suspended" | "injured";

export interface SeasonPlayerStatus {
  playerId: string;
  playerName: string;
  suspensionMatchesRemaining: number;
  injuryMatchesRemaining: number;
  yellowCards: number;
  yellowCardSuspensionMatchesRemaining: number;
  fitness: number;
  status: SeasonAvailabilityStatus;
}

export interface SeasonSquadAvailability {
  available: Player[];
  doubtful: Player[];
  unavailable: Player[];
}

function getPlayerDisplayName(player: Player): string {
  return player.name;
}

function deriveStatus(status: SeasonPlayerStatus): SeasonAvailabilityStatus {
  if (status.suspensionMatchesRemaining > 0) return "suspended";
  if (status.yellowCardSuspensionMatchesRemaining > 0) return "suspended";
  if (status.injuryMatchesRemaining > 0) {
    return status.status === "doubtful" ? "doubtful" : "injured";
  }
  if (status.status === "doubtful") return "doubtful";
  return "available";
}

export function initializeSeasonPlayerStatuses(
  players: Player[],
  initialFitness: number = 100,
): Map<string, SeasonPlayerStatus> {
  return new Map(
    players.map(player => [
      player.id,
      {
        playerId: player.id,
        playerName: getPlayerDisplayName(player),
        suspensionMatchesRemaining: 0,
        injuryMatchesRemaining: 0,
        yellowCards: 0,
        yellowCardSuspensionMatchesRemaining: 0,
        fitness: initialFitness,
        status: "available" as const,
      },
    ]),
  );
}

export function applyMatchAvailabilityConsequences(
  currentStatuses: Map<string, SeasonPlayerStatus>,
  consequences: MatchAvailabilityConsequences,
  rules: CompetitionRules = defaultCompetitionRules,
): Map<string, SeasonPlayerStatus> {
  const nextStatuses = new Map(
    Array.from(currentStatuses.entries()).map(([playerId, status]) => [playerId, { ...status }]),
  );

  function getOrCreate(playerId: string, playerName: string): SeasonPlayerStatus {
    const existing = nextStatuses.get(playerId);
    if (existing) {
      existing.playerName = playerName;
      return existing;
    }
    const created: SeasonPlayerStatus = {
      playerId,
      playerName,
      suspensionMatchesRemaining: 0,
      injuryMatchesRemaining: 0,
      yellowCards: 0,
      yellowCardSuspensionMatchesRemaining: 0,
      fitness: 100,
      status: "available",
    };
    nextStatuses.set(playerId, created);
    return created;
  }

  for (const suspension of consequences.suspensions) {
    const current = getOrCreate(suspension.playerId, suspension.playerName);
    current.suspensionMatchesRemaining = Math.max(
      current.suspensionMatchesRemaining,
      suspension.matches || rules.suspensions.redCardBanMatches,
    );
  }

  for (const injury of consequences.injuries) {
    const current = getOrCreate(injury.playerId, injury.playerName);
    const mappedMatchesOut = injury.severity === "moderate"
      ? rules.injuries.moderateMatchesOut
      : injury.severity === "severe"
        ? rules.injuries.severeMatchesOut
        : injury.expectedMatchesOut;
    current.injuryMatchesRemaining = Math.max(current.injuryMatchesRemaining, mappedMatchesOut);
    current.status = injury.severity === "moderate"
      ? rules.injuries.moderateStatus === "doubtful" ? "doubtful" : deriveStatus(current)
      : injury.severity === "severe"
        ? rules.injuries.severeStatus === "doubtful" ? "doubtful" : deriveStatus(current)
        : deriveStatus(current);
  }

  for (const yc of consequences.yellowCards) {
    const current = getOrCreate(yc.playerId, yc.playerName);
    current.yellowCards += 1;
    const applicableThresholds = rules.suspensions.yellowCardAccumulation
      .filter(t => current.yellowCards >= t.yellowCards);
    const threshold = applicableThresholds.length > 0
      ? applicableThresholds[applicableThresholds.length - 1]
      : undefined;
    if (threshold) {
      current.yellowCardSuspensionMatchesRemaining = Math.max(
        current.yellowCardSuspensionMatchesRemaining,
        threshold.suspendMatches,
      );
    }
  }

  for (const status of nextStatuses.values()) {
    status.status = deriveStatus(status);
  }

  return nextStatuses;
}

export function updatePlayerFitness(
  statuses: Map<string, SeasonPlayerStatus>,
  playerId: string,
  minutesPlayed: number,
): Map<string, SeasonPlayerStatus> {
  const nextStatuses = new Map(statuses);
  const status = nextStatuses.get(playerId);
  if (!status) return nextStatuses;

  const fatigue = Math.max(0, minutesPlayed - 60) * 0.3 + (minutesPlayed > 75 ? 5 : 0);
  const recoveryRate = 8;
  const newFitness = Math.max(40, Math.min(100, status.fitness - fatigue + recoveryRate));

  nextStatuses.set(playerId, {
    ...status,
    fitness: newFitness,
  });
  return nextStatuses;
}

export function getStartingCondition(
  statuses: Map<string, SeasonPlayerStatus>,
  playerId: string,
): number {
  const status = statuses.get(playerId);
  if (!status) return 95;
  return Math.max(40, Math.min(100, status.fitness));
}

export function tickRecovery(currentStatuses: Map<string, SeasonPlayerStatus>): Map<string, SeasonPlayerStatus> {
  const nextStatuses = new Map<string, SeasonPlayerStatus>();

  for (const [playerId, status] of currentStatuses.entries()) {
    const nextStatus: SeasonPlayerStatus = {
      ...status,
      suspensionMatchesRemaining: Math.max(0, status.suspensionMatchesRemaining - 1),
      yellowCardSuspensionMatchesRemaining: Math.max(0, status.yellowCardSuspensionMatchesRemaining - 1),
      injuryMatchesRemaining: Math.max(0, status.injuryMatchesRemaining - 1),
      fitness: Math.min(100, status.fitness + 10),
      status: status.status,
    };

    nextStatus.status = deriveStatus(nextStatus);
    nextStatuses.set(playerId, nextStatus);
  }

  return nextStatuses;
}

export function tickRecoveryByMatches(
  currentStatuses: Map<string, SeasonPlayerStatus>,
  ticks: number,
): Map<string, SeasonPlayerStatus> {
  let nextStatuses = new Map(currentStatuses);
  for (let i = 0; i < Math.max(0, ticks); i++) {
    nextStatuses = tickRecovery(nextStatuses);
  }
  return nextStatuses;
}

export function resetYellowCards(
  currentStatuses: Map<string, SeasonPlayerStatus>,
): Map<string, SeasonPlayerStatus> {
  const nextStatuses = new Map<string, SeasonPlayerStatus>();
  for (const [playerId, status] of currentStatuses.entries()) {
    nextStatuses.set(playerId, {
      ...status,
      yellowCards: 0,
      yellowCardSuspensionMatchesRemaining: 0,
    });
  }
  return nextStatuses;
}

export function getAvailableSquad(players: Player[], statuses: Map<string, SeasonPlayerStatus>): SeasonSquadAvailability {
  const available: Player[] = [];
  const doubtful: Player[] = [];
  const unavailable: Player[] = [];

  for (const player of players) {
    const status = statuses.get(player.id);
    if (!status || status.status === "available") {
      available.push(player);
      continue;
    }

    if (status.status === "doubtful") {
      doubtful.push(player);
      continue;
    }

    unavailable.push(player);
  }

  return { available, doubtful, unavailable };
}
