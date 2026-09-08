import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const teams = await prisma.realTeam.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { players: true } },
      },
    });
    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    console.error("Get admin teams error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, shortName, logo, country, league } = body;

    if (!name || !shortName) {
      return NextResponse.json(
        { success: false, error: "Name and short name are required" },
        { status: 400 }
      );
    }

    const team = await prisma.realTeam.create({
      data: {
        name,
        shortName,
        logo: logo || null,
        country: country || "England",
        league: league || "Premier League",
      },
    });

    return NextResponse.json({ success: true, data: team }, { status: 201 });
  } catch (error) {
    console.error("Create club error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
