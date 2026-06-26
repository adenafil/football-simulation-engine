export type Formation =
  | "4-2-3-1"
  | "4-4-2"
  | "4-4-2 Diamond"
  | "4-3-3"
  | "3-5-2"
  | "3-4-3";

export type Mentality = "ultra-defensive" | "defensive" | "cautious" | "balanced" | "positive" | "attacking" | "ultra-attacking";

export type Tempo = "extremely-slow" | "slow" | "normal" | "fast" | "extremely-fast";

export type Width = "narrow" | "normal" | "wide";

export type PressingIntensity = "low" | "medium" | "high" | "extremely-high";

export type DefensiveLine = "deep" | "normal" | "high" | "extremely-high";

export type Directness = "short" | "mixed" | "direct" | "long";

export interface Tactic {
  formation: Formation;
  mentality: Mentality;
  tempo: Tempo;
  width: Width;
  pressing: PressingIntensity;
  defensiveLine: DefensiveLine;
  directness: Directness;
  counterAttack: boolean;
  counterPress: boolean;
  timeWasting: boolean;
  creativeFreedom: number;
  useOffsideTrap: boolean;
  focusPlay: "centre" | "left" | "right" | "mixed";
  defensiveShape: "compact" | "standard" | "spread";
}
