export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gameweekPointsByTeam } from "@/lib/scoring";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");
    const gameweekNum = searchParams.get("gameweek");

    if (!seasonId) {
      return NextResponse.json(
        { success: false, error: "seasonId is required" },
        { status: 400 }
      );
    }

    const gwNumber = parseInt(gameweekNum || "1", 10);

    const gameweek = await prisma.gameweek.findFirst({
      where: { seasonId, number: gwNumber },
    });

    if (!gameweek) {
      return NextResponse.json({ success: true, data: { leaderboard: [] } });
    }

    const teams = await prisma.fantasyTeam.findMany({
      where: { league: { seasonId } },
      include: {
        user: { select: { id: true, name: true, username: true } },
        league: {
          include: {
            university: { select: { shortName: true, slug: true } },
          },
        },
      },
    });

    const byTeam = await gameweekPointsByTeam(prisma, {
      seasonId,
      gameweekId: gameweek.id,
      teams: teams.map((team) => ({ teamId: team.id, userId: team.userId })),
    });

    const leaderboard = teams
      .map((team) => ({
        teamId: team.id,
        userId: team.userId,
        playerName: team.user.name,
        username: team.user.username,
        university: team.league.university.shortName,
        universitySlug: team.league.university.slug,
        gwPoints: byTeam[team.id] ?? 0,
        totalPoints: team.totalPoints,
        movement: 0,
      }))
      .filter((entry) => entry.gwPoints !== 0)
      .sort((a, b) => b.gwPoints - a.gwPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return NextResponse.json({ success: true, data: { leaderboard } });
  } catch (error) {
    console.error("Get gameweek leaderboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
