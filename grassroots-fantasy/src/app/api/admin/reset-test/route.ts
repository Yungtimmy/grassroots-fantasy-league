export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUnlocked } from "@/lib/admin-session";
import { isTestDataResetEnabled } from "@/lib/reset-guard";

export async function POST() {
  if (!isTestDataResetEnabled()) {
    return NextResponse.json(
      { success: false, error: "Not available in this environment" },
      { status: 404 }
    );
  }

  if (!(await isAdminUnlocked())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const [pointTransactions, squadPlayers, teams, playerStats, matches, gameweeks] =
      await prisma.$transaction([
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
        pointTransactions: pointTransactions.count,
        squadPlayers: squadPlayers.count,
        teams: teams.count,
        playerStats: playerStats.count,
        matches: matches.count,
        gameweeks: gameweeks.count,
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
