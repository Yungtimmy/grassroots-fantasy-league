import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.homeScore !== undefined) updateData.homeScore = body.homeScore;
    if (body.awayScore !== undefined) updateData.awayScore = body.awayScore;
    if (body.gameweekId) updateData.gameweekId = body.gameweekId;
    if (body.homeTeamId) updateData.homeTeamId = body.homeTeamId;
    if (body.awayTeamId) updateData.awayTeamId = body.awayTeamId;
    if (body.venue !== undefined) updateData.venue = body.venue || null;
    if (body.time !== undefined) updateData.time = body.time || null;
    if (body.date) {
      updateData.date = body.time ? new Date(`${body.date}T${body.time}`) : new Date(body.date);
    }
    if (body.status) {
      updateData.status = body.status;
    } else if (body.homeScore !== undefined && body.awayScore !== undefined) {
      updateData.status = "finished";
    }

    const match = await prisma.match.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: match });
  } catch (error) {
    console.error("Update match error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    await prisma.playerMatchStatistic.deleteMany({ where: { matchId: params.id } });
    await prisma.match.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete match error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
