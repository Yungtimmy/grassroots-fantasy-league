import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const gameweeks = await prisma.gameweek.findMany({
      orderBy: [{ number: "asc" }],
      include: {
        season: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ success: true, data: gameweeks });
  } catch (error) {
    console.error("Get admin gameweeks error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { seasonId, number, name, deadline, startDate, endDate } = body;

    if (!seasonId || !name || !deadline || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    const gameweek = await prisma.gameweek.create({
      data: {
        seasonId,
        number: number ?? 1,
        name,
        deadline: new Date(deadline),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json({ success: true, data: gameweek }, { status: 201 });
  } catch (error) {
    console.error("Create gameweek error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
