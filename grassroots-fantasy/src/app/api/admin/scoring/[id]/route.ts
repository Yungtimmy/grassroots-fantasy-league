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
    if (body.event) updateData.event = body.event;
    if (body.position !== undefined) updateData.position = body.position || null;
    if (body.points !== undefined) updateData.points = body.points;
    if (body.description !== undefined) updateData.description = body.description || null;

    const rule = await prisma.scoringRule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error("Update scoring rule error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;
    await prisma.scoringRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete scoring rule error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
