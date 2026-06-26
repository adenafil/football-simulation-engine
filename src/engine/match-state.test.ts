import { test, expect } from "bun:test";
import {
  getScorelineState,
  getTimePhase,
  getScorelineModifier,
  getTimePhaseModifier,
  clampPhaseModifierOverlay,
  clampOverlay,
  getManagerBiasOverlay,
  getMomentumModifier,
  createMomentumState,
  triggerGoalMomentum,
  mergeOverlays,
  getEffectivePhaseScores,
} from "./match-state";
import type { Manager } from "../domain/manager";
import type { PhaseScores } from "./ratings";

test("getScorelineState returns drawing when scores are equal", () => {
  expect(getScorelineState(0, 0, true)).toBe("drawing");
  expect(getScorelineState(2, 2, true)).toBe("drawing");
  expect(getScorelineState(1, 1, false)).toBe("drawing");
});

test("getScorelineState returns leading when team is ahead", () => {
  expect(getScorelineState(2, 1, true)).toBe("leading");
  expect(getScorelineState(0, 3, false)).toBe("leading");
});

test("getScorelineState returns trailing when team is behind", () => {
  expect(getScorelineState(0, 2, true)).toBe("trailing");
  expect(getScorelineState(3, 1, false)).toBe("trailing");
});

test("getTimePhase returns correct phase for each range", () => {
  expect(getTimePhase(1)).toBe("early");
  expect(getTimePhase(15)).toBe("early");
  expect(getTimePhase(30)).toBe("early");
  expect(getTimePhase(31)).toBe("mid");
  expect(getTimePhase(45)).toBe("mid");
  expect(getTimePhase(60)).toBe("mid");
  expect(getTimePhase(61)).toBe("late");
  expect(getTimePhase(70)).toBe("late");
  expect(getTimePhase(75)).toBe("late");
  expect(getTimePhase(76)).toBe("very-late");
  expect(getTimePhase(90)).toBe("very-late");
  expect(getTimePhase(95)).toBe("very-late");
});

test("getScorelineModifier returns zero for drawing in early/mid", () => {
  const early = getScorelineModifier("drawing", "early");
  const mid = getScorelineModifier("drawing", "mid");
  expect(early.buildUp).toBe(0);
  expect(mid.buildUp).toBe(0);
});

test("getScorelineModifier boosts attacking for trailing in very-late", () => {
  const mod = getScorelineModifier("trailing", "very-late");
  expect(mod.finishing).toBeGreaterThan(0);
  expect(mod.finalThird).toBeGreaterThan(0);
  expect(mod.defensiveSolidity).toBeLessThan(0);
});

test("getScorelineModifier boosts defense for leading in very-late", () => {
  const mod = getScorelineModifier("leading", "very-late");
  expect(mod.defensiveSolidity).toBeGreaterThan(0);
  expect(mod.finishing).toBeLessThan(0);
  expect(mod.finalThird).toBeLessThan(0);
});

test("getTimePhaseModifier is zero for early and mid", () => {
  expect(getTimePhaseModifier("early").buildUp).toBe(0);
  expect(getTimePhaseModifier("mid").buildUp).toBe(0);
});

test("getTimePhaseModifier has negative buildUp for very-late", () => {
  const mod = getTimePhaseModifier("very-late");
  expect(mod.buildUp).toBeLessThan(0);
  expect(mod.pressing).toBeLessThan(0);
});

test("clampPhaseModifierOverlay caps at 0.15 and -0.12", () => {
  expect(clampPhaseModifierOverlay(0.2)).toBe(0.15);
  expect(clampPhaseModifierOverlay(-0.2)).toBe(-0.12);
  expect(clampPhaseModifierOverlay(0.05)).toBe(0.05);
  expect(clampPhaseModifierOverlay(0)).toBe(0);
});

test("clampOverlay clamps all fields", () => {
  const clamped = clampOverlay({
    buildUp: 0.5,
    progression: -0.5,
    finalThird: 0.05,
    finishing: 0,
    defensiveSolidity: 0.15,
    pressing: -0.12,
    aerial: 0.2,
    transitionAttack: -0.1,
    transitionDefense: 1,
  });
  expect(clamped.buildUp).toBe(0.15);
  expect(clamped.progression).toBe(-0.12);
  expect(clamped.finalThird).toBe(0.05);
  expect(clamped.defensiveSolidity).toBe(0.15);
  expect(clamped.pressing).toBe(-0.12);
  expect(clamped.aerial).toBe(0.15);
  expect(clamped.transitionDefense).toBe(0.15);
});

const sampleManager: Manager = {
  id: "test",
  name: "Test Manager",
  age: 50,
  nationality: "Test",
  tacticalDiscipline: 14,
  adaptability: 12,
  motivation: 15,
  manManagement: 13,
  attackingBias: 16,
  defensiveBias: 8,
  rotation: 10,
  inGameManagement: 14,
  youthDevelopment: 10,
  squadSquadRotation: 10,
  preferredFormations: ["4-3-3"],
};

test("getManagerBiasOverlay reflects attacking bias", () => {
  const overlay = getManagerBiasOverlay(sampleManager);
  expect(overlay.finalThird).toBeGreaterThan(0);
  expect(overlay.finishing).toBeGreaterThan(0);
});

const defensiveManager: Manager = {
  ...sampleManager,
  attackingBias: 6,
  defensiveBias: 17,
};

test("getManagerBiasOverlay reflects defensive bias", () => {
  const overlay = getManagerBiasOverlay(defensiveManager);
  expect(overlay.defensiveSolidity).toBeGreaterThan(0);
  expect(overlay.finalThird).toBeLessThan(overlay.defensiveSolidity);
});

test("createMomentumState returns inactive", () => {
  const m = createMomentumState();
  expect(m.active).toBe(false);
  expect(m.team).toBe(null);
  expect(m.expiresAt).toBe(0);
});

test("triggerGoalMomentum activates momentum for scoring team", () => {
  const m = createMomentumState();
  triggerGoalMomentum(m, "home", 70);
  expect(m.active).toBe(true);
  expect(m.team).toBe("home");
  expect(m.expiresAt).toBe(75);
});

test("getMomentumModifier returns zero when momentum inactive", () => {
  const m = createMomentumState();
  const mod = getMomentumModifier(m, true, 70);
  expect(mod.finishing).toBe(0);
});

test("getMomentumModifier returns boost for attacking team with momentum", () => {
  const m = createMomentumState();
  triggerGoalMomentum(m, "home", 70);
  const mod = getMomentumModifier(m, true, 72);
  expect(mod.finishing).toBeGreaterThan(0);
  expect(mod.finalThird).toBeGreaterThan(0);
  expect(mod.buildUp).toBeGreaterThan(0);
});

test("getMomentumModifier returns zero after expiry", () => {
  const m = createMomentumState();
  triggerGoalMomentum(m, "home", 70);
  const mod = getMomentumModifier(m, true, 76);
  expect(mod.finishing).toBe(0);
});

test("mergeOverlays sums multiple overlays", () => {
  const a = {
    buildUp: 0.02, progression: 0, finalThird: 0.03, finishing: 0,
    defensiveSolidity: 0, pressing: 0, aerial: 0,
    transitionAttack: 0, transitionDefense: 0,
  };
  const b = {
    buildUp: 0, progression: 0.01, finalThird: 0, finishing: 0.02,
    defensiveSolidity: 0.03, pressing: 0, aerial: 0,
    transitionAttack: 0, transitionDefense: 0,
  };
  const merged = mergeOverlays(a, b);
  expect(merged.buildUp).toBeCloseTo(0.02);
  expect(merged.progression).toBeCloseTo(0.01);
  expect(merged.finalThird).toBeCloseTo(0.03);
  expect(merged.finishing).toBeCloseTo(0.02);
  expect(merged.defensiveSolidity).toBeCloseTo(0.03);
});

test("getEffectivePhaseScores applies overlay to base", () => {
  const base: PhaseScores = {
    buildUp: 50, progression: 40, finalThird: 30, finishing: 20,
    defensiveSolidity: 60, pressing: 45, aerial: 35,
    transitionAttack: 25, transitionDefense: 55,
  };
  const overlay = {
    buildUp: 0.1, progression: 0, finalThird: 0, finishing: 0,
    defensiveSolidity: 0, pressing: 0, aerial: 0,
    transitionAttack: 0, transitionDefense: 0,
  };
  const effective = getEffectivePhaseScores(base, overlay);
  expect(effective.buildUp).toBeCloseTo(55);
  expect(effective.progression).toBe(40);
  expect(effective.finalThird).toBe(30);
});

test("getEffectivePhaseScores does not mutate base", () => {
  const base: PhaseScores = {
    buildUp: 50, progression: 40, finalThird: 30, finishing: 20,
    defensiveSolidity: 60, pressing: 45, aerial: 35,
    transitionAttack: 25, transitionDefense: 55,
  };
  const originalBuildUp = base.buildUp;
  getEffectivePhaseScores(base, { buildUp: 0.1, progression: 0, finalThird: 0, finishing: 0, defensiveSolidity: 0, pressing: 0, aerial: 0, transitionAttack: 0, transitionDefense: 0 });
  expect(base.buildUp).toBe(originalBuildUp);
});

test("integration: trailing + very-late + momentum merges correctly", () => {
  const base: PhaseScores = {
    buildUp: 50, progression: 40, finalThird: 30, finishing: 20,
    defensiveSolidity: 60, pressing: 45, aerial: 35,
    transitionAttack: 25, transitionDefense: 55,
  };

  const scorelineMod = getScorelineModifier("trailing", "very-late");
  const timeMod = getTimePhaseModifier("very-late");
  const merged = mergeOverlays(scorelineMod, timeMod);
  const clamped = clampOverlay(merged);
  const effective = getEffectivePhaseScores(base, clamped);

  expect(effective.finishing).toBeGreaterThan(base.finishing);
  expect(effective.defensiveSolidity).toBeLessThan(base.defensiveSolidity);
  expect(effective.buildUp).toBeGreaterThan(base.buildUp);
});
