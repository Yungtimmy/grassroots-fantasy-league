import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getCurrentSeason } from "@/lib/league";
import { LeaderboardService } from "@/lib/leaderboard";

export async function GET() {
  try {
    const authUser = await requireAuth();
    const season = await getCurrentSeason();

    if (!season) {
      return NextResponse.json({
        points: 0,
        universityRank: 0,
        grassrootsRank: 0,
        universityName: "",
        formation: "4-4-2",
        teamPlayers: [],
        nextGameweek: null,
      });
    }

    const membership = await prisma.universityLeagueMember.findFirst({
      where: { userId: authUser.userId, league: { seasonId: season.id } },
      include: { league: { include: { university: true } } },
    });

    const team = membership
      ? await prisma.fantasyTeam.findUnique({
          where: {
            userId_leagueId: { userId: authUser.userId, leagueId: membership.leagueId },
          },
          include: {
            players: {
              where: { isStarting: true },
              include: { player: true },
            },
          },
        })
      : null;

    let universityRank = 0;
    let grassrootsRank = 0;
    if (membership) {
      const uniBoard = await LeaderboardService.getUniversityLeaderboard(
        membership.league.universityId,
        season.id
      );
      universityRank = uniBoard.find((e) => e.userId === authUser.userId)?.rank ?? 0;
      const grass = await LeaderboardService.getGrassrootsLeaderboard(season.id, 500, 0);
      grassrootsRank = grass.find((e) => e.userId === authUser.userId)?.rank ?? 0;
    }

    const nextGameweek = await prisma.gameweek.findFirst({
      where: {
        seasonId: season.id,
        status: { in: ["upcoming", "active"] },
      },
      orderBy: { number: "asc" },
    });

    return NextResponse.json({
      points: team?.totalPoints ?? 0,
      universityRank,
      grassrootsRank,
      universityName: membership?.league.university.name ?? "",
      formation: team?.formation ?? "4-4-2",
      teamPlayers:
        team?.players.map((p) => ({
          name: p.player.name,
          position: p.position,
          points: p.player.totalPoints,
        })) ?? [],
      nextGameweek: nextGameweek
        ? { number: nextGameweek.number, deadline: nextGameweek.deadline.toISOString() }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
