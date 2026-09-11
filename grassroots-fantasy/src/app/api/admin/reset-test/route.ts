import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const [txCount, squadCount, statsCount, matchCount, gwCount] = await prisma.$transaction([
      prisma.fantasyPointTransaction.deleteMany({}),
      prisma.fantasyTeamPlayer.deleteMany({}),
      prisma.fantasyTeam.deleteMany({}),
      prisma.playerMatchStatistic.deleteMany({}),
      prisma.match.deleteMany({}),
      prisma.gameweek.deleteMany({}),
    ]);

    await prisma.$transaction([
      prisma.realPlayer.updateMany({ data: { totalPoints: 0 } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Test data cleared.",
      details: {
        pointTransactions: txCount.count,
        squadPlayers: squadCount.count,
        teams: squadCount.count,
        playerStats: statsCount.count,
        matches: matchCount.count,
        gameweeks: gwCount.count,
      },
    });
  } catch (error) {
    console.error("Reset test error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to reset test data" },
      { status: 500 }
    );
  }
}
