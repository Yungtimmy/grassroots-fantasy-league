import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const rules = await prisma.scoringRule.findMany({
      orderBy: [{ event: "asc" }, { position: "asc" }],
    });
    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("Get scoring rules error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { event, position, points, description } = body;

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event type is required" },
        { status: 400 }
      );
    }

    const rule = await prisma.scoringRule.create({
      data: {
        event,
        position: position || null,
        points: points ?? 0,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    console.error("Create scoring rule error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
