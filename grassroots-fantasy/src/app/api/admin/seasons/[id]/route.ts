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
    if (body.year) updateData.year = body.year;
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);
    if (body.registrationStart) updateData.registrationStart = new Date(body.registrationStart);
    if (body.registrationEnd) updateData.registrationEnd = new Date(body.registrationEnd);
    if (body.registrationFee !== undefined) updateData.registrationFee = body.registrationFee;
    if (body.status) updateData.status = body.status;

    const season = await prisma.season.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: season });
  } catch (error) {
    console.error("Update season error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
