import type { Club } from "../domain/club";

export const realMadrid: Club = {
  id: "real-madrid",
  name: "Real Madrid",
  shortName: "RMA",
  city: "Madrid",
  founded: 1902,
  nation: "Spain",
  league: "LaLiga",
  reputation: 91,
  status: "professional",
  finances: {
    balance: 117_000_000,
    transferBudget: 50_000_000,
    totalWages: 6_000_000,
    remainingWages: 6_000_000,
  },
  facilities: {
    trainingFacilities: 90,
    youthFacilities: 95,
    youthRecruitment: 95,
    juniorCoaching: 90,
  },
  homeAdvantage: 0.12,
};

export const manchesterUnited: Club = {
  id: "man-utd",
  name: "Manchester United",
  shortName: "MUN",
  city: "Manchester",
  founded: 1878,
  nation: "England",
  league: "Premier League",
  reputation: 85,
  status: "professional",
  finances: {
    balance: 85_000_000,
    transferBudget: 40_000_000,
    totalWages: 5_500_000,
    remainingWages: 5_000_000,
  },
  facilities: {
    trainingFacilities: 85,
    youthFacilities: 82,
    youthRecruitment: 80,
    juniorCoaching: 78,
  },
  homeAdvantage: 0.10,
};

export const allClubs: Club[] = [realMadrid, manchesterUnited];

export function getClubById(id: string): Club | undefined {
  return allClubs.find(c => c.id === id);
}
