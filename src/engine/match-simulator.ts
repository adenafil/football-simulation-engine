import type { Player } from "../domain/player";
import type { Club } from "../domain/club";
import type { Manager } from "../domain/manager";
import type { Tactic } from "../domain/tactic";
import type { MatchContext, MatchResult, MatchStats, PossessionEvent, PlayerRating, SubstitutionEvent } from "../domain/match-context";
import type { RoleDefinition } from "./role-weights";
import { computeTeamPhaseScores, computeGoalkeeperPhaseScores, type PhaseScores } from "./ratings";
import { simulatePossession, getPossessionShare } from "./possession-engine";
import { getStaminaDrainMultiplier } from "./tactic-modifiers";
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
  type MomentumState,
} from "./match-state";

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
}

interface ActivePlayerState {
  lineup: LineupPlayer;
  currentCondition: number;
  minutesOnPitch: number;
  entryMinute: number;
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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTeamMatchState(team: TeamSetup): TeamMatchState {
  const outfieldPlayers: ActivePlayerState[] = team.outfield.map(lp => ({
    lineup: lp,
    currentCondition: 95,
    minutesOnPitch: 0,
    entryMinute: 0,
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

function shouldAttemptSubstitution(state: TeamMatchState, minute: number): boolean {
  if (state.substitutionsUsed >= 5) return false;
  if (minute < 50) return false;

  if (minute >= 50 && minute < 60) return state.substitutionsUsed < 1;
  if (minute >= 60 && minute < 70) return state.substitutionsUsed < 3;
  if (minute >= 70 && minute < 80) return state.substitutionsUsed < 4;
  if (minute >= 80) return state.substitutionsUsed < 5;

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
  const homeState = createTeamMatchState(home);
  const awayState = createTeamMatchState(away);

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

  const homeScorers: Player[] = [];
  const awayScorers: Player[] = [];

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

    const outcome = simulatePossession({
      phaseScores: { home: effectiveHomeScores, away: effectiveAwayScores },
      tactics: { home: home.tactic, away: away.tactic },
      managers: { home: home.manager, away: away.manager },
      isHomeAttacking,
      minute,
      homeStamina: avgHomeCondition,
      awayStamina: avgAwayCondition,
    });

    if (outcome.shot) {
      if (isHomeAttacking) stats.shots.home++;
      else stats.shots.away++;
    }

    if (outcome.shotOnTarget) {
      if (isHomeAttacking) stats.shotsOnTarget.home++;
      else stats.shotsOnTarget.away++;
    }

    if (outcome.goal) {
      if (isHomeAttacking) {
        homeScore++;
        const activePlayers = homeState.activeOutfield;
        if (activePlayers.length > 0) {
          const scorer = activePlayers[randomInt(0, activePlayers.length - 1)]!.lineup.player;
          homeScorers.push(scorer);
        }
      } else {
        awayScore++;
        const activePlayers = awayState.activeOutfield;
        if (activePlayers.length > 0) {
          const scorer = activePlayers[randomInt(0, activePlayers.length - 1)]!.lineup.player;
          awayScorers.push(scorer);
        }
      }
      const scorerName = isHomeAttacking
        ? homeScorers[homeScorers.length - 1]?.name ?? "Unknown"
        : awayScorers[awayScorers.length - 1]?.name ?? "Unknown";
      const scoringTeam = isHomeAttacking ? "home" as const : "away" as const;
      triggerGoalMomentum(momentum, scoringTeam, minute);

      events.push({
        minute,
        team: scoringTeam,
        phase: "goal",
        description: `${minute}' GOAL! ${scorerName} scores! (${homeScore}-${awayScore})`,
      });
    } else if (outcome.shotOnTarget) {
      events.push({
        minute,
        team: isHomeAttacking ? "home" : "away",
        phase: "shot",
        description: `${minute}' ${isHomeAttacking ? "Home" : "Away"} shot saved (${Math.round(outcome.xG * 100)}% xG)`,
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

    const gkCondition = updateGoalkeeperCondition(home.goalkeeper, minute);
    updateGoalkeeperCondition(away.goalkeeper, minute);

    if (subCheckMinutes.includes(minute)) {
      const homeScoreDiff = homeScore - awayScore;
      const awayScoreDiff = awayScore - homeScore;

      if (shouldAttemptSubstitution(homeState, minute)) {
        const playerOut = pickPlayerToSubOut(homeState, minute, homeScoreDiff);
        if (playerOut) {
          const replacement = pickBenchReplacement(homeState, playerOut, homeScoreDiff);
          if (replacement) {
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

      if (shouldAttemptSubstitution(awayState, minute)) {
        const playerOut = pickPlayerToSubOut(awayState, minute, awayScoreDiff);
        if (playerOut) {
          const replacement = pickBenchReplacement(awayState, playerOut, awayScoreDiff);
          if (replacement) {
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

  const allPlayersMap = new Map<string, { player: Player; isHome: boolean; minutesPlayed: number }>();

  for (const ap of homeState.activeOutfield) {
    const id = ap.lineup.player.id;
    const mins = (ap.entryMinute === 0) ? totalMinutes : totalMinutes - ap.entryMinute;
    if (!allPlayersMap.has(id)) {
      allPlayersMap.set(id, { player: ap.lineup.player, isHome: true, minutesPlayed: Math.min(mins, totalMinutes) });
    } else {
      const existing = allPlayersMap.get(id)!;
      existing.minutesPlayed = Math.max(existing.minutesPlayed, mins);
    }
  }

  allPlayersMap.set(home.goalkeeper.player.id, {
    player: home.goalkeeper.player,
    isHome: true,
    minutesPlayed: totalMinutes,
  });

  for (const ap of awayState.activeOutfield) {
    const id = ap.lineup.player.id;
    const mins = (ap.entryMinute === 0) ? totalMinutes : totalMinutes - ap.entryMinute;
    if (!allPlayersMap.has(id)) {
      allPlayersMap.set(id, { player: ap.lineup.player, isHome: false, minutesPlayed: Math.min(mins, totalMinutes) });
    } else {
      const existing = allPlayersMap.get(id)!;
      existing.minutesPlayed = Math.max(existing.minutesPlayed, mins);
    }
  }

  allPlayersMap.set(away.goalkeeper.player.id, {
    player: away.goalkeeper.player,
    isHome: false,
    minutesPlayed: totalMinutes,
  });

  for (const b of homeState.bench) {
    if (b.used) {
      const id = b.lineup.player.id;
      if (!allPlayersMap.has(id)) {
        allPlayersMap.set(id, { player: b.lineup.player, isHome: true, minutesPlayed: totalMinutes - 55 });
      }
    }
  }

  for (const b of awayState.bench) {
    if (b.used) {
      const id = b.lineup.player.id;
      if (!allPlayersMap.has(id)) {
        allPlayersMap.set(id, { player: b.lineup.player, isHome: false, minutesPlayed: totalMinutes - 55 });
      }
    }
  }

  const playerRatings: PlayerRating[] = Array.from(allPlayersMap.values()).map(({ player, isHome, minutesPlayed }) => {
    const scored = isHome
      ? homeScorers.filter(s => s.id === player.id).length
      : awayScorers.filter(s => s.id === player.id).length;
    const mins = Math.max(1, minutesPlayed);
    return {
      playerId: player.id,
      name: player.name,
      rating: 6 + Math.random() * 2 + scored * 0.8 + (mins / 90) * 0.5,
      goals: scored,
      assists: 0,
      keyPasses: Math.floor(Math.random() * 3),
      tackles: Math.floor(Math.random() * 4),
      interceptions: Math.floor(Math.random() * 3),
      passesCompleted: Math.floor(Math.random() * 30 + 20),
      shots: 0,
      shotsOnTarget: 0,
      minutesPlayed: mins,
    };
  });

  const allScorers = [...homeScorers, ...awayScorers];
  const manOfMatch = allScorers.length > 0
    ? allScorers[0]!.name
    : playerRatings.sort((a, b) => b.rating - a.rating)[0]!.name;

  return {
    homeTeamId: home.club.id,
    awayTeamId: away.club.id,
    homeTeamName: home.club.name,
    awayTeamName: away.club.name,
    homeScore,
    awayScore,
    events,
    stats,
    playerRatings,
    manOfMatch,
    homeFormation: home.tactic.formation,
    awayFormation: away.tactic.formation,
    substitutions: allSubstitutions,
  };
}
