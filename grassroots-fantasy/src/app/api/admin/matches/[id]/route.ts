export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  FixtureAdminError,
  buildMatchUpdate,
  recomputePlanForFixtureDelete,
  recomputePlanForFixtureEdit,
} from "@/lib/fixture-admin";
import { ScoringError, recomputeGameweekPoints } from "@/lib/scoring";

const TX = { maxWait: 10_000, timeout: 60_000 } as const;

function errorResponse(error: unknown) {
  console.error("Admin match error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  const status = error instanceof ScoringError || error instanceof FixtureAdminError
    ? error.status
    : message === "Forbidden" || message === "Unauthorized"
      ? 403
      : 500;
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();

    const match = await prisma.$transaction(async (tx) => {
      const existing = await tx.match.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          gameweekId: true,
          _count: { select: { playerStats: true } },
        },
      });
      if (!existing) throw new FixtureAdminError("Match not found", 404);

      const nextGameweekId = typeof body.gameweekId === "string" && body.gameweekId
        ? body.gameweekId
        : existing.gameweekId;

      if (nextGameweekId !== existing.gameweekId) {
        const target = await tx.gameweek.findUnique({
          where: { id: nextGameweekId },
          select: { id: true },
        });
        if (!target) throw new FixtureAdminError("Gameweek not found", 404);
      }

      const updated = await tx.match.update({
        where: { id: params.id },
        data: buildMatchUpdate(body),
      });

      const gameweekIds = recomputePlanForFixtureEdit({
        statCount: existing._count.playerStats,
        previousGameweekId: existing.gameweekId,
        nextGameweekId,
        body,
      });
      for (const gameweekId of gameweekIds) {
        await recomputeGameweekPoints(gameweekId, tx);
      }

      return updated;
    }, TX);

    return NextResponse.json({ success: true, data: match });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const existing = await tx.match.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          gameweekId: true,
          _count: { select: { playerStats: true } },
        },
      });
      if (!existing) throw new FixtureAdminError("Match not found", 404);

      await tx.playerMatchStatistic.deleteMany({ where: { matchId: params.id } });
      await tx.match.delete({ where: { id: params.id } });

      for (const gameweekId of recomputePlanForFixtureDelete(existing._count.playerStats, existing.gameweekId)) {
        await recomputeGameweekPoints(gameweekId, tx);
      }
    }, TX);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
