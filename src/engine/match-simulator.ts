import type { Player } from "../domain/player";
import type { Club } from "../domain/club";
import type { Manager } from "../domain/manager";
import type { Tactic } from "../domain/tactic";
import type { MatchContext, MatchResult, MatchStats, PossessionEvent, PlayerRating } from "../domain/match-context";
import type { RoleDefinition } from "./role-weights";
import { computeTeamPhaseScores, computeGoalkeeperPhaseScores } from "./ratings";
import { simulatePossession, getPossessionShare } from "./possession-engine";
import { getStaminaDrainMultiplier } from "./tactic-modifiers";

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
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updatePlayerCondition(current: number, staminaDrain: number, minutesPlayed: number): number {
  const drain = staminaDrain * (minutesPlayed / 90) * 0.15;
  return Math.max(40, current - drain * (1 - current / 100) * 0.3);
}

export function simulateMatch(home: TeamSetup, away: TeamSetup, context: MatchContext): MatchResult {
  const homePhase = computeTeamPhaseScores(
    home.outfield.map(lp => ({ player: lp.player, role: lp.role })),
    home.tactic,
    95, 85,
  );
  const awayPhase = computeTeamPhaseScores(
    away.outfield.map(lp => ({ player: lp.player, role: lp.role })),
    away.tactic,
    95, 85,
  );

  const homeGkPhase = computeGoalkeeperPhaseScores(home.goalkeeper.player);
  const awayGkPhase = computeGoalkeeperPhaseScores(away.goalkeeper.player);

  homePhase.defensiveSolidity += homeGkPhase.defensiveSolidity;
  homePhase.aerial += homeGkPhase.aerial;
  awayPhase.defensiveSolidity += awayGkPhase.defensiveSolidity;
  awayPhase.aerial += awayGkPhase.aerial;

  const homeAdvantage = context.venueType === "home" ? home.club.homeAdvantage : context.venueType === "away" ? -home.club.homeAdvantage * 0.3 : 0;

  const possessionShare = getPossessionShare(homePhase, awayPhase, homeAdvantage);

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

  const homeStaminaTracker: number[] = new Array(home.outfield.length).fill(95);
  const awayStaminaTracker: number[] = new Array(away.outfield.length).fill(95);

  const homeScorers: Player[] = [];
  const awayScorers: Player[] = [];

  let homePosCount = 0;
  let awayPosCount = 0;

  const totalMinutes = 90 + Math.floor(Math.random() * 5);

  for (let minute = 1; minute <= totalMinutes; minute++) {
    const avgHomeStamina = homeStaminaTracker.reduce((a, b) => a + b, 0) / homeStaminaTracker.length;
    const avgAwayStamina = awayStaminaTracker.reduce((a, b) => a + b, 0) / awayStaminaTracker.length;

    const isHomeAttacking = Math.random() < possessionShare + (avgHomeStamina - avgAwayStamina) * 0.001;

    if (isHomeAttacking) homePosCount++;
    else awayPosCount++;

    const outcome = simulatePossession({
      phaseScores: { home: homePhase, away: awayPhase },
      tactics: { home: home.tactic, away: away.tactic },
      managers: { home: home.manager, away: away.manager },
      isHomeAttacking,
      minute,
      homeStamina: avgHomeStamina,
      awayStamina: avgAwayStamina,
    });

    if (outcome.shot) {
      if (isHomeAttacking) {
        stats.shots.home++;
        if (outcome.xG > 0.1 && random() < 0.5) {
          // assign to a random player
        }
      } else {
        stats.shots.away++;
      }
    }

    if (outcome.shotOnTarget) {
      if (isHomeAttacking) stats.shotsOnTarget.home++;
      else stats.shotsOnTarget.away++;
    }

    if (outcome.goal) {
      if (isHomeAttacking) {
        homeScore++;
        const scorer = home.outfield[randomInt(0, home.outfield.length - 1)].player;
        homeScorers.push(scorer);
      } else {
        awayScore++;
        const scorer = away.outfield[randomInt(0, away.outfield.length - 1)].player;
        awayScorers.push(scorer);
      }
      const scorerName = isHomeAttacking
        ? homeScorers[homeScorers.length - 1]!.name
        : awayScorers[awayScorers.length - 1]!.name;
      events.push({
        minute,
        team: isHomeAttacking ? "home" : "away",
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
    } else if (outcome.shot) {
      // shot missed
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

    for (let i = 0; i < homeStaminaTracker.length; i++) {
      homeStaminaTracker[i] = updatePlayerCondition(homeStaminaTracker[i], homeStaminaDrain, minute);
    }
    for (let i = 0; i < awayStaminaTracker.length; i++) {
      awayStaminaTracker[i] = updatePlayerCondition(awayStaminaTracker[i], awayStaminaDrain, minute);
    }
  }

  stats.possession.home = Math.round((homePosCount / (homePosCount + awayPosCount)) * 100);
  stats.possession.away = 100 - stats.possession.home;

  const allPlayers = [
    ...home.outfield.map(lp => lp.player),
    home.goalkeeper.player,
    ...away.outfield.map(lp => lp.player),
    away.goalkeeper.player,
  ];

  const playerRatings: PlayerRating[] = allPlayers.map(p => {
    const isHome = home.outfield.some(lp => lp.player.id === p.id) || home.goalkeeper.player.id === p.id;
    const scored = isHome
      ? homeScorers.filter(s => s.id === p.id).length
      : awayScorers.filter(s => s.id === p.id).length;
    return {
      playerId: p.id,
      name: p.name,
      rating: 6 + Math.random() * 2 + scored * 0.8,
      goals: scored,
      assists: 0,
      keyPasses: Math.floor(Math.random() * 3),
      tackles: Math.floor(Math.random() * 4),
      interceptions: Math.floor(Math.random() * 3),
      passesCompleted: Math.floor(Math.random() * 30 + 20),
      shots: 0,
      shotsOnTarget: 0,
      minutesPlayed: 90,
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
  };
}

function random() {
  return Math.random();
}
