export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoUpdateMatchStatuses } from "@/lib/matches";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameweekId = searchParams.get("gameweekId");

    await autoUpdateMatchStatuses();

    const where = gameweekId ? { gameweekId } : {};

    const matches = await prisma.match.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        gameweek: { select: { id: true, number: true, name: true, status: true, startDate: true, endDate: true, deadline: true } },
      },
    });

    return NextResponse.json({ success: true, data: matches });
  } catch (error) {
    console.error("Get matches error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}
