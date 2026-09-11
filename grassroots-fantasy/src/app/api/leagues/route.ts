export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const universitySlug = searchParams.get("university");

    const where: any = { status: "open" };

    if (universitySlug) {
      const university = await prisma.university.findUnique({
        where: { slug: universitySlug },
        select: { id: true },
      });
      if (university) {
        where.universityId = university.id;
      }
    }

    const leagues = await prisma.universityLeague.findMany({
      where,
      include: {
        university: {
          select: { id: true, name: true, shortName: true, slug: true, logo: true },
        },
        season: {
          select: { id: true, name: true, status: true, registrationEnd: true, registrationFee: true },
        },
        _count: { select: { members: true, teams: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = leagues.map((l) => ({
      id: l.id,
      name: l.name || `${l.university.name} Fantasy League`,
      description: l.description || `Compete against fellow students at ${l.university.name}`,
      entryFee: l.entryFee ?? l.season.registrationFee,
      prizeInfo: l.prizeInfo,
      rules: l.rules,
      status: l.status,
      memberCount: l._count.members,
      teamCount: l._count.teams,
      university: l.university,
      season: l.season,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({ success: true, data: { leagues: formatted } });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
