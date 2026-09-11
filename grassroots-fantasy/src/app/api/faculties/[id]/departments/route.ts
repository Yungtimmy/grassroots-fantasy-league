export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const departments = await prisma.department.findMany({
      where: { facultyId: params.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: { departments } });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
