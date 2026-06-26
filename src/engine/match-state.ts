import type { PhaseScores } from "./ratings";
import type { Manager } from "../domain/manager";

export type ScorelineState = "drawing" | "leading" | "trailing";

export type TimePhase = "early" | "mid" | "late" | "very-late";

export interface PhaseModifierOverlay {
  buildUp: number;
  progression: number;
  finalThird: number;
  finishing: number;
  defensiveSolidity: number;
  pressing: number;
  aerial: number;
  transitionAttack: number;
  transitionDefense: number;
}

export interface MomentumState {
  active: boolean;
  team: "home" | "away" | null;
  expiresAt: number;
}

export function getScorelineState(
  homeScore: number,
  awayScore: number,
  isHome: boolean,
): ScorelineState {
  const diff = isHome ? homeScore - awayScore : awayScore - homeScore;
  if (diff > 0) return "leading";
  if (diff < 0) return "trailing";
  return "drawing";
}

export function getTimePhase(minute: number): TimePhase {
  if (minute <= 30) return "early";
  if (minute <= 60) return "mid";
  if (minute <= 75) return "late";
  return "very-late";
}

export function getScorelineModifier(
  state: ScorelineState,
  phase: TimePhase,
): PhaseModifierOverlay {
  const zero: PhaseModifierOverlay = {
    buildUp: 0, progression: 0, finalThird: 0, finishing: 0,
    defensiveSolidity: 0, pressing: 0, aerial: 0,
    transitionAttack: 0, transitionDefense: 0,
  };

  if (state === "drawing") {
    if (phase === "late") {
      return {
        buildUp: 0.02,
        progression: 0.02,
        finalThird: 0.04,
        finishing: 0.05,
        defensiveSolidity: -0.02,
        pressing: 0.03,
        aerial: 0,
        transitionAttack: 0.04,
        transitionDefense: -0.02,
      };
    }
    if (phase === "very-late") {
      return {
        buildUp: 0.03,
        progression: 0.04,
        finalThird: 0.07,
        finishing: 0.08,
        defensiveSolidity: -0.04,
        pressing: 0.05,
        aerial: 0.01,
        transitionAttack: 0.07,
        transitionDefense: -0.04,
      };
    }
    return zero;
  }

  if (state === "leading") {
    if (phase === "late") {
      return {
        buildUp: -0.01,
        progression: -0.02,
        finalThird: -0.03,
        finishing: -0.04,
        defensiveSolidity: 0.05,
        pressing: -0.02,
        aerial: 0.02,
        transitionAttack: -0.03,
        transitionDefense: 0.04,
      };
    }
    if (phase === "very-late") {
      return {
        buildUp: -0.03,
        progression: -0.04,
        finalThird: -0.05,
        finishing: -0.06,
        defensiveSolidity: 0.08,
        pressing: -0.03,
        aerial: 0.04,
        transitionAttack: -0.05,
        transitionDefense: 0.06,
      };
    }
    return zero;
  }

  if (state === "trailing") {
    if (phase === "late") {
      return {
        buildUp: 0.03,
        progression: 0.04,
        finalThird: 0.06,
        finishing: 0.07,
        defensiveSolidity: -0.04,
        pressing: 0.05,
        aerial: 0,
        transitionAttack: 0.06,
        transitionDefense: -0.03,
      };
    }
    if (phase === "very-late") {
      return {
        buildUp: 0.04,
        progression: 0.06,
        finalThird: 0.09,
        finishing: 0.1,
        defensiveSolidity: -0.06,
        pressing: 0.07,
        aerial: 0.01,
        transitionAttack: 0.09,
        transitionDefense: -0.05,
      };
    }
    return zero;
  }

  return zero;
}

export function getTimePhaseModifier(phase: TimePhase): PhaseModifierOverlay {
  if (phase === "very-late") {
    return {
      buildUp: -0.02,
      progression: -0.01,
      finalThird: 0,
      finishing: 0,
      defensiveSolidity: 0,
      pressing: -0.02,
      aerial: 0,
      transitionAttack: 0,
      transitionDefense: 0,
    };
  }
  if (phase === "late") {
    return {
      buildUp: -0.01,
      progression: 0,
      finalThird: 0,
      finishing: 0,
      defensiveSolidity: 0,
      pressing: -0.01,
      aerial: 0,
      transitionAttack: 0,
      transitionDefense: 0,
    };
  }
  return {
    buildUp: 0, progression: 0, finalThird: 0, finishing: 0,
    defensiveSolidity: 0, pressing: 0, aerial: 0,
    transitionAttack: 0, transitionDefense: 0,
  };
}

export function clampPhaseModifierOverlay(value: number): number {
  return Math.max(-0.12, Math.min(0.15, value));
}

export function clampOverlay(overlay: PhaseModifierOverlay): PhaseModifierOverlay {
  return {
    buildUp: clampPhaseModifierOverlay(overlay.buildUp),
    progression: clampPhaseModifierOverlay(overlay.progression),
    finalThird: clampPhaseModifierOverlay(overlay.finalThird),
    finishing: clampPhaseModifierOverlay(overlay.finishing),
    defensiveSolidity: clampPhaseModifierOverlay(overlay.defensiveSolidity),
    pressing: clampPhaseModifierOverlay(overlay.pressing),
    aerial: clampPhaseModifierOverlay(overlay.aerial),
    transitionAttack: clampPhaseModifierOverlay(overlay.transitionAttack),
    transitionDefense: clampPhaseModifierOverlay(overlay.transitionDefense),
  };
}

export function getManagerBiasOverlay(manager: Manager): PhaseModifierOverlay {
  const attackBias = (manager.attackingBias - 10) / 100;
  const defendBias = (manager.defensiveBias - 10) / 100;
  const gameMgmt = (manager.inGameManagement - 10) / 100;

  return {
    buildUp: attackBias * 0.3 + gameMgmt * 0.1,
    progression: attackBias * 0.3 + gameMgmt * 0.1,
    finalThird: attackBias * 0.5 + gameMgmt * 0.15,
    finishing: attackBias * 0.4 + gameMgmt * 0.1,
    defensiveSolidity: defendBias * 0.5 + gameMgmt * 0.15,
    pressing: attackBias * 0.2 + defendBias * 0.2 + gameMgmt * 0.1,
    aerial: defendBias * 0.2,
    transitionAttack: attackBias * 0.4 + gameMgmt * 0.15,
    transitionDefense: defendBias * 0.4 + gameMgmt * 0.1,
  };
}

export function getMomentumModifier(
  momentum: MomentumState,
  isHome: boolean,
  minute: number,
): PhaseModifierOverlay {
  const zero: PhaseModifierOverlay = {
    buildUp: 0, progression: 0, finalThird: 0, finishing: 0,
    defensiveSolidity: 0, pressing: 0, aerial: 0,
    transitionAttack: 0, transitionDefense: 0,
  };

  if (!momentum.active || momentum.team === null) return zero;
  if (minute > momentum.expiresAt) return zero;

  const isAttackingTeam = (momentum.team === "home") === isHome;

  if (isAttackingTeam) {
    return {
      buildUp: 0.03,
      progression: 0.04,
      finalThird: 0.05,
      finishing: 0.05,
      defensiveSolidity: -0.01,
      pressing: 0.04,
      aerial: 0.02,
      transitionAttack: 0.05,
      transitionDefense: -0.01,
    };
  }

  return {
    buildUp: -0.01,
    progression: -0.02,
    finalThird: -0.03,
    finishing: -0.03,
    defensiveSolidity: -0.01,
    pressing: -0.01,
    aerial: 0,
    transitionAttack: -0.02,
    transitionDefense: -0.01,
  };
}

export function createMomentumState(): MomentumState {
  return { active: false, team: null, expiresAt: 0 };
}

export function triggerGoalMomentum(
  momentum: MomentumState,
  scoringTeam: "home" | "away",
  minute: number,
): void {
  momentum.active = true;
  momentum.team = scoringTeam;
  momentum.expiresAt = minute + 5;
}

export function mergeOverlays(...overlays: PhaseModifierOverlay[]): PhaseModifierOverlay {
  const keys: (keyof PhaseModifierOverlay)[] = [
    "buildUp", "progression", "finalThird", "finishing",
    "defensiveSolidity", "pressing", "aerial",
    "transitionAttack", "transitionDefense",
  ];

  const result: PhaseModifierOverlay = {
    buildUp: 0, progression: 0, finalThird: 0, finishing: 0,
    defensiveSolidity: 0, pressing: 0, aerial: 0,
    transitionAttack: 0, transitionDefense: 0,
  };

  for (const overlay of overlays) {
    for (const key of keys) {
      result[key] += overlay[key];
    }
  }

  return result;
}

export function getEffectivePhaseScores(
  baseScores: PhaseScores,
  overlay: PhaseModifierOverlay,
): PhaseScores {
  const keys: (keyof PhaseScores)[] = [
    "buildUp", "progression", "finalThird", "finishing",
    "defensiveSolidity", "pressing", "aerial",
    "transitionAttack", "transitionDefense",
  ];

  const result: PhaseScores = { ...baseScores };

  for (const key of keys) {
    result[key] = baseScores[key] * (1 + overlay[key]);
  }

  return result;
}
