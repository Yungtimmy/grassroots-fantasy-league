import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST() {
  try {
    await requireAdmin();

    const [txCount] = await prisma.$transaction([
      prisma.fantasyPointTransaction.deleteMany({}),
    ]);

    await prisma.$transaction([
      prisma.fantasyTeam.updateMany({ data: { totalPoints: 0 } }),
      prisma.realPlayer.updateMany({ data: { totalPoints: 0 } }),
      prisma.playerMatchStatistic.deleteMany({}),
      prisma.match.updateMany({
        data: { homeScore: null, awayScore: null, status: "upcoming" },
      }),
      prisma.gameweek.updateMany({
        data: { status: "upcoming" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Test data cleared. All points, match stats, and statuses reset.",
      deletedTransactions: txCount.count,
    });
  } catch (error) {
    console.error("Reset test error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset test data" },
      { status: 500 }
    );
  }
}
