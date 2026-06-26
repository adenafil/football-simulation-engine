import type { Tactic, Formation, Mentality, Tempo, Width, PressingIntensity, DefensiveLine, Directness } from "../domain/tactic";

export interface PhaseModifiers {
  buildUp: number;
  progression: number;
  finalThird: number;
  finishing: number;
  defensiveSolidity: number;
  pressing: number;
  aerial: number;
  transitionAttack: number;
  transitionDefense: number;
  possession: number;
  widthBonus: number;
  creativity: number;
}

export function getFormationModifiers(formation: Formation): Partial<PhaseModifiers> {
  switch (formation) {
    case "4-2-3-1":
      return {
        buildUp: 0.05,
        progression: 0.05,
        finalThird: 0.1,
        defensiveSolidity: 0.05,
        transitionAttack: 0.05,
        possession: 0.05,
      };
    case "4-4-2":
      return {
        defensiveSolidity: 0.1,
        transitionAttack: 0.08,
        pressing: 0.05,
        widthBonus: 0.1,
        possession: -0.05,
      };
    case "4-4-2 Diamond":
      return {
        buildUp: 0.05,
        progression: 0.1,
        finalThird: 0.05,
        pressing: 0.05,
        defensiveSolidity: -0.05,
        widthBonus: -0.15,
        possession: 0.05,
      };
    case "4-3-3":
      return {
        buildUp: 0.05,
        progression: 0.08,
        finalThird: 0.05,
        pressing: 0.1,
        widthBonus: 0.15,
        possession: 0.05,
        transitionDefense: -0.05,
      };
    case "3-5-2":
      return {
        defensiveSolidity: 0.05,
        pressing: 0.08,
        progression: 0.05,
        widthBonus: 0.15,
        transitionDefense: 0.05,
        aerial: 0.1,
        possession: 0.05,
      };
    case "3-4-3":
      return {
        finalThird: 0.1,
        finishing: 0.05,
        pressing: 0.1,
        transitionAttack: 0.1,
        widthBonus: 0.15,
        defensiveSolidity: -0.1,
        transitionDefense: -0.1,
      };
    default:
      return {};
  }
}

const mentalityModifiers: Record<Mentality, Partial<PhaseModifiers>> = {
  "ultra-defensive": { buildUp: -0.15, progression: -0.15, finalThird: -0.15, finishing: -0.1, pressing: -0.1, defensiveSolidity: 0.2, transitionAttack: -0.1, transitionDefense: 0.15, possession: -0.1 },
  defensive: { buildUp: -0.1, progression: -0.1, finalThird: -0.1, finishing: -0.05, pressing: -0.05, defensiveSolidity: 0.15, transitionAttack: -0.05, transitionDefense: 0.1, possession: -0.05 },
  cautious: { buildUp: -0.05, progression: -0.05, finalThird: -0.05, finishing: -0.02, defensiveSolidity: 0.08, transitionDefense: 0.05, possession: -0.02 },
  balanced: {},
  positive: { buildUp: 0.03, progression: 0.03, finalThird: 0.05, finishing: 0.02, pressing: 0.03, defensiveSolidity: -0.03, transitionAttack: 0.05, transitionDefense: -0.03, possession: 0.02 },
  attacking: { buildUp: 0.05, progression: 0.08, finalThird: 0.1, finishing: 0.05, pressing: 0.05, defensiveSolidity: -0.08, transitionAttack: 0.1, transitionDefense: -0.05, possession: 0.03 },
  "ultra-attacking": { buildUp: 0.08, progression: 0.12, finalThird: 0.15, finishing: 0.08, pressing: 0.08, defensiveSolidity: -0.15, transitionAttack: 0.15, transitionDefense: -0.1, possession: 0.05 },
};

const tempoModifiers: Record<Tempo, Partial<PhaseModifiers>> = {
  "extremely-slow": { buildUp: 0.05, pressing: -0.05, transitionAttack: -0.1, possession: 0.05, creativity: -0.05 },
  slow: { buildUp: 0.03, pressing: -0.02, transitionAttack: -0.05, possession: 0.03, creativity: -0.02 },
  normal: {},
  fast: { pressing: 0.03, transitionAttack: 0.05, possession: -0.03, creativity: 0.03 },
  "extremely-fast": { pressing: 0.05, transitionAttack: 0.1, possession: -0.05, creativity: 0.05 },
};

const widthModifiers: Record<Width, Partial<PhaseModifiers>> = {
  narrow: { progression: -0.03, widthBonus: -0.15, defensiveSolidity: 0.05, pressing: 0.05 },
  normal: {},
  wide: { progression: 0.03, widthBonus: 0.15, defensiveSolidity: -0.03, pressing: -0.03 },
};

const pressingModifiers: Record<PressingIntensity, Partial<PhaseModifiers>> = {
  low: { pressing: -0.15, defensiveSolidity: -0.05, staminaDrain: 0.5 as unknown as number },
  medium: { pressing: 0, staminaDrain: 1 as unknown as number },
  high: { pressing: 0.15, defensiveSolidity: 0.05, staminaDrain: 1.5 as unknown as number },
  "extremely-high": { pressing: 0.25, defensiveSolidity: 0.1, staminaDrain: 2 as unknown as number },
};

const defensiveLineModifiers: Record<DefensiveLine, Partial<PhaseModifiers>> = {
  deep: { defensiveSolidity: 0.08, pressing: -0.05, transitionDefense: 0.1, aerial: 0.05 },
  normal: {},
  high: { defensiveSolidity: -0.05, pressing: 0.08, transitionAttack: 0.05, transitionDefense: -0.05, aerial: -0.05 },
  "extremely-high": { defensiveSolidity: -0.1, pressing: 0.15, transitionAttack: 0.08, transitionDefense: -0.1, aerial: -0.1 },
};

const directnessModifiers: Record<Directness, Partial<PhaseModifiers>> = {
  short: { buildUp: 0.08, progression: 0.05, possession: 0.08, transitionAttack: -0.05, creativity: 0.05 },
  mixed: {},
  direct: { buildUp: -0.05, progression: -0.05, transitionAttack: 0.1, possession: -0.05, finishing: 0.03 },
  long: { buildUp: -0.1, progression: -0.08, transitionAttack: 0.15, possession: -0.1, aerial: 0.08, finishing: 0.05 },
};

export function getTacticModifiers(tactic: Tactic): PhaseModifiers {
  const formation = getFormationModifiers(tactic.formation);
  const mentality = mentalityModifiers[tactic.mentality];
  const tempo = tempoModifiers[tactic.tempo];
  const width = widthModifiers[tactic.width];
  const pressing = pressingModifiers[tactic.pressing];
  const defLine = defensiveLineModifiers[tactic.defensiveLine];
  const directness = directnessModifiers[tactic.directness];

  const merge = (...sources: Partial<PhaseModifiers>[]): PhaseModifiers => {
    const base: PhaseModifiers = {
      buildUp: 0, progression: 0, finalThird: 0, finishing: 0,
      defensiveSolidity: 0, pressing: 0, aerial: 0,
      transitionAttack: 0, transitionDefense: 0, possession: 0,
      widthBonus: 0, creativity: 0,
    };
    for (const src of sources) {
      for (const [key, val] of Object.entries(src)) {
        if (key !== "staminaDrain" && typeof val === "number") {
          (base as any)[key] = ((base as any)[key] ?? 0) + val;
        }
      }
    }
    return base;
  };

  return merge(formation, mentality, tempo, width, pressing, defLine, directness);
}

export function getStaminaDrainMultiplier(pressing: PressingIntensity): number {
  return pressingModifiers[pressing]?.staminaDrain as number ?? 1;
}
