import { test, expect } from "bun:test";
import { getPlayersByClub } from "../data/players";
import { buildLineup } from "./lineup-builder";
import { pickCreator, pickShooter, pickDefender } from "./player-involvement";

function buildState(teamId: string, formation: "4-3-3" | "4-2-3-1") {
  const lineup = buildLineup(getPlayersByClub(teamId), formation);
  return {
    activeOutfield: lineup.outfield.map(lineupPlayer => ({
      lineup: lineupPlayer,
      currentCondition: 95,
    })),
  };
}

test("shooter selection favors forwards and wide attackers", () => {
  const state = buildState("real-madrid", "4-3-3");
  const counts = new Map<string, number>();

  for (let i = 0; i < 1000; i++) {
    const picked = pickShooter(state);
    if (!picked) continue;
    counts.set(picked.lineup.position, (counts.get(picked.lineup.position) ?? 0) + 1);
  }

  const strikerAndWingers = (counts.get("ST") ?? 0) + (counts.get("AML") ?? 0) + (counts.get("AMR") ?? 0);
  const midfielders = (counts.get("CM") ?? 0) + (counts.get("DM") ?? 0);
  expect(strikerAndWingers).toBeGreaterThanOrEqual(midfielders);
});

test("creator selection favors attacking midfield and wings", () => {
  const state = buildState("man-utd", "4-2-3-1");
  const counts = new Map<string, number>();

  for (let i = 0; i < 300; i++) {
    const picked = pickCreator(state);
    if (!picked) continue;
    counts.set(picked.lineup.position, (counts.get(picked.lineup.position) ?? 0) + 1);
  }

  const attackers = (counts.get("AMC") ?? 0) + (counts.get("AMR") ?? 0) + (counts.get("ST") ?? 0);
  const centerBacks = counts.get("CB") ?? 0;
  expect(attackers).toBeGreaterThan(centerBacks);
  expect(counts.get("AMC") ?? 0).toBeGreaterThan(0);
});

test("defender selection favors back line and defensive midfield", () => {
  const state = buildState("real-madrid", "4-3-3");
  const counts = new Map<string, number>();

  for (let i = 0; i < 300; i++) {
    const picked = pickDefender(state);
    if (!picked) continue;
    counts.set(picked.lineup.position, (counts.get(picked.lineup.position) ?? 0) + 1);
  }

  const backLine = (counts.get("CB") ?? 0) + (counts.get("LB") ?? 0) + (counts.get("RB") ?? 0);
  const attackers = (counts.get("ST") ?? 0) + (counts.get("AML") ?? 0) + (counts.get("AMR") ?? 0);
  expect(backLine).toBeGreaterThan(attackers);
});
