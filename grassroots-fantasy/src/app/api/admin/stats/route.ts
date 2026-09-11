export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const activeSeason = await prisma.season.findFirst({
      where: { status: "active" },
    });

    let currentGameweek: string | null = null;
    if (activeSeason) {
      const gw = await prisma.gameweek.findFirst({
        where: { seasonId: activeSeason.id, status: "active" },
        orderBy: { number: "desc" },
      });
      currentGameweek = gw ? `GW${gw.number} - ${gw.name}` : null;
    }

    const [totalUsers, registeredUsers, activeUniversities, revenueResult] =
      await Promise.all([
        prisma.user.count(),
        prisma.universityLeagueMember.count(),
        prisma.university.count({ where: { status: "active" } }),
        prisma.payment.aggregate({
          where: { status: "successful" },
          _sum: { amount: true },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        registeredUsers,
        activeUniversities,
        revenue: revenueResult._sum.amount ?? 0,
        activeSeason: activeSeason?.name ?? null,
        currentGameweek,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
