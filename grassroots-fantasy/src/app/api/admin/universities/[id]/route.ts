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
    if (body.name) updateData.name = body.name;
    if (body.shortName) updateData.shortName = body.shortName;
    if (body.slug) updateData.slug = body.slug;
    if (body.state !== undefined) updateData.state = body.state || null;
    if (body.country) updateData.country = body.country;
    if (body.logo !== undefined) updateData.logo = body.logo || null;
    if (body.status) updateData.status = body.status;

    const university = await prisma.university.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: university });
  } catch (error) {
    console.error("Update university error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
