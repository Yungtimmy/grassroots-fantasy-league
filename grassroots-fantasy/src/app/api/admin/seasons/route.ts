export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureLeaguesForSeason } from "@/lib/league";

export async function GET() {
  try {
    await requireAdmin();
    const seasons = await prisma.season.findMany({
      orderBy: { year: "desc" },
      include: {
        _count: { select: { leagues: true, gameweeks: true } },
      },
    });
    return NextResponse.json({ success: true, data: seasons });
  } catch (error) {
    console.error("Get admin seasons error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, year, startDate, endDate, registrationStart, registrationEnd, registrationFee } = body;

    if (!name || !year || !startDate || !endDate || !registrationStart || !registrationEnd) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    const season = await prisma.season.create({
      data: {
        name,
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationStart: new Date(registrationStart),
        registrationEnd: new Date(registrationEnd),
        registrationFee: registrationFee ?? 500,
        status: "active",
      },
    });

    await ensureLeaguesForSeason(season.id);

    return NextResponse.json({ success: true, data: season }, { status: 201 });
  } catch (error) {
    console.error("Create season error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
