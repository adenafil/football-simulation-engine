export interface ClubFinances {
  balance: number;
  transferBudget: number;
  totalWages: number;
  remainingWages: number;
}

export interface ClubFacilities {
  trainingFacilities: number;
  youthFacilities: number;
  youthRecruitment: number;
  juniorCoaching: number;
}

export type ClubStatus = "professional" | "semi-professional" | "amateur";

export interface Club {
  id: string;
  name: string;
  shortName: string;
  city: string;
  founded: number;
  nation: string;
  league: string;
  reputation: number;
  status: ClubStatus;
  finances: ClubFinances;
  facilities: ClubFacilities;
  homeAdvantage: number;
}
