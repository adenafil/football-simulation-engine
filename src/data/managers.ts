import type { Manager } from "../domain/manager";

export const carloAncelotti: Manager = {
  id: "ancelotti",
  name: "Carlo Ancelotti",
  age: 65,
  nationality: "Italy",
  tacticalDiscipline: 80,
  adaptability: 90,
  motivation: 80,
  manManagement: 95,
  attackingBias: 65,
  defensiveBias: 60,
  rotation: 70,
  inGameManagement: 85,
  youthDevelopment: 75,
  squadSquadRotation: 70,
  preferredFormations: ["4-3-3", "4-2-3-1", "4-4-2 Diamond"],
};

export const erikTenHag: Manager = {
  id: "ten-hag",
  name: "Erik ten Hag",
  age: 54,
  nationality: "Netherlands",
  tacticalDiscipline: 88,
  adaptability: 72,
  motivation: 78,
  manManagement: 72,
  attackingBias: 75,
  defensiveBias: 55,
  rotation: 65,
  inGameManagement: 72,
  youthDevelopment: 85,
  squadSquadRotation: 60,
  preferredFormations: ["4-3-3", "4-2-3-1", "3-5-2"],
};

export const allManagers: Manager[] = [carloAncelotti, erikTenHag];

export function getManagerById(id: string): Manager | undefined {
  return allManagers.find(m => m.id === id);
}
