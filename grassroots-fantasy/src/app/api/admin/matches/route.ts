import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { autoUpdateMatchStatuses } from "@/lib/matches";

export async function GET() {
  try {
    await requireAdmin();
    await autoUpdateMatchStatuses();
    const matches = await prisma.match.findMany({
      orderBy: { date: "asc" },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        gameweek: { select: { number: true, name: true } },
      },
    });

    const data = matches.map((m) => ({
      ...m,
      gameweekNumber: m.gameweek.number,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get admin matches error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { gameweekId, homeTeamId, awayTeamId, date, time, venue } = body;

    if (!gameweekId || !homeTeamId || !awayTeamId || !date) {
      return NextResponse.json(
        { success: false, error: "Gameweek, clubs, and date are required" },
        { status: 400 }
      );
    }

    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { success: false, error: "Home and away clubs must be different" },
        { status: 400 }
      );
    }

    const gameweek = await prisma.gameweek.findUnique({ where: { id: gameweekId } });
    if (!gameweek) {
      return NextResponse.json(
        { success: false, error: "Gameweek not found" },
        { status: 404 }
      );
    }

    const matchDate = time ? new Date(`${date}T${time}`) : new Date(date);

    const match = await prisma.match.create({
      data: {
        gameweekId,
        homeTeamId,
        awayTeamId,
        date: matchDate,
        time: time || null,
        venue: venue || null,
        status: "upcoming",
      },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
      },
    });

    return NextResponse.json({ success: true, data: match }, { status: 201 });
  } catch (error) {
    console.error("Create match error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
