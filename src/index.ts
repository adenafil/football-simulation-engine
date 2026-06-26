import type { Player, Position, Role } from "./domain/player";
import type { Club } from "./domain/club";
import type { Manager } from "./domain/manager";
import type { Tactic, Formation, Mentality } from "./domain/tactic";
import type { MatchContext, MatchResult, VenueType } from "./domain/match-context";
import { getRoleDefinition, findBestRoleForPlayer } from "./engine/role-weights";
import { simulateMatch, type LineupPlayer, type TeamSetup } from "./engine/match-simulator";
import { computePlayerRating } from "./engine/ratings";
import { getPlayersByClub } from "./data/players";
import { getClubById } from "./data/clubs";
import { getManagerById } from "./data/managers";

export type { Player, Club, Manager, Tactic, Formation, MatchContext, MatchResult };

function getFormationPositions(formation: Formation): string[] {
  switch (formation) {
    case "4-2-3-1": return ["GK", "LB", "CB", "CB", "RB", "DM", "DM", "AML", "AMC", "AMR", "ST"];
    case "4-4-2": return ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"];
    case "4-4-2 Diamond": return ["GK", "LB", "CB", "CB", "RB", "DM", "CM", "CM", "AMC", "ST", "ST"];
    case "4-3-3": return ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "AML", "ST", "AMR"];
    case "3-5-2": return ["GK", "CB", "CB", "CB", "LWB", "CM", "CM", "CM", "RWB", "ST", "ST"];
    case "3-4-3": return ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "AML", "ST", "AMR"];
    default: return ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "AML", "ST", "AMR"];
  }
}

function getDefaultRoles(formation: Formation, position: string): Role[] {
  switch (formation) {
    case "4-2-3-1": {
      const map: Record<string, Role[]> = {
        GK: ["Goalkeeper"],
        LB: ["Full-Back", "Inverted Full-Back"],
        CB: ["Centre-Back", "Ball-Playing Defender"],
        RB: ["Full-Back", "Wing-Back"],
        DM: ["Defensive Midfielder", "Anchor Man", "Deep-Lying Playmaker"],
        AML: ["Inside Forward", "Winger", "Wide Forward"],
        AMC: ["Advanced Playmaker", "Shadow Striker", "Trequartista"],
        AMR: ["Inside Forward", "Winger", "Wide Forward"],
        ST: ["Advanced Forward", "Poacher", "Complete Forward", "Channel Forward"],
      };
      return map[position] ?? ["Central Midfielder"];
    }
    case "4-3-3": {
      const map: Record<string, Role[]> = {
        GK: ["Goalkeeper"],
        LB: ["Full-Back", "Wing-Back"],
        CB: ["Centre-Back", "Ball-Playing Defender"],
        RB: ["Full-Back", "Wing-Back"],
        CM: ["Central Midfielder", "Box-to-Box Midfielder", "Deep-Lying Playmaker", "Roaming Playmaker"],
        AML: ["Inside Forward", "Winger", "Wide Forward"],
        ST: ["Advanced Forward", "Complete Forward", "False Nine", "Target Man"],
        AMR: ["Inside Forward", "Winger", "Wide Forward"],
      };
      return map[position] ?? ["Central Midfielder"];
    }
    case "4-4-2": {
      const map: Record<string, Role[]> = {
        GK: ["Goalkeeper"],
        LB: ["Full-Back", "No-Nonsense Full-Back"],
        CB: ["Centre-Back", "No-Nonsense Centre-Back"],
        RB: ["Full-Back", "No-Nonsense Full-Back"],
        LM: ["Wide Midfielder", "Winger"],
        CM: ["Central Midfielder", "Box-to-Box Midfielder", "Ball-Winning Midfielder"],
        RM: ["Wide Midfielder", "Winger"],
        ST: ["Advanced Forward", "Poacher", "Target Man", "Deep-Lying Forward"],
      };
      return map[position] ?? ["Central Midfielder"];
    }
    case "4-4-2 Diamond": {
      const map: Record<string, Role[]> = {
        GK: ["Goalkeeper"],
        LB: ["Full-Back", "Complete Wing-Back"],
        CB: ["Centre-Back", "Ball-Playing Defender"],
        RB: ["Full-Back", "Complete Wing-Back"],
        DM: ["Defensive Midfielder", "Half-Back", "Anchor Man"],
        CM: ["Central Midfielder", "Box-to-Box Midfielder", "Mezzala"],
        AMC: ["Advanced Playmaker", "Trequartista", "Shadow Striker", "Enganche"],
        ST: ["Advanced Forward", "Poacher", "Complete Forward"],
      };
      return map[position] ?? ["Central Midfielder"];
    }
    case "3-5-2": {
      const map: Record<string, Role[]> = {
        GK: ["Goalkeeper"],
        CB: ["Centre-Back", "Ball-Playing Defender", "Wide Centre-Back"],
        LWB: ["Wing-Back", "Complete Wing-Back"],
        RWB: ["Wing-Back", "Complete Wing-Back"],
        CM: ["Central Midfielder", "Box-to-Box Midfielder", "Ball-Winning Midfielder", "Roaming Playmaker"],
        ST: ["Advanced Forward", "Poacher", "Target Man", "Deep-Lying Forward"],
      };
      return map[position] ?? ["Central Midfielder"];
    }
    case "3-4-3": {
      const map: Record<string, Role[]> = {
        GK: ["Goalkeeper"],
        CB: ["Centre-Back", "Ball-Playing Defender", "Wide Centre-Back"],
        LM: ["Wide Midfielder", "Winger", "Racing Winger"],
        RM: ["Wide Midfielder", "Winger", "Racing Winger"],
        CM: ["Central Midfielder", "Box-to-Box Midfielder", "Roaming Playmaker"],
        AML: ["Inside Forward", "Winger", "Wide Forward"],
        ST: ["Advanced Forward", "Complete Forward", "False Nine"],
        AMR: ["Inside Forward", "Winger", "Wide Forward"],
      };
      return map[position] ?? ["Central Midfielder"];
    }
    default: return ["Central Midfielder"];
  }
}

function selectBestPlayerForPosition(
  players: Player[],
  position: string,
  usedIds: Set<string>,
): Player | null {
  const posMap: Record<string, Position[]> = {
    GK: ["GK"],
    CB: ["CB"],
    LB: ["LB", "LWB"],
    RB: ["RB", "RWB"],
    LWB: ["LWB", "LB", "LM"],
    RWB: ["RWB", "RB", "RM"],
    DM: ["DM", "CM"],
    CM: ["CM", "DM"],
    LM: ["LM", "AML", "RM"],
    RM: ["RM", "AMR", "LM"],
    AML: ["AML", "LM", "ST"],
    AMC: ["AMC", "CM"],
    AMR: ["AMR", "RM", "ST"],
    ST: ["ST", "CF", "AML", "AMR"],
  };

  const allowedPositions = posMap[position] ?? [];

  let bestPlayer: Player | null = null;
  let bestRating = -1;

  for (const player of players) {
    if (usedIds.has(player.id)) continue;
    const matches = player.positions.some(p => allowedPositions.includes(p));
    if (!matches) continue;

    const rating = computePlayerRating(player).overall;
    if (rating > bestRating) {
      bestRating = rating;
      bestPlayer = player;
    }
  }

  return bestPlayer;
}

function selectBestRoleForPlayer(player: Player, formation: Formation, position: string): Role {
  const possibleRoles = getDefaultRoles(formation, position);
  let chosenRole: Role = possibleRoles[0] ?? "Central Midfielder";
  for (const r of possibleRoles) {
    if (player.roleSuitability[r] !== undefined) {
      const suit = player.roleSuitability[r]!;
      const currentSuit = player.roleSuitability[chosenRole] ?? 0;
      if (suit > currentSuit) {
        chosenRole = r;
      }
    }
  }
  return chosenRole;
}

function toLineupPlayer(player: Player, roleDef: RoleDefinition, position: string): LineupPlayer {
  return { player, role: roleDef, position };
}

function buildBench(starters: LineupPlayer[], allPlayers: Player[], usedIds: Set<string>): LineupPlayer[] {
  const remaining = allPlayers.filter(p => !usedIds.has(p.id));

  const prioritized = remaining.map(p => {
    const rating = computePlayerRating(p).overall;
    const gk = p.positions.includes("GK") ? -30 : 0;
    const positional = p.positions.length;
    return { player: p, score: rating + gk + positional * 2 };
  });

  prioritized.sort((a, b) => b.score - a.score);

  const bench: LineupPlayer[] = [];
  const used = new Set(usedIds);

  for (const { player } of prioritized) {
    if (bench.length >= 7) break;
    if (used.has(player.id)) continue;
    used.add(player.id);

    const position = player.positions[0] ?? "CM";
    const role = selectBestRoleForPlayer(player, "4-3-3", position);
    const roleDef = getRoleDefinition(role);
    bench.push(toLineupPlayer(player, roleDef, position));
  }

  return bench;
}

export function buildLineup(
  clubId: string,
  formation: Formation,
  customPlayerSelections?: Player[],
): { goalkeeper: LineupPlayer; outfield: LineupPlayer[]; bench: LineupPlayer[] } {
  const players = customPlayerSelections ?? getPlayersByClub(clubId);
  const positions = getFormationPositions(formation);
  const usedIds = new Set<string>();

  const goalkeeperPos = "GK";
  const gkPlayer = selectBestPlayerForPosition(players, goalkeeperPos, usedIds);
  if (!gkPlayer) throw new Error(`No goalkeeper found for club ${clubId}`);

  usedIds.add(gkPlayer.id);

  const gkRoles = getDefaultRoles(formation, "GK");
  const gkRole = gkRoles[0] ?? "Goalkeeper";
  const gkRoleDef = getRoleDefinition(gkRole);

  const outfield: LineupPlayer[] = [];
  const gkLineup: LineupPlayer = { player: gkPlayer, role: gkRoleDef, position: "GK" };

  for (const pos of positions) {
    if (pos === "GK") continue;
    const player = selectBestPlayerForPosition(players, pos, usedIds);
    if (!player) continue;
    usedIds.add(player.id);

    const chosenRole = selectBestRoleForPlayer(player, formation, pos);
    const roleDef = getRoleDefinition(chosenRole);
    outfield.push(toLineupPlayer(player, roleDef, pos));
  }

  const bench = buildBench(outfield, players, usedIds);

  return { goalkeeper: gkLineup, outfield, bench };
}

export function buildDefaultTactic(formation: Formation, mentality: Mentality = "balanced"): Tactic {
  return {
    formation,
    mentality,
    tempo: "normal",
    width: "normal",
    pressing: "high",
    defensiveLine: "normal",
    directness: "mixed",
    counterAttack: true,
    counterPress: false,
    timeWasting: false,
    creativeFreedom: 50,
    useOffsideTrap: false,
    focusPlay: "mixed",
    defensiveShape: "standard",
  };
}

export function simulateFootballMatch(
  homeClubId: string,
  awayClubId: string,
  homeFormation: Formation = "4-3-3",
  awayFormation: Formation = "4-2-3-1",
  venueType: VenueType = "neutral",
  homeManagerId?: string,
  awayManagerId?: string,
): MatchResult {
  const homeClub = getClubById(homeClubId);
  const awayClub = getClubById(awayClubId);

  if (!homeClub || !awayClub) {
    throw new Error("Club not found");
  }

  const homeLineup = buildLineup(homeClubId, homeFormation);
  const awayLineup = buildLineup(awayClubId, awayFormation);

  const homeTactic = buildDefaultTactic(homeFormation, "positive");
  const awayTactic = buildDefaultTactic(awayFormation, "balanced");

  const homeManager = homeManagerId ? getManagerById(homeManagerId) : undefined;
  const awayManager = awayManagerId ? getManagerById(awayManagerId) : undefined;

  const context: MatchContext = {
    venueType,
    weather: "clear",
    importance: "league",
    competitionType: "league",
    isDerby: false,
  };

  function buildDefaultManager(name: string, formation: Formation): Manager {
    return {
      id: "default",
      name,
      age: 50,
      nationality: "Unknown",
      tacticalDiscipline: 70,
      adaptability: 70,
      motivation: 70,
      manManagement: 70,
      attackingBias: 55,
      defensiveBias: 50,
      rotation: 50,
      inGameManagement: 65,
      youthDevelopment: 60,
      squadSquadRotation: 50,
      preferredFormations: [formation],
    };
  }

  const homeSetup: TeamSetup = {
    club: homeClub,
    manager: homeManager ?? buildDefaultManager(`${homeClub.name} Manager`, homeFormation),
    tactic: homeTactic,
    outfield: homeLineup.outfield,
    goalkeeper: homeLineup.goalkeeper,
    bench: homeLineup.bench,
  };

  const awaySetup: TeamSetup = {
    club: awayClub,
    manager: awayManager ?? buildDefaultManager(`${awayClub.name} Manager`, awayFormation),
    tactic: awayTactic,
    outfield: awayLineup.outfield,
    goalkeeper: awayLineup.goalkeeper,
    bench: awayLineup.bench,
  };

  const result = simulateMatch(homeSetup, awaySetup, context);
  return result;
}

function formatMatchResult(result: MatchResult): void {
  const line = "=".repeat(60);
  const subline = "-".repeat(60);

  console.log(`\n${line}`);
  console.log(`  ${result.homeTeamName} vs ${result.awayTeamName}`);
  console.log(`  ${result.homeFormation} vs ${result.awayFormation}`);
  console.log(line);
  console.log(`  ${result.homeTeamName}  ${result.homeScore} - ${result.awayScore}  ${result.awayTeamName}`);
  console.log(line);

  console.log(`\n  Match Stats:`);
  console.log(subline);
  console.log(`  Possession:    ${result.stats.possession.home}% - ${result.stats.possession.away}%`);
  console.log(`  Shots:         ${result.stats.shots.home} - ${result.stats.shots.away}`);
  console.log(`  Shots on Target: ${result.stats.shotsOnTarget.home} - ${result.stats.shotsOnTarget.away}`);
  console.log(`  xG:            ${result.stats.xG.home.toFixed(2)} - ${result.stats.xG.away.toFixed(2)}`);
  console.log(`  Corners:       ${result.stats.corners.home} - ${result.stats.corners.away}`);
  console.log(`  Fouls:         ${result.stats.fouls.home} - ${result.stats.fouls.away}`);
  console.log(`  Yellow Cards:  ${result.stats.yellowCards.home} - ${result.stats.yellowCards.away}`);
  console.log(`  Offsides:      ${result.stats.offsides.home} - ${result.stats.offsides.away}`);

  console.log(`\n  Key Events:`);
  console.log(subline);
  const goals = result.events.filter(e => e.phase === "goal");
  if (goals.length === 0) {
    console.log("  No goals scored");
  } else {
    for (const g of goals) {
      console.log(`  ${g.description}`);
    }
  }

  const saves = result.events.filter(e => e.phase === "shot").slice(0, 5);
  for (const s of saves) {
    console.log(`  ${s.description}`);
  }

  const subs = result.events.filter(e => e.phase === "substitution");
  if (subs.length > 0) {
    console.log(`\n  Substitutions:`);
    for (const s of subs) {
      console.log(`  ${s.description}`);
    }
  }

  console.log(`\n  Man of the Match: ${result.manOfMatch}`);

  console.log(`\n  Player Ratings:`);
  console.log(subline);
  for (const pr of result.playerRatings.sort((a, b) => b.rating - a.rating).slice(0, 10)) {
    console.log(`  ${pr.name.padEnd(22)} ${pr.rating.toFixed(1)}  (G:${pr.goals}  KP:${pr.keyPasses}  T:${pr.tackles})`);
  }
  console.log();
}

export function simulateMatchCLI(
  homeTeam: string = "real-madrid",
  awayTeam: string = "man-utd",
): void {
  const result = simulateFootballMatch(
    homeTeam,
    awayTeam,
    "4-3-3",
    "4-2-3-1",
    "neutral",
    "ancelotti",
    "ten-hag",
  );
  formatMatchResult(result);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const homeTeam = args[0] || "real-madrid";
  const awayTeam = args[1] || "man-utd";

  console.log(`\n🚀 Football Simulation Engine`);
  console.log(`   ${getClubById(homeTeam)?.name ?? homeTeam} vs ${getClubById(awayTeam)?.name ?? awayTeam}\n`);

  const result = simulateMatchCLI(homeTeam, awayTeam);
}
