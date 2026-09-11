export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const league = await prisma.universityLeague.findUnique({
      where: { id: params.id },
      include: {
        university: {
          select: { id: true, name: true, shortName: true, slug: true, logo: true, state: true },
        },
        season: {
          select: { id: true, name: true, status: true, registrationEnd: true, registrationFee: true },
        },
        _count: { select: { members: true, teams: true } },
      },
    });

    if (!league) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: league.id,
        name: league.name || `${league.university.name} Fantasy League`,
        description: league.description || `Compete against fellow students at ${league.university.name}`,
        entryFee: league.entryFee ?? league.season.registrationFee,
        prizeInfo: league.prizeInfo,
        rules: league.rules,
        status: league.status,
        memberCount: league._count.members,
        teamCount: league._count.teams,
        university: league.university,
        season: league.season,
        createdAt: league.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching league:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
