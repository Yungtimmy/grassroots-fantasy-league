export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.number) updateData.number = body.number;
    if (body.name) updateData.name = body.name;
    if (body.deadline) updateData.deadline = new Date(body.deadline);
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);
    if (body.status) updateData.status = body.status;

    const gameweek = await prisma.gameweek.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: gameweek });
  } catch (error) {
    console.error("Update gameweek error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
