export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const position = searchParams.get("position");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (position) {
      where.position = position;
    }

    const players = await prisma.realPlayer.findMany({
      where,
      include: {
        realTeam: {
          select: { id: true, name: true, shortName: true, logo: true },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: { items: players } });
  } catch (error) {
    console.error("Get admin players error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, position, realTeamId, price, photo } = body;

    if (!name || !position || !realTeamId) {
      return NextResponse.json(
        { success: false, error: "Name, position, and team are required" },
        { status: 400 }
      );
    }

    const player = await prisma.realPlayer.create({
      data: {
        name,
        position,
        realTeamId,
        price: price ?? 100,
        photo: photo || null,
      },
    });

    return NextResponse.json({ success: true, data: player }, { status: 201 });
  } catch (error) {
    console.error("Create player error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
