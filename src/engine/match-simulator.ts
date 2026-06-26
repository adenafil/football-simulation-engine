import type { Player } from "../domain/player";
import type { Club } from "../domain/club";
import type { Manager } from "../domain/manager";
import type { Tactic } from "../domain/tactic";
import type {
  InjuryEvent,
  InjuryAvailabilityConsequence,
  MatchContext,
  MatchAvailabilityConsequences,
  MatchResult,
  MatchStats,
  PlayerMatchStats,
  PlayerRating,
  PossessionEvent,
  PossessionParticipants,
  SubstitutionEvent,
  SuspensionConsequence,
} from "../domain/match-context";
import type { RoleDefinition } from "./role-weights";
import { computeTeamPhaseScores, computeGoalkeeperPhaseScores, computeMatchPlayerRating, type PhaseScores } from "./ratings";
import { simulatePossession, getPossessionShare } from "./possession-engine";
import { getStaminaDrainMultiplier } from "./tactic-modifiers";
import { defaultCompetitionRules, type CompetitionRules } from "./competition-rules";
import {
  getScorelineState,
  getTimePhase,
  getScorelineModifier,
  getTimePhaseModifier,
  getManagerBiasOverlay,
  getMomentumModifier,
  createMomentumState,
  triggerGoalMomentum,
  mergeOverlays,
  clampOverlay,
  getEffectivePhaseScores,
} from "./match-state";
import { incrementStat, selectPossessionParticipants } from "./player-involvement";

export interface LineupPlayer {
  player: Player;
  role: RoleDefinition;
  position: string;
}

export interface TeamSetup {
  club: Club;
  manager: Manager;
  tactic: Tactic;
  outfield: LineupPlayer[];
  goalkeeper: LineupPlayer;
  bench: LineupPlayer[];
  competitionRules?: CompetitionRules;
}

interface ActivePlayerState {
  lineup: LineupPlayer;
  currentCondition: number;
  minutesOnPitch: number;
  entryMinute: number;
  injuryLevel: 0 | 1 | 2;
}

interface BenchState {
  lineup: LineupPlayer;
  used: boolean;
}

interface TeamMatchState {
  club: Club;
  manager: Manager;
  tactic: Tactic;
  goalkeeper: LineupPlayer;
  activeOutfield: ActivePlayerState[];
  bench: BenchState[];
  substitutionsUsed: number;
  phaseScores: PhaseScores;
  gkPhaseScores: PhaseScores;
}

interface PlayerMatchAccumulator extends PlayerMatchStats {
  player: Player;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTeamMatchState(team: TeamSetup): TeamMatchState {
  const outfieldPlayers: ActivePlayerState[] = team.outfield.map(lp => ({
    lineup: lp,
    currentCondition: 95,
    minutesOnPitch: 0,
    entryMinute: 0,
    injuryLevel: 0,
  }));

  const benchPlayers: BenchState[] = team.bench.map(lp => ({
    lineup: lp,
    used: false,
  }));

  const phaseScores = computeTeamPhaseScores(
    team.outfield.map(lp => ({ player: lp.player, role: lp.role })),
    team.tactic,
    95, 85,
  );

  const gkPhaseScores = computeGoalkeeperPhaseScores(team.goalkeeper.player);
  phaseScores.defensiveSolidity += gkPhaseScores.defensiveSolidity;
  phaseScores.aerial += gkPhaseScores.aerial;

  return {
    club: team.club,
    manager: team.manager,
    tactic: team.tactic,
    goalkeeper: team.goalkeeper,
    activeOutfield: outfieldPlayers,
    bench: benchPlayers,
    substitutionsUsed: 0,
    phaseScores,
    gkPhaseScores,
  };
}

function getAverageCondition(state: TeamMatchState): number {
  const total = state.activeOutfield.reduce((sum, ap) => sum + ap.currentCondition, 0);
  return total / state.activeOutfield.length;
}

function getActivePlayersForPhaseCalc(state: TeamMatchState): { player: Player; role: RoleDefinition }[] {
  return state.activeOutfield.map(ap => ({
    player: ap.lineup.player,
    role: ap.lineup.role,
  }));
}

function recomputeTeamPhase(state: TeamMatchState): void {
  const phaseScores = computeTeamPhaseScores(
    getActivePlayersForPhaseCalc(state),
    state.tactic,
    getAverageCondition(state),
    80,
  );
  phaseScores.defensiveSolidity += state.gkPhaseScores.defensiveSolidity;
  phaseScores.aerial += state.gkPhaseScores.aerial;
  state.phaseScores = phaseScores;
}

function updateActivePlayerConditions(state: TeamMatchState, staminaDrain: number, minute: number): void {
  for (const ap of state.activeOutfield) {
    ap.minutesOnPitch = minute - ap.entryMinute;
    const minsPlayed = ap.minutesOnPitch;
    const baseDrop = (minsPlayed / 90) * 25 * staminaDrain;
    ap.currentCondition = Math.max(40, 95 - baseDrop);
  }
}

function updateGoalkeeperCondition(gk: LineupPlayer, minute: number): number {
  return Math.max(70, 95 - (minute / 90) * 5);
}

function createInitialPlayerMatchStats(player: Player, team: "home" | "away"): PlayerMatchAccumulator {
  return {
    player,
    playerId: player.id,
    name: player.name,
    team,
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnTarget: 0,
    keyPasses: 0,
    passesCompleted: 0,
    tackles: 0,
    interceptions: 0,
    foulsCommitted: 0,
    yellowCards: 0,
    redCards: 0,
  };
}

function initializePlayerStats(home: TeamSetup, away: TeamSetup): Map<string, PlayerMatchAccumulator> {
  const stats = new Map<string, PlayerMatchAccumulator>();
  const addTeam = (team: TeamSetup, side: "home" | "away") => {
    for (const lineupPlayer of [team.goalkeeper, ...team.outfield, ...team.bench]) {
      if (!stats.has(lineupPlayer.player.id)) {
        stats.set(lineupPlayer.player.id, createInitialPlayerMatchStats(lineupPlayer.player, side));
      }
    }
  };

  addTeam(home, "home");
  addTeam(away, "away");
  return stats;
}

function recordPossessionStats(
  playerStats: Map<string, PlayerMatchAccumulator>,
  participants: PossessionParticipants,
  outcome: ReturnType<typeof simulatePossession>,
): void {
  if (["progression", "finalThird", "shot", "goal"].includes(outcome.attackingPhase)) {
    incrementStat(playerStats, participants.buildUpPlayerId, "passesCompleted");
  }

  if (["finalThird", "shot", "goal"].includes(outcome.attackingPhase)) {
    incrementStat(playerStats, participants.progressionPlayerId, "passesCompleted");
  }

  if (outcome.shot) {
    incrementStat(playerStats, participants.creatorPlayerId, "keyPasses");
    incrementStat(playerStats, participants.shooterPlayerId, "shots");
  }

  if (outcome.shotOnTarget) {
    incrementStat(playerStats, participants.shooterPlayerId, "shotsOnTarget");
  }

  if (outcome.goal) {
    incrementStat(playerStats, participants.shooterPlayerId, "goals");
    if (participants.assisterPlayerId && participants.assisterPlayerId !== participants.shooterPlayerId) {
      incrementStat(playerStats, participants.assisterPlayerId, "assists");
    }
  }

  if (!outcome.goal && !outcome.shot && outcome.foul) {
    incrementStat(playerStats, participants.defenderPlayerId, "foulsCommitted");
  }

  if (outcome.yellowCard) {
    incrementStat(playerStats, participants.defenderPlayerId, "yellowCards");
  }

  if (outcome.redCard) {
    incrementStat(playerStats, participants.defenderPlayerId, "redCards");
  }

  if (outcome.attackingPhase === "progression" && !outcome.shot) {
    incrementStat(playerStats, participants.defenderPlayerId, "interceptions");
  }

  if (outcome.attackingPhase === "finalThird" && !outcome.shot) {
    incrementStat(playerStats, participants.defenderPlayerId, "tackles");
  }
}

function applyRedCardImpact(
  state: TeamMatchState,
  playerStats: Map<string, PlayerMatchAccumulator>,
  playerId: string | undefined,
  minute: number,
): void {
  if (!playerId) return;
  const playerIndex = state.activeOutfield.findIndex(playerState => playerState.lineup.player.id === playerId);
  if (playerIndex === -1) return;

  const [dismissedPlayer] = state.activeOutfield.splice(playerIndex, 1);
  if (!dismissedPlayer) return;

  recordSubstitutedPlayerMinutes(playerStats, dismissedPlayer, minute);
  recomputeTeamPhase(state);
}

function updateMinutesPlayed(
  playerStats: Map<string, PlayerMatchAccumulator>,
  state: TeamMatchState,
  totalMinutes: number,
): void {
  for (const playerState of state.activeOutfield) {
    const minutesPlayed = playerState.entryMinute === 0 ? totalMinutes : totalMinutes - playerState.entryMinute;
    const stats = playerStats.get(playerState.lineup.player.id);
    if (stats) stats.minutesPlayed = Math.max(stats.minutesPlayed, Math.min(minutesPlayed, totalMinutes));
  }

  const goalkeeperStats = playerStats.get(state.goalkeeper.player.id);
  if (goalkeeperStats) {
    goalkeeperStats.minutesPlayed = totalMinutes;
  }

  for (const benchPlayer of state.bench) {
    if (!benchPlayer.used) continue;
    const stats = playerStats.get(benchPlayer.lineup.player.id);
    if (stats && stats.minutesPlayed === 0) {
      stats.minutesPlayed = Math.max(1, totalMinutes - 55);
    }
  }
}

function recordSubstitutedPlayerMinutes(
  playerStats: Map<string, PlayerMatchAccumulator>,
  playerOut: ActivePlayerState,
  minute: number,
): void {
  const stats = playerStats.get(playerOut.lineup.player.id);
  if (!stats) return;
  stats.minutesPlayed = Math.max(stats.minutesPlayed, Math.max(1, minute - playerOut.entryMinute));
}

function getInjuryChance(playerState: ActivePlayerState, minute: number): number {
  const player = playerState.lineup.player;
  const fatigueLoad = Math.max(0, (95 - playerState.currentCondition) / 100);
  const minuteLoad = Math.max(0, (minute - 35) / 90);
  const proneness = player.injuryProneness / 100;
  const staminaRisk = Math.max(0, (70 - player.attributes.physical.stamina) / 200);
  return Math.min(0.018, 0.0008 + fatigueLoad * 0.01 + minuteLoad * 0.003 + proneness * 0.003 + staminaRisk * 0.002);
}

function pickInjuredPlayer(state: TeamMatchState, minute: number): ActivePlayerState | null {
  const candidates = state.activeOutfield.filter(playerState => playerState.injuryLevel < 2);
  for (const playerState of candidates) {
    if (Math.random() < getInjuryChance(playerState, minute)) {
      return playerState;
    }
  }
  return null;
}

function resolveInjurySeverity(playerState: ActivePlayerState): "minor" | "moderate" | "severe" {
  const roll = Math.random();
  const pronenessBias = playerState.lineup.player.injuryProneness / 500;
  if (roll + pronenessBias > 0.9) return "severe";
  if (roll + pronenessBias > 0.55) return "moderate";
  return "minor";
}

function applyInjuryConditionPenalty(playerState: ActivePlayerState, severity: "minor" | "moderate" | "severe"): void {
  if (severity === "minor") {
    playerState.currentCondition = Math.max(55, playerState.currentCondition - 12);
    playerState.injuryLevel = 1;
    return;
  }

  if (severity === "moderate") {
    playerState.currentCondition = Math.max(45, playerState.currentCondition - 24);
    playerState.injuryLevel = 2;
    return;
  }

  playerState.currentCondition = Math.max(40, playerState.currentCondition - 32);
  playerState.injuryLevel = 2;
}

function applyForcedInjurySubstitution(
  state: TeamMatchState,
  playerStats: Map<string, PlayerMatchAccumulator>,
  playerOut: ActivePlayerState,
  minute: number,
  scoreDiff: number,
  team: "home" | "away",
  rules: CompetitionRules,
): { subEvent: SubstitutionEvent; replacementName: string; replacementId: string } | null {
  if (state.substitutionsUsed >= rules.match.maxSubstitutions) return null;

  const replacement = pickBenchReplacement(state, playerOut, scoreDiff);
  if (!replacement) return null;

  recordSubstitutedPlayerMinutes(playerStats, playerOut, minute);
  const subEvent = applySubstitution(state, playerOut, replacement, minute, scoreDiff);
  subEvent.team = team;

  return {
    subEvent,
    replacementName: replacement.lineup.player.name,
    replacementId: replacement.lineup.player.id,
  };
}

function getInjuryAvailability(severity: "minor" | "moderate" | "severe"): Omit<InjuryAvailabilityConsequence, "playerId" | "playerName" | "team" | "severity"> {
  if (severity === "minor") {
    return { expectedMatchesOut: 0, status: "available" };
  }

  if (severity === "moderate") {
    return { expectedMatchesOut: 2, status: "doubtful" };
  }

  return { expectedMatchesOut: 5, status: "unavailable" };
}

function buildAvailabilityConsequences(
  playerStats: Map<string, PlayerMatchAccumulator>,
  injuries: InjuryEvent[],
): MatchAvailabilityConsequences {
  const suspensions: SuspensionConsequence[] = [];
  const injuryConsequences: InjuryAvailabilityConsequence[] = [];

  for (const stats of playerStats.values()) {
    if (stats.redCards > 0) {
      suspensions.push({
        playerId: stats.playerId,
        playerName: stats.name,
        team: stats.team,
        reason: "red-card",
        matches: 1,
      });
    }
  }

  for (const injury of injuries) {
    const availability = getInjuryAvailability(injury.severity);
    if (availability.expectedMatchesOut === 0 && availability.status === "available") {
      continue;
    }

    injuryConsequences.push({
      playerId: injury.playerId,
      playerName: injury.playerName,
      team: injury.team,
      severity: injury.severity,
      expectedMatchesOut: availability.expectedMatchesOut,
      status: availability.status,
    });
  }

  return {
    suspensions,
    injuries: injuryConsequences,
  };
}

const HIGH_FATIGUE_ROLES = new Set([
  "Wing-Back", "Complete Wing-Back", "Wide Midfielder",
  "Winger", "Racing Winger", "Inside Forward", "Inside Winger",
  "Box-to-Box Midfielder", "Mezzala",
  "Pressing Forward", "Channel Forward", "Wide Forward",
]);

function getRoleFatiguePriority(roleName: string): number {
  if (HIGH_FATIGUE_ROLES.has(roleName)) return 1.3;
  return 1.0;
}

function pickPlayerToSubOut(state: TeamMatchState, minute: number, scoreDiff: number): ActivePlayerState | null {
  const candidates = state.activeOutfield.filter(ap => {
    if (ap.minutesOnPitch < 40) return false;
    const fatiguePriority = getRoleFatiguePriority(ap.lineup.role.name);
    const fatigueScore = (100 - ap.currentCondition) * fatiguePriority;
    return fatigueScore > 15;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const fatigueA = (100 - a.currentCondition) * getRoleFatiguePriority(a.lineup.role.name);
    const fatigueB = (100 - b.currentCondition) * getRoleFatiguePriority(b.lineup.role.name);
    if (Math.abs(fatigueA - fatigueB) < 5) {
      if (scoreDiff < 0) {
        const aOffensive = a.lineup.role.phaseWeights.finalThird + a.lineup.role.phaseWeights.finishing;
        const bOffensive = b.lineup.role.phaseWeights.finalThird + b.lineup.role.phaseWeights.finishing;
        return aOffensive - bOffensive;
      }
      if (scoreDiff > 0) {
        const aDefensive = a.lineup.role.phaseWeights.defensiveSolidity;
        const bDefensive = b.lineup.role.phaseWeights.defensiveSolidity;
        return bDefensive - aDefensive;
      }
    }
    return fatigueB - fatigueA;
  });

  return candidates[0] ?? null;
}

function pickBenchReplacement(
  state: TeamMatchState,
  playerOut: ActivePlayerState,
  scoreDiff: number,
): BenchState | null {
  const pos = playerOut.lineup.position;
  const role = playerOut.lineup.role;

  const posCompatMap: Record<string, string[]> = {
    CB: ["CB", "DM"],
    LB: ["LB", "LWB", "RB"],
    RB: ["RB", "RWB", "LB"],
    LWB: ["LWB", "LB", "LM"],
    RWB: ["RWB", "RB", "RM"],
    DM: ["DM", "CM", "CB"],
    CM: ["CM", "DM", "AMC"],
    LM: ["LM", "AML", "RM"],
    RM: ["RM", "AMR", "LM"],
    AML: ["AML", "LM", "ST"],
    AMC: ["AMC", "CM", "ST"],
    AMR: ["AMR", "RM", "ST"],
    ST: ["ST", "CF", "AML", "AMR"],
  };

  const compatPositions = posCompatMap[pos] ?? [pos];

  const available = state.bench.filter(b => !b.used);

  if (available.length === 0) return null;

  const scorediff = scoreDiff ?? 0;
  const isLosing = scorediff < 0;
  const isWinning = scorediff > 0;

  const scored = available.map(b => {
    let score = 0;
    const playerPositions = b.lineup.player.positions;

    const exactMatch = playerPositions.some(p => p === pos || compatPositions.includes(p));
    if (exactMatch) score += 30;

    const roleSuit = b.lineup.player.roleSuitability[b.lineup.role.name] ?? 50;
    score += roleSuit;

    if (isLosing) {
      score += (b.lineup.role.phaseWeights.finalThird + b.lineup.role.phaseWeights.finishing) * 10;
    }
    if (isWinning) {
      score += b.lineup.role.phaseWeights.defensiveSolidity * 10;
    }

    return { bench: b, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.bench;
}

function shouldAttemptSubstitution(state: TeamMatchState, minute: number, rules: CompetitionRules): boolean {
  if (state.substitutionsUsed >= rules.match.maxSubstitutions) return false;
  if (minute < 50) return false;

  if (minute >= 50 && minute < 60) return state.substitutionsUsed < 1;
  if (minute >= 60 && minute < 70) return state.substitutionsUsed < 3;
  if (minute >= 70 && minute < 80) return state.substitutionsUsed < 4;
  if (minute >= 80) return state.substitutionsUsed < rules.match.maxSubstitutions;

  return true;
}

function applySubstitution(
  state: TeamMatchState,
  playerOut: ActivePlayerState,
  replacement: BenchState,
  minute: number,
  scoreDiff: number,
): SubstitutionEvent {
  let reason: "fatigue" | "chasing-goal" | "protect-lead" = "fatigue";

  if (scoreDiff < 0 && minute > 65) {
    reason = "chasing-goal";
  } else if (scoreDiff > 0 && minute > 75) {
    reason = "protect-lead";
  }

  const newActive: ActivePlayerState = {
    lineup: replacement.lineup,
    currentCondition: 95,
    minutesOnPitch: 0,
    entryMinute: minute,
    injuryLevel: 0,
  };

  const idx = state.activeOutfield.indexOf(playerOut);
  if (idx !== -1) {
    state.activeOutfield[idx] = newActive;
  }

  replacement.used = true;
  state.substitutionsUsed++;

  recomputeTeamPhase(state);

  const subEvent: SubstitutionEvent = {
    minute,
    team: "home",
    playerOutId: playerOut.lineup.player.id,
    playerOutName: playerOut.lineup.player.name,
    playerInId: replacement.lineup.player.id,
    playerInName: replacement.lineup.player.name,
    reason,
  };

  return subEvent;
}

function getScoreDiff(homeScore: number, awayScore: number, isHome: boolean): number {
  return isHome ? homeScore - awayScore : awayScore - homeScore;
}

export function simulateMatch(home: TeamSetup, away: TeamSetup, context: MatchContext): MatchResult {
  const rules = home.competitionRules ?? away.competitionRules ?? defaultCompetitionRules;
  const homeState = createTeamMatchState(home);
  const awayState = createTeamMatchState(away);
  const playerStats = initializePlayerStats(home, away);

  const homeAdvantage = context.venueType === "home" ? home.club.homeAdvantage
    : context.venueType === "away" ? -home.club.homeAdvantage * 0.3 : 0;

  const homeStaminaDrain = getStaminaDrainMultiplier(home.tactic.pressing);
  const awayStaminaDrain = getStaminaDrainMultiplier(away.tactic.pressing);

  let homeScore = 0;
  let awayScore = 0;

  const stats: MatchStats = {
    possession: { home: 0, away: 0 },
    shots: { home: 0, away: 0 },
    shotsOnTarget: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    yellowCards: { home: 0, away: 0 },
    redCards: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    xG: { home: 0, away: 0 },
  };

  const events: PossessionEvent[] = [];
  const allSubstitutions: SubstitutionEvent[] = [];
  const allInjuries: InjuryEvent[] = [];

  let homePosCount = 0;
  let awayPosCount = 0;

  const totalMinutes = 90 + Math.floor(Math.random() * 5);
  const subCheckMinutes = [50, 55, 60, 65, 70, 75, 80, 83];

  const momentum = createMomentumState();

  for (let minute = 1; minute <= totalMinutes; minute++) {
    const avgHomeCondition = getAverageCondition(homeState);
    const avgAwayCondition = getAverageCondition(awayState);

    const homeScorelineState = getScorelineState(homeScore, awayScore, true);
    const awayScorelineState = getScorelineState(homeScore, awayScore, false);
    const timePhase = getTimePhase(minute);

    const homeScorelineMod = getScorelineModifier(homeScorelineState, timePhase);
    const awayScorelineMod = getScorelineModifier(awayScorelineState, timePhase);
    const timeMod = getTimePhaseModifier(timePhase);
    const homeManagerMod = getManagerBiasOverlay(homeState.manager);
    const awayManagerMod = getManagerBiasOverlay(awayState.manager);
    const homeMomentumMod = getMomentumModifier(momentum, true, minute);
    const awayMomentumMod = getMomentumModifier(momentum, false, minute);

    const homeOverlay = clampOverlay(mergeOverlays(homeScorelineMod, timeMod, homeManagerMod, homeMomentumMod));
    const awayOverlay = clampOverlay(mergeOverlays(awayScorelineMod, timeMod, awayManagerMod, awayMomentumMod));

    const effectiveHomeScores = getEffectivePhaseScores(homeState.phaseScores, homeOverlay);
    const effectiveAwayScores = getEffectivePhaseScores(awayState.phaseScores, awayOverlay);

    const effectivePossessionShare = getPossessionShare(effectiveHomeScores, effectiveAwayScores, homeAdvantage);

    const isHomeAttacking = Math.random() < effectivePossessionShare + (avgHomeCondition - avgAwayCondition) * 0.001;

    if (isHomeAttacking) homePosCount++;
    else awayPosCount++;

    const participants = selectPossessionParticipants({
      attackingState: isHomeAttacking ? homeState : awayState,
      defendingState: isHomeAttacking ? awayState : homeState,
    });

    const outcome = simulatePossession({
      phaseScores: { home: effectiveHomeScores, away: effectiveAwayScores },
      tactics: { home: home.tactic, away: away.tactic },
      managers: { home: home.manager, away: away.manager },
      isHomeAttacking,
      minute,
      homeStamina: avgHomeCondition,
      awayStamina: avgAwayCondition,
    });

    recordPossessionStats(playerStats, participants, outcome);

    if (outcome.shot) {
      if (isHomeAttacking) stats.shots.home++;
      else stats.shots.away++;
    }

    if (outcome.shotOnTarget) {
      if (isHomeAttacking) stats.shotsOnTarget.home++;
      else stats.shotsOnTarget.away++;
    }

    if (outcome.goal) {
      const scoringTeam = isHomeAttacking ? "home" as const : "away" as const;
      const scorerId = participants.shooterPlayerId;
      const scorerName = scorerId
        ? playerStats.get(scorerId)?.name ?? "Unknown"
        : "Unknown";

      if (isHomeAttacking) {
        homeScore++;
      } else {
        awayScore++;
      }

      triggerGoalMomentum(momentum, scoringTeam, minute);

      events.push({
        minute,
        team: scoringTeam,
        phase: "goal",
        description: `${minute}' GOAL! ${scorerName} scores! (${homeScore}-${awayScore})`,
        participants,
      });
    } else if (outcome.shotOnTarget) {
      events.push({
        minute,
        team: isHomeAttacking ? "home" : "away",
        phase: "shot",
        description: `${minute}' ${isHomeAttacking ? "Home" : "Away"} shot saved (${Math.round(outcome.xG * 100)}% xG)`,
        participants,
      });
    }

    if (outcome.corner) {
      if (isHomeAttacking) stats.corners.home++;
      else stats.corners.away++;
    }

    if (outcome.foul) {
      if (isHomeAttacking) stats.fouls.home++;
      else stats.fouls.away++;
    }

    if (outcome.yellowCard) {
      if (isHomeAttacking) stats.yellowCards.home++;
      else stats.yellowCards.away++;
    }

    if (outcome.redCard) {
      if (isHomeAttacking) stats.redCards.home++;
      else stats.redCards.away++;

      applyRedCardImpact(
        isHomeAttacking ? homeState : awayState,
        playerStats,
        participants.shooterPlayerId,
        minute,
      );
      applyRedCardImpact(
        isHomeAttacking ? awayState : homeState,
        playerStats,
        participants.defenderPlayerId,
        minute,
      );
    }

    if (outcome.offside) {
      if (isHomeAttacking) stats.offsides.home++;
      else stats.offsides.away++;
    }

    if (outcome.xG > 0) {
      if (isHomeAttacking) stats.xG.home += outcome.xG;
      else stats.xG.away += outcome.xG;
    }

    updateActivePlayerConditions(homeState, homeStaminaDrain, minute);
    updateActivePlayerConditions(awayState, awayStaminaDrain, minute);

    updateGoalkeeperCondition(home.goalkeeper, minute);
    updateGoalkeeperCondition(away.goalkeeper, minute);

    for (const injuryCase of [
      { state: homeState, team: "home" as const, scoreDiff: homeScore - awayScore },
      { state: awayState, team: "away" as const, scoreDiff: awayScore - homeScore },
    ]) {
      const injuredPlayer = pickInjuredPlayer(injuryCase.state, minute);
      if (!injuredPlayer) continue;

      const severity = resolveInjurySeverity(injuredPlayer);
      applyInjuryConditionPenalty(injuredPlayer, severity);

      let forcedSubstitution = false;
      let replacementPlayerId: string | undefined;
      let replacementPlayerName: string | undefined;

      if (severity !== "minor") {
          const forcedSub = applyForcedInjurySubstitution(
            injuryCase.state,
            playerStats,
            injuredPlayer,
            minute,
            injuryCase.scoreDiff,
            injuryCase.team,
            rules,
          );

        if (forcedSub) {
          forcedSubstitution = true;
          replacementPlayerId = forcedSub.replacementId;
          replacementPlayerName = forcedSub.replacementName;
          allSubstitutions.push(forcedSub.subEvent);
          events.push({
            minute,
            team: injuryCase.team,
            phase: "substitution",
            description: `${minute}' Forced substitution: ${forcedSub.subEvent.playerOutName} off injured, ${forcedSub.subEvent.playerInName} on`,
          });
        }
      }

      const injuryEvent: InjuryEvent = {
        minute,
        team: injuryCase.team,
        playerId: injuredPlayer.lineup.player.id,
        playerName: injuredPlayer.lineup.player.name,
        severity,
        forcedSubstitution,
        replacementPlayerId,
        replacementPlayerName,
      };

      allInjuries.push(injuryEvent);
      events.push({
        minute,
        team: injuryCase.team,
        phase: "injury",
        description: forcedSubstitution
          ? `${minute}' Injury: ${injuredPlayer.lineup.player.name} goes off (${severity})`
          : `${minute}' Injury concern: ${injuredPlayer.lineup.player.name} continues (${severity})`,
      });
    }

    if (subCheckMinutes.includes(minute)) {
      const homeScoreDiff = homeScore - awayScore;
      const awayScoreDiff = awayScore - homeScore;

      if (shouldAttemptSubstitution(homeState, minute, rules)) {
        const playerOut = pickPlayerToSubOut(homeState, minute, homeScoreDiff);
        if (playerOut) {
          const replacement = pickBenchReplacement(homeState, playerOut, homeScoreDiff);
          if (replacement) {
            recordSubstitutedPlayerMinutes(playerStats, playerOut, minute);
            const subEvent = applySubstitution(homeState, playerOut, replacement, minute, homeScoreDiff);
            subEvent.team = "home";
            allSubstitutions.push(subEvent);
            events.push({
              minute,
              team: "home",
              phase: "substitution",
              description: `${minute}' Substitution: ${subEvent.playerOutName} off, ${subEvent.playerInName} on (${subEvent.reason})`,
            });
          }
        }
      }

      if (shouldAttemptSubstitution(awayState, minute, rules)) {
        const playerOut = pickPlayerToSubOut(awayState, minute, awayScoreDiff);
        if (playerOut) {
          const replacement = pickBenchReplacement(awayState, playerOut, awayScoreDiff);
          if (replacement) {
            recordSubstitutedPlayerMinutes(playerStats, playerOut, minute);
            const subEvent = applySubstitution(awayState, playerOut, replacement, minute, awayScoreDiff);
            subEvent.team = "away";
            allSubstitutions.push(subEvent);
            events.push({
              minute,
              team: "away",
              phase: "substitution",
              description: `${minute}' Substitution: ${subEvent.playerOutName} off, ${subEvent.playerInName} on (${subEvent.reason})`,
            });
          }
        }
      }
    }
  }

  stats.possession.home = Math.round((homePosCount / (homePosCount + awayPosCount)) * 100);
  stats.possession.away = 100 - stats.possession.home;

  updateMinutesPlayed(playerStats, homeState, totalMinutes);
  updateMinutesPlayed(playerStats, awayState, totalMinutes);

  const playerMatchStats = Array.from(playerStats.values())
    .filter(statsEntry => statsEntry.minutesPlayed > 0)
    .map(({ player, ...statsEntry }) => statsEntry)
    .sort((a, b) => b.minutesPlayed - a.minutesPlayed || b.goals - a.goals);

  const playerRatings: PlayerRating[] = Array.from(playerStats.values())
    .filter(statsEntry => statsEntry.minutesPlayed > 0)
    .map(statsEntry => {
      const didWin = statsEntry.team === "home" ? homeScore > awayScore : awayScore > homeScore;
      const keptCleanSheet = statsEntry.team === "home" ? awayScore === 0 : homeScore === 0;
      return {
        playerId: statsEntry.playerId,
        name: statsEntry.name,
        rating: computeMatchPlayerRating(statsEntry.player, statsEntry, didWin, keptCleanSheet),
        goals: statsEntry.goals,
        assists: statsEntry.assists,
        keyPasses: statsEntry.keyPasses,
        tackles: statsEntry.tackles,
        interceptions: statsEntry.interceptions,
        passesCompleted: statsEntry.passesCompleted,
        shots: statsEntry.shots,
        shotsOnTarget: statsEntry.shotsOnTarget,
        minutesPlayed: statsEntry.minutesPlayed,
      };
    });

  const manOfMatch = [...playerRatings].sort((a, b) => b.rating - a.rating)[0]?.name ?? "Unknown";
  const availability = buildAvailabilityConsequences(playerStats, allInjuries);

  return {
    homeTeamId: home.club.id,
    awayTeamId: away.club.id,
    homeTeamName: home.club.name,
    awayTeamName: away.club.name,
    homeScore,
    awayScore,
    events,
    stats,
    playerMatchStats,
    playerRatings,
    manOfMatch,
    homeFormation: home.tactic.formation,
    awayFormation: away.tactic.formation,
    substitutions: allSubstitutions,
    injuries: allInjuries,
    availability,
  };
}
