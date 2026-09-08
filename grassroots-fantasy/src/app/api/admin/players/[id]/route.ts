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
    if (body.name) updateData.name = body.name;
    if (body.position) updateData.position = body.position;
    if (body.realTeamId) updateData.realTeamId = body.realTeamId;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.photo !== undefined) updateData.photo = body.photo || null;
    if (body.status) updateData.status = body.status;

    const player = await prisma.realPlayer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: player });
  } catch (error) {
    console.error("Update player error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
