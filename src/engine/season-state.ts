import type { MatchAvailabilityConsequences } from "../domain/match-context";
import type { Player } from "../domain/player";
import { defaultCompetitionRules, type CompetitionRules } from "./competition-rules";

export type SeasonAvailabilityStatus = "available" | "doubtful" | "suspended" | "injured";

export interface SeasonPlayerStatus {
  playerId: string;
  playerName: string;
  suspensionMatchesRemaining: number;
  injuryMatchesRemaining: number;
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
  if (status.injuryMatchesRemaining > 0) {
    return status.status === "doubtful" ? "doubtful" : "injured";
  }
  if (status.status === "doubtful") return "doubtful";
  return "available";
}

export function initializeSeasonPlayerStatuses(players: Player[]): Map<string, SeasonPlayerStatus> {
  return new Map(
    players.map(player => [
      player.id,
      {
        playerId: player.id,
        playerName: getPlayerDisplayName(player),
        suspensionMatchesRemaining: 0,
        injuryMatchesRemaining: 0,
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

  for (const suspension of consequences.suspensions) {
    const current = nextStatuses.get(suspension.playerId) ?? {
      playerId: suspension.playerId,
      playerName: suspension.playerName,
      suspensionMatchesRemaining: 0,
      injuryMatchesRemaining: 0,
      status: "available" as const,
    };

    current.playerName = suspension.playerName;
    current.suspensionMatchesRemaining = Math.max(current.suspensionMatchesRemaining, suspension.matches || rules.suspensions.redCardBanMatches);
    current.status = deriveStatus(current);
    nextStatuses.set(suspension.playerId, current);
  }

  for (const injury of consequences.injuries) {
    const current = nextStatuses.get(injury.playerId) ?? {
      playerId: injury.playerId,
      playerName: injury.playerName,
      suspensionMatchesRemaining: 0,
      injuryMatchesRemaining: 0,
      status: "available" as const,
    };

    current.playerName = injury.playerName;
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
    nextStatuses.set(injury.playerId, current);
  }

  for (const status of nextStatuses.values()) {
    status.status = deriveStatus(status);
  }

  return nextStatuses;
}

export function tickRecovery(currentStatuses: Map<string, SeasonPlayerStatus>): Map<string, SeasonPlayerStatus> {
  const nextStatuses = new Map<string, SeasonPlayerStatus>();

  for (const [playerId, status] of currentStatuses.entries()) {
    const nextStatus: SeasonPlayerStatus = {
      ...status,
      suspensionMatchesRemaining: Math.max(0, status.suspensionMatchesRemaining - 1),
      injuryMatchesRemaining: Math.max(0, status.injuryMatchesRemaining - 1),
      status: status.status,
    };

    if (nextStatus.suspensionMatchesRemaining > 0) {
      nextStatus.status = "suspended";
    } else if (nextStatus.injuryMatchesRemaining > 0) {
      nextStatus.status = nextStatus.injuryMatchesRemaining === 1 ? "doubtful" : "injured";
    } else {
      nextStatus.status = "available";
    }

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
