import type { Formation } from "./domain/tactic";
import type { MatchContext, MatchResult, VenueType } from "./domain/match-context";
import type { Manager } from "./domain/manager";
import { getPlayersByClub } from "./data/players";
import { getClubById } from "./data/clubs";
import { getManagerById } from "./data/managers";
import { buildDefaultTactic, buildLineup } from "./engine/lineup-builder";
import { simulateMatch, type TeamSetup } from "./engine/match-simulator";

function buildDefaultManager(name: string, formation: Formation): Manager {
  return {
    id: "default",
    name,
    age: 50,
    nationality: "Unknown",
    tacticalDiscipline: 70,
    adaptability: 70,
    motivation: 70,
    manManagement: 70,
    attackingBias: 55,
    defensiveBias: 50,
    rotation: 50,
    inGameManagement: 65,
    youthDevelopment: 60,
    squadSquadRotation: 50,
    preferredFormations: [formation],
  };
}

export function simulateFootballMatch(
  homeClubId: string,
  awayClubId: string,
  homeFormation: Formation = "4-3-3",
  awayFormation: Formation = "4-2-3-1",
  venueType: VenueType = "neutral",
  homeManagerId?: string,
  awayManagerId?: string,
): MatchResult {
  const homeClub = getClubById(homeClubId);
  const awayClub = getClubById(awayClubId);

  if (!homeClub || !awayClub) {
    throw new Error("Club not found");
  }

  const homeLineup = buildLineup(getPlayersByClub(homeClubId), homeFormation);
  const awayLineup = buildLineup(getPlayersByClub(awayClubId), awayFormation);
  const homeManager = homeManagerId ? getManagerById(homeManagerId) : undefined;
  const awayManager = awayManagerId ? getManagerById(awayManagerId) : undefined;

  const context: MatchContext = {
    venueType,
    weather: "clear",
    importance: "league",
    competitionType: "league",
    isDerby: false,
  };

  const homeSetup: TeamSetup = {
    club: homeClub,
    manager: homeManager ?? buildDefaultManager(`${homeClub.name} Manager`, homeFormation),
    tactic: buildDefaultTactic(homeFormation, "positive"),
    outfield: homeLineup.outfield,
    goalkeeper: homeLineup.goalkeeper,
    bench: homeLineup.bench,
  };

  const awaySetup: TeamSetup = {
    club: awayClub,
    manager: awayManager ?? buildDefaultManager(`${awayClub.name} Manager`, awayFormation),
    tactic: buildDefaultTactic(awayFormation, "balanced"),
    outfield: awayLineup.outfield,
    goalkeeper: awayLineup.goalkeeper,
    bench: awayLineup.bench,
  };

  return simulateMatch(homeSetup, awaySetup, context);
}

function formatMatchResult(result: MatchResult): void {
  const line = "=".repeat(60);
  const subline = "-".repeat(60);

  console.log(`\n${line}`);
  console.log(`  ${result.homeTeamName} vs ${result.awayTeamName}`);
  console.log(`  ${result.homeFormation} vs ${result.awayFormation}`);
  console.log(line);
  console.log(`  ${result.homeTeamName}  ${result.homeScore} - ${result.awayScore}  ${result.awayTeamName}`);
  console.log(line);

  console.log("\n  Match Stats:");
  console.log(subline);
  console.log(`  Possession:    ${result.stats.possession.home}% - ${result.stats.possession.away}%`);
  console.log(`  Shots:         ${result.stats.shots.home} - ${result.stats.shots.away}`);
  console.log(`  Shots on Target: ${result.stats.shotsOnTarget.home} - ${result.stats.shotsOnTarget.away}`);
  console.log(`  xG:            ${result.stats.xG.home.toFixed(2)} - ${result.stats.xG.away.toFixed(2)}`);
  console.log(`  Corners:       ${result.stats.corners.home} - ${result.stats.corners.away}`);
  console.log(`  Fouls:         ${result.stats.fouls.home} - ${result.stats.fouls.away}`);
  console.log(`  Yellow Cards:  ${result.stats.yellowCards.home} - ${result.stats.yellowCards.away}`);
  console.log(`  Offsides:      ${result.stats.offsides.home} - ${result.stats.offsides.away}`);

  console.log("\n  Key Events:");
  console.log(subline);
  for (const goal of result.events.filter(event => event.phase === "goal")) {
    console.log(`  ${goal.description}`);
  }

  for (const shot of result.events.filter(event => event.phase === "shot").slice(0, 5)) {
    console.log(`  ${shot.description}`);
  }

  const substitutions = result.events.filter(event => event.phase === "substitution");
  if (substitutions.length > 0) {
    console.log("\n  Substitutions:");
    for (const substitution of substitutions) {
      console.log(`  ${substitution.description}`);
    }
  }

  console.log(`\n  Man of the Match: ${result.manOfMatch}`);
  console.log("\n  Player Ratings:");
  console.log(subline);
  for (const rating of result.playerRatings.sort((a, b) => b.rating - a.rating).slice(0, 10)) {
    console.log(`  ${rating.name.padEnd(22)} ${rating.rating.toFixed(1)}  (G:${rating.goals}  KP:${rating.keyPasses}  T:${rating.tackles})`);
  }
  console.log();
}

export function simulateMatchCLI(homeTeam: string = "real-madrid", awayTeam: string = "man-utd"): void {
  const result = simulateFootballMatch(homeTeam, awayTeam, "4-3-3", "4-2-3-1", "neutral", "ancelotti", "ten-hag");
  formatMatchResult(result);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const homeTeam = args[0] || "real-madrid";
  const awayTeam = args[1] || "man-utd";
  console.log("\n🚀 Football Simulation Engine");
  console.log(`   ${getClubById(homeTeam)?.name ?? homeTeam} vs ${getClubById(awayTeam)?.name ?? awayTeam}\n`);
  simulateMatchCLI(homeTeam, awayTeam);
}
