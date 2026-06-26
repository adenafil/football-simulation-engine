import type { GroupStageTeamDefinition } from "./group-stage";
import type { KnockoutTeamDefinition, KnockoutTie } from "./knockout-state";

export interface GroupDrawPot {
  name: string;
  teams: Omit<GroupStageTeamDefinition, "group">[];
}

export interface GroupDrawRules {
  groupCount: number;
  preventSameNation: boolean;
  preventSameLeague?: boolean;
}

export interface GroupDrawResult {
  groups: Record<string, GroupStageTeamDefinition[]>;
}

export interface SeededKnockoutTeam extends KnockoutTeamDefinition {
  seed?: number;
  previousGroup?: string;
}

export interface KnockoutDrawRules {
  preventSameNation: boolean;
  preventSameGroup: boolean;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function groupName(index: number): string {
  return String.fromCharCode(65 + index);
}

function canPlaceInGroup(
  team: Omit<GroupStageTeamDefinition, "group">,
  existing: GroupStageTeamDefinition[],
  rules: GroupDrawRules,
): boolean {
  if (rules.preventSameNation && existing.some(existingTeam => existingTeam.club.nation === team.club.nation)) {
    return false;
  }
  if (rules.preventSameLeague && existing.some(existingTeam => existingTeam.club.league === team.club.league)) {
    return false;
  }
  return true;
}

function cloneGroups(groups: Record<string, GroupStageTeamDefinition[]>): Record<string, GroupStageTeamDefinition[]> {
  return Object.fromEntries(Object.entries(groups).map(([group, teams]) => [group, [...teams]]));
}

function backtrackPlaceTeams(
  pots: GroupDrawPot[],
  potIndex: number,
  teamIndex: number,
  groups: Record<string, GroupStageTeamDefinition[]>,
  rules: GroupDrawRules,
): Record<string, GroupStageTeamDefinition[]> | null {
  if (potIndex >= pots.length) return groups;

  const currentPot = pots[potIndex];
  if (!currentPot) return groups;

  if (teamIndex >= currentPot.teams.length) {
    return backtrackPlaceTeams(pots, potIndex + 1, 0, groups, rules);
  }

  const team = currentPot.teams[teamIndex];
  if (!team) return backtrackPlaceTeams(pots, potIndex, teamIndex + 1, groups, rules);

  for (const [group, currentTeams] of shuffle(Object.entries(groups))) {
    if (currentTeams.length >= pots.length) continue;
    if (!canPlaceInGroup(team, currentTeams, rules)) continue;

    const nextGroups = cloneGroups(groups);
    nextGroups[group]?.push({ ...team, group });
    const solved = backtrackPlaceTeams(pots, potIndex, teamIndex + 1, nextGroups, rules);
    if (solved) return solved;
  }

  return null;
}

export function drawGroupsFromPots(
  pots: GroupDrawPot[],
  rules: GroupDrawRules,
): GroupDrawResult {
  const groups: Record<string, GroupStageTeamDefinition[]> = {};
  for (let i = 0; i < rules.groupCount; i++) {
    groups[groupName(i)] = [];
  }

  const shuffledPots = pots.map(pot => ({ ...pot, teams: shuffle(pot.teams) }));
  const solved = backtrackPlaceTeams(shuffledPots, 0, 0, groups, rules);

  if (!solved) {
    throw new Error("Unable to produce a valid group draw with current constraints");
  }

  return { groups: solved };
}

function canPairKnockoutTeams(
  seeded: SeededKnockoutTeam,
  unseeded: SeededKnockoutTeam,
  rules: KnockoutDrawRules,
): boolean {
  if (rules.preventSameNation && seeded.club.nation === unseeded.club.nation) return false;
  if (rules.preventSameGroup && seeded.previousGroup && unseeded.previousGroup && seeded.previousGroup === unseeded.previousGroup) return false;
  return true;
}

function backtrackSeedKnockout(
  seededTeams: SeededKnockoutTeam[],
  unseededTeams: SeededKnockoutTeam[],
  rules: KnockoutDrawRules,
  stage: string,
  index: number,
  ties: KnockoutTie[],
): KnockoutTie[] | null {
  if (index >= seededTeams.length) return ties;

  const seeded = seededTeams[index];
  if (!seeded) return ties;

  for (const opponent of shuffle(unseededTeams)) {
    if (!canPairKnockoutTeams(seeded, opponent, rules)) continue;
    const remaining = unseededTeams.filter(team => team.club.id !== opponent.club.id);
    const nextTies = [
      ...ties,
      {
        id: `${stage}-${seeded.club.id}-${opponent.club.id}`,
        homeTeamId: seeded.club.id,
        awayTeamId: opponent.club.id,
        legs: 2 as const,
        stage,
      },
    ];

    const solved = backtrackSeedKnockout(seededTeams, remaining, rules, stage, index + 1, nextTies);
    if (solved) return solved;
  }

  return null;
}

export function seedKnockoutBracket(
  seededTeams: SeededKnockoutTeam[],
  unseededTeams: SeededKnockoutTeam[],
  rules: KnockoutDrawRules,
  stage: string = "round-of-16",
): KnockoutTie[] {
  if (seededTeams.length !== unseededTeams.length) {
    throw new Error("Seeded and unseeded team counts must match");
  }

  const shuffledSeeded = shuffle(seededTeams);
  const solved = backtrackSeedKnockout(shuffledSeeded, [...unseededTeams], rules, stage, 0, []);
  if (!solved) {
    throw new Error("Unable to seed knockout bracket with current constraints");
  }
  return solved;
}
