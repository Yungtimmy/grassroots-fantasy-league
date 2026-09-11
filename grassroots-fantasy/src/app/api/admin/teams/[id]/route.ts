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
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.shortName) updateData.shortName = body.shortName;
    if (body.logo !== undefined) updateData.logo = body.logo || null;
    if (body.country) updateData.country = body.country;
    if (body.league) updateData.league = body.league;

    const team = await prisma.realTeam.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    console.error("Update club error:", error);
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
    const players = await prisma.realPlayer.count({ where: { realTeamId: params.id } });
    if (players > 0) {
      return NextResponse.json(
        { success: false, error: "Remove this club's players before deleting it" },
        { status: 400 }
      );
    }

    await prisma.realTeam.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete club error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
