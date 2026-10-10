export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ScoringError, recomputeGameweekPoints } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { gameweekId } = body;

    if (!gameweekId) {
      return NextResponse.json(
        { success: false, error: "gameweekId is required" },
        { status: 400 },
      );
    }

    const gameweek = await prisma.gameweek.findUnique({
      where: { id: gameweekId },
      select: { id: true, status: true },
    });

    if (!gameweek) {
      return NextResponse.json(
        { success: false, error: "Gameweek not found" },
        { status: 404 },
      );
    }

    if (gameweek.status !== "finished") {
      return NextResponse.json(
        { success: false, error: "Gameweek must be finished before applying scoring" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      (tx) => recomputeGameweekPoints(gameweekId, tx),
      { maxWait: 10_000, timeout: 60_000 },
    );

    return NextResponse.json({
      success: true,
      data: { gameweekId, processedStats: result.awardCount },
    });
  } catch (error) {
    console.error("Apply scoring error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof ScoringError
      ? error.status
      : message === "Forbidden"
        ? 403
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
