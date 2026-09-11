export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    const txns = await prisma.fantasyPointTransaction.groupBy({
      by: ["userId"],
      where: { gameweekId: gameweek.id },
      _sum: { totalPoints: true },
      orderBy: { _sum: { totalPoints: "desc" } },
    });

    const leaderboard = await Promise.all(
      txns.map(async (tx, i) => {
        const user = await prisma.user.findUnique({
          where: { id: tx.userId },
          select: { id: true, name: true, username: true },
        });

        const team = await prisma.fantasyTeam.findFirst({
          where: {
            userId: tx.userId,
            league: { seasonId },
          },
          include: {
            league: {
              include: {
                university: { select: { shortName: true, slug: true } },
              },
            },
          },
        });

        return {
          rank: i + 1,
          userId: tx.userId,
          playerName: user?.name ?? "Unknown",
          username: user?.username ?? "",
          university: team?.league.university.shortName ?? "",
          universitySlug: team?.league.university.slug ?? "",
          gwPoints: tx._sum.totalPoints ?? 0,
          totalPoints: team?.totalPoints ?? 0,
          movement: 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: { leaderboard } });
  } catch (error) {
    console.error("Get gameweek leaderboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
