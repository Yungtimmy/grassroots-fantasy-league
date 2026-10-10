export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, removeAuthCookie } from "@/lib/auth";
import { getCurrentSeason } from "@/lib/league";
import { findDisplayedGameweek } from "@/lib/gameweek";
import { LeaderboardService } from "@/lib/leaderboard";

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      const season = await getCurrentSeason();
      if (!season) {
        return NextResponse.json({
          authenticated: false,
          points: 0,
          gameweekPoints: 0,
          universityRank: 0,
          grassrootsRank: 0,
          universityName: "",
          formation: "4-4-2",
          teamPlayers: [],
          nextGameweek: null,
          leagues: [],
          nearbyPlayers: [],
        });
      }

      const nextGameweek = await prisma.gameweek.findFirst({
        where: { seasonId: season.id, status: { in: ["upcoming", "active"] } },
        orderBy: { number: "asc" },
      });

      return NextResponse.json({
        authenticated: false,
        hasPaid: false,
        points: 0,
        gameweekPoints: 0,
        universityRank: 0,
        grassrootsRank: 0,
        universityName: "",
        formation: "4-4-2",
        teamPlayers: [],
        nextGameweek: nextGameweek
          ? { number: nextGameweek.number, deadline: nextGameweek.deadline.toISOString(), startDate: nextGameweek.startDate.toISOString(), status: nextGameweek.status }
          : null,
        leagues: [],
        nearbyPlayers: [],
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true },
    });
    if (!dbUser) {
      await removeAuthCookie();
      return NextResponse.json({
        authenticated: false,
        hasPaid: false,
        points: 0,
        gameweekPoints: 0,
        universityRank: 0,
        grassrootsRank: 0,
        universityName: "",
        formation: "4-4-2",
        teamPlayers: [],
        nextGameweek: null,
        leagues: [],
        nearbyPlayers: [],
      });
    }

    const season = await getCurrentSeason();

    if (!season) {
      return NextResponse.json({
        authenticated: true,
        hasPaid: false,
        points: 0,
        gameweekPoints: 0,
        universityRank: 0,
        grassrootsRank: 0,
        universityName: "",
        formation: "4-4-2",
        teamPlayers: [],
        nextGameweek: null,
        leagues: [],
        nearbyPlayers: [],
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
              include: { player: { include: { realTeam: { select: { shortName: true } } } } },
            },
          },
        })
      : null;

    let gameweekPoints = 0;
    const gwPointsByPlayer = new Map<string, number>();
    const displayedGameweek = await findDisplayedGameweek(season.id);
    const starterIds = team?.players.map((p) => p.playerId) ?? [];
    if (displayedGameweek && starterIds.length > 0) {
      const rows = await prisma.fantasyPointTransaction.findMany({
        where: {
          userId: authUser.userId,
          gameweekId: displayedGameweek.id,
          playerId: { in: starterIds },
        },
        select: { playerId: true, totalPoints: true },
      });
      for (const row of rows) {
        gwPointsByPlayer.set(row.playerId, (gwPointsByPlayer.get(row.playerId) ?? 0) + row.totalPoints);
      }
      gameweekPoints = [...gwPointsByPlayer.values()].reduce((sum, points) => sum + points, 0);
    }

    let universityRank = 0;
    let grassrootsRank = 0;
    let nearbyPlayers: Array<{ rank: number; name: string; points: number; isYou: boolean }> = [];

    if (membership) {
      const uniBoard = await LeaderboardService.getUniversityLeaderboard(
        membership.league.universityId,
        season.id
      );
      universityRank = uniBoard.find((e) => e.userId === authUser.userId)?.rank ?? 0;

      const grass = await LeaderboardService.getGrassrootsLeaderboard(season.id, 500, 0);
      grassrootsRank = grass.find((e) => e.userId === authUser.userId)?.rank ?? 0;

      const myRank = grassrootsRank;
      if (myRank > 0) {
        const start = Math.max(0, myRank - 6);
        nearbyPlayers = grass
          .slice(start, myRank + 5)
          .map((p) => ({
            rank: p.rank,
            name: p.username || p.name,
            points: p.totalPoints,
            isYou: p.userId === authUser.userId,
          }));
      }
    }

    const memberships = await prisma.universityLeagueMember.findMany({
      where: { userId: authUser.userId, status: "active" },
      include: {
        league: {
          include: {
            university: { select: { name: true, shortName: true, slug: true } },
            _count: { select: { members: true } },
          },
        },
      },
    });

    const leagues = memberships.map((m) => ({
      id: m.league.id,
      name: m.league.name || `${m.league.university.name} Fantasy League`,
      university: m.league.university,
      memberCount: m.league._count.members,
    }));

    const nextGameweek = await prisma.gameweek.findFirst({
      where: { seasonId: season.id, status: { in: ["upcoming", "active"] } },
      orderBy: { number: "asc" },
    });

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { name: true, email: true },
    });

    const hasPaid = await prisma.payment.findFirst({
      where: { userId: authUser.userId, seasonId: season.id, status: "successful" },
      select: { id: true },
    });

    return NextResponse.json({
      authenticated: true,
      user: user ? { name: user.name, email: user.email } : null,
      hasPaid: !!hasPaid,
      points: team?.totalPoints ?? 0,
      gameweekPoints,
      universityRank,
      grassrootsRank,
      universityName: membership?.league.university.name ?? "",
      formation: team?.formation ?? "4-4-2",
      teamPlayers:
        team?.players.map((p) => ({
          name: p.player.name,
          position: p.position,
          points: gwPointsByPlayer.get(p.playerId) ?? 0,
          realTeam: p.player.realTeam.shortName,
        })) ?? [],
      nextGameweek: nextGameweek
        ? { number: nextGameweek.number, deadline: nextGameweek.deadline.toISOString(), startDate: nextGameweek.startDate.toISOString(), status: nextGameweek.status }
        : null,
      leagues,
      nearbyPlayers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
