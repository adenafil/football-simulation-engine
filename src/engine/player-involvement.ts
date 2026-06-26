import type { PlayerMatchStats, PossessionParticipants } from "../domain/match-context";
import type { Player } from "../domain/player";
import type { LineupPlayer } from "./match-simulator";

export interface ActiveParticipantState {
  lineup: LineupPlayer;
  currentCondition: number;
}

export interface TeamParticipantState {
  activeOutfield: ActiveParticipantState[];
}

export interface PossessionSelectionContext {
  attackingState: TeamParticipantState;
  defendingState: TeamParticipantState;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function getPositionBias(position: string, allowed: string[]): number {
  if (allowed.includes(position)) return 1.25;
  if (position.startsWith("AM") && allowed.includes("AML")) return 1.1;
  return 1;
}

function getConditionFactor(condition: number): number {
  return clamp(condition / 100, 0.55, 1.05);
}

function weightedPick<T>(items: T[], scorer: (item: T) => number): T | null {
  if (items.length === 0) return null;

  const scored = items.map(item => ({ item, score: Math.max(0.01, scorer(item)) }));
  const total = scored.reduce((sum, entry) => sum + entry.score, 0);
  let roll = Math.random() * total;

  for (const entry of scored) {
    roll -= entry.score;
    if (roll <= 0) return entry.item;
  }

  return scored[scored.length - 1]?.item ?? null;
}

function pickFromActivePlayers(
  state: TeamParticipantState,
  positions: string[],
  selector: (playerState: ActiveParticipantState) => number,
  excludedIds: string[] = [],
): ActiveParticipantState | null {
  const excluded = new Set(excludedIds);
  const candidates = state.activeOutfield.filter(playerState => !excluded.has(playerState.lineup.player.id));
  return weightedPick(candidates, playerState => {
    const player = playerState.lineup.player;
    const tech = player.attributes.technical;
    const mental = player.attributes.mental;
    const physical = player.attributes.physical;
    const roleSuitability = player.roleSuitability[playerState.lineup.role.name] ?? 60;
    const positionBias = getPositionBias(playerState.lineup.position, positions);
    const roleBias = 0.8 + (
      playerState.lineup.role.phaseWeights.buildUp +
      playerState.lineup.role.phaseWeights.progression +
      playerState.lineup.role.phaseWeights.finalThird +
      playerState.lineup.role.phaseWeights.finishing
    ) * 0.2;

    return selector(playerState)
      * (roleSuitability / 100)
      * positionBias
      * roleBias
      * getConditionFactor(playerState.currentCondition)
      * (1 + (tech.technique + mental.decisions + physical.stamina) / 600);
  });
}

export function pickBuildUpActor(state: TeamParticipantState): ActiveParticipantState | null {
  return pickFromActivePlayers(state, ["CB", "DM", "LB", "RB", "CM"], playerState => {
    const player = playerState.lineup.player;
    return player.attributes.technical.passing * 0.3
      + player.attributes.technical.firstTouch * 0.2
      + player.attributes.mental.composure * 0.2
      + player.attributes.mental.decisions * 0.15
      + player.attributes.technical.technique * 0.15;
  });
}

export function pickProgressionActor(state: TeamParticipantState, buildUpActorId?: string): ActiveParticipantState | null {
  return pickFromActivePlayers(state, ["CM", "LM", "RM", "AML", "AMR", "LWB", "RWB", "AMC"], playerState => {
    const player = playerState.lineup.player;
    return player.attributes.technical.dribbling * 0.22
      + player.attributes.technical.passing * 0.2
      + player.attributes.mental.vision * 0.16
      + player.attributes.technical.technique * 0.16
      + player.attributes.physical.pace * 0.14
      + player.attributes.mental.workRate * 0.12;
  }, buildUpActorId ? [buildUpActorId] : []);
}

export function pickCreator(state: TeamParticipantState, progressionActorId?: string): ActiveParticipantState | null {
  return pickFromActivePlayers(state, ["AMC", "AML", "AMR", "LM", "RM", "ST", "CM"], playerState => {
    const player = playerState.lineup.player;
    return player.attributes.mental.vision * 0.22
      + player.attributes.mental.flair * 0.16
      + player.attributes.technical.passing * 0.22
      + player.attributes.technical.dribbling * 0.14
      + player.attributes.technical.crossing * 0.1
      + player.attributes.mental.decisions * 0.08
      + player.attributes.mental.offTheBall * 0.08;
  }, progressionActorId ? [progressionActorId] : []);
}

export function pickShooter(state: TeamParticipantState, creatorId?: string): ActiveParticipantState | null {
  return pickFromActivePlayers(state, ["ST", "CF", "AML", "AMR", "AMC"], playerState => {
    const player = playerState.lineup.player;
    return player.attributes.technical.finishing * 0.3
      + player.attributes.mental.composure * 0.2
      + player.attributes.mental.offTheBall * 0.18
      + player.attributes.mental.anticipation * 0.14
      + player.attributes.technical.technique * 0.1
      + player.attributes.technical.longShots * 0.08;
  }, creatorId ? [creatorId] : []);
}

export function pickDefender(state: TeamParticipantState): ActiveParticipantState | null {
  return pickFromActivePlayers(state, ["CB", "DM", "LB", "RB"], playerState => {
    const player = playerState.lineup.player;
    return player.attributes.technical.tackling * 0.24
      + player.attributes.technical.marking * 0.2
      + player.attributes.mental.positioning * 0.18
      + player.attributes.mental.concentration * 0.12
      + player.attributes.mental.aggression * 0.08
      + player.attributes.mental.bravery * 0.08
      + player.attributes.physical.strength * 0.1;
  });
}

export function selectPossessionParticipants(context: PossessionSelectionContext): PossessionParticipants {
  const buildUpActor = pickBuildUpActor(context.attackingState);
  const progressionActor = pickProgressionActor(context.attackingState, buildUpActor?.lineup.player.id);
  const creator = pickCreator(context.attackingState, progressionActor?.lineup.player.id ?? buildUpActor?.lineup.player.id);
  const shooter = pickShooter(context.attackingState, creator?.lineup.player.id);
  const defender = pickDefender(context.defendingState);
  const assisterId = creator && shooter && creator.lineup.player.id !== shooter.lineup.player.id
    ? creator.lineup.player.id
    : progressionActor?.lineup.player.id;

  return {
    buildUpPlayerId: buildUpActor?.lineup.player.id,
    progressionPlayerId: progressionActor?.lineup.player.id,
    creatorPlayerId: creator?.lineup.player.id,
    shooterPlayerId: shooter?.lineup.player.id ?? creator?.lineup.player.id ?? buildUpActor?.lineup.player.id,
    assisterPlayerId: assisterId,
    defenderPlayerId: defender?.lineup.player.id,
  };
}

export function incrementStat(
  playerStats: Map<string, PlayerMatchStats & { player?: Player }>,
  playerId: string | undefined,
  key: keyof PlayerMatchStats,
  amount: number = 1,
): void {
  if (!playerId) return;
  const stats = playerStats.get(playerId);
  if (!stats) return;
  const currentValue = stats[key];
  if (typeof currentValue === "number") {
    (stats[key] as number) = currentValue + amount;
  }
}
