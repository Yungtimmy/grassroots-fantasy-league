export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

export async function GET() {
  try {
    await requireAdmin();

    const leagues = await prisma.universityLeague.findMany({
      include: {
        university: { select: { id: true, name: true, shortName: true } },
        season: { select: { id: true, name: true, status: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = leagues.map((l) => ({
      id: l.id,
      name: l.name || `${l.university.name} Fantasy League`,
      description: l.description,
      entryFee: l.entryFee,
      prizeInfo: l.prizeInfo,
      rules: l.rules,
      status: l.status,
      memberCount: l._count.members,
      university: l.university,
      season: l.season,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching admin leagues:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, description, universityId, seasonId, entryFee, prizeInfo, rules } = body;

    if (!universityId || !seasonId) {
      return NextResponse.json(
        { success: false, error: "University and Season are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.universityLeague.findUnique({
      where: { universityId_seasonId: { universityId, seasonId } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A league already exists for this university in this season" },
        { status: 409 }
      );
    }

    const league = await prisma.universityLeague.create({
      data: {
        name: name || undefined,
        description: description || undefined,
        universityId,
        seasonId,
        entryFee: entryFee || undefined,
        prizeInfo: prizeInfo || undefined,
        rules: rules || undefined,
      },
    });

    return NextResponse.json({ success: true, data: league }, { status: 201 });
  } catch (error) {
    console.error("Error creating league:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
