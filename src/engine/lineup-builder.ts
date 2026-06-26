import type { Player, Position, Role } from "../domain/player";
import type { Formation, Mentality, Tactic } from "../domain/tactic";
import { getRoleDefinition, type RoleDefinition } from "./role-weights";
import { computePlayerRating } from "./ratings";
import type { LineupPlayer } from "./match-simulator";

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

function selectBestPlayerForPosition(players: Player[], position: string, usedIds: Set<string>): Player | null {
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
  for (const role of possibleRoles) {
    const suitability = player.roleSuitability[role];
    if (suitability === undefined) continue;
    const currentSuitability = player.roleSuitability[chosenRole] ?? 0;
    if (suitability > currentSuitability) {
      chosenRole = role;
    }
  }
  return chosenRole;
}

function toLineupPlayer(player: Player, roleDef: RoleDefinition, position: string): LineupPlayer {
  return { player, role: roleDef, position };
}

function buildBench(allPlayers: Player[], usedIds: Set<string>): LineupPlayer[] {
  const remaining = allPlayers.filter(player => !usedIds.has(player.id));
  const prioritized = remaining.map(player => {
    const rating = computePlayerRating(player).overall;
    const goalkeeperPenalty = player.positions.includes("GK") ? -30 : 0;
    return { player, score: rating + goalkeeperPenalty + player.positions.length * 2 };
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
    bench.push(toLineupPlayer(player, getRoleDefinition(role), position));
  }

  return bench;
}

export interface BuiltLineup {
  goalkeeper: LineupPlayer;
  outfield: LineupPlayer[];
  bench: LineupPlayer[];
}

export interface BuildLineupConfig {
  benchSize?: number;
  excludePlayerIds?: string[];
  lockedPlayerIds?: string[];
}

export function buildLineup(players: Player[], formation: Formation, config: BuildLineupConfig = {}): BuiltLineup {
  const positions = getFormationPositions(formation);
  const excludedIds = new Set(config.excludePlayerIds ?? []);
  const availablePlayers = players.filter(player => !excludedIds.has(player.id));
  const usedIds = new Set<string>();
  const goalkeeper = selectBestPlayerForPosition(availablePlayers, "GK", usedIds);

  if (!goalkeeper) {
    throw new Error("No goalkeeper found for lineup build");
  }

  usedIds.add(goalkeeper.id);
  const goalkeeperRole = getDefaultRoles(formation, "GK")[0] ?? "Goalkeeper";
  const lineupGoalkeeper: LineupPlayer = {
    player: goalkeeper,
    role: getRoleDefinition(goalkeeperRole),
    position: "GK",
  };

  const outfield: LineupPlayer[] = [];
  const lockedPlayers = new Set(config.lockedPlayerIds ?? []);
  for (const position of positions) {
    if (position === "GK") continue;
    const lockedCandidate = availablePlayers.find(player => !usedIds.has(player.id) && lockedPlayers.has(player.id) && player.positions.includes(position as Position));
    const player = lockedCandidate ?? selectBestPlayerForPosition(availablePlayers, position, usedIds);
    if (!player) continue;

    usedIds.add(player.id);
    const chosenRole = selectBestRoleForPlayer(player, formation, position);
    outfield.push(toLineupPlayer(player, getRoleDefinition(chosenRole), position));
  }

  return {
    goalkeeper: lineupGoalkeeper,
    outfield,
    bench: buildBench(availablePlayers, usedIds).slice(0, config.benchSize ?? 7),
  };
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
