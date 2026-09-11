export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureUniversityLeague } from "@/lib/league";
import { generateSlug } from "@/lib/utils";

export async function GET() {
  try {
    await requireAdmin();
    const universities = await prisma.university.findMany({
      orderBy: { name: "asc" },
      include: {
        leagues: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    const data = universities.map((uni) => ({
      ...uni,
      memberCount: uni.leagues.reduce((sum, l) => sum + l._count.members, 0),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get admin universities error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, shortName, slug, state, country, logo } = body;

    if (!name || !shortName) {
      return NextResponse.json(
        { success: false, error: "Name and short name are required" },
        { status: 400 }
      );
    }

    const university = await prisma.university.create({
      data: {
        name,
        shortName,
        slug: slug || generateSlug(name),
        state: state || null,
        country: country || "Nigeria",
        logo: logo || null,
        status: "active",
      },
    });

    await ensureUniversityLeague(university.id);

    return NextResponse.json({ success: true, data: university }, { status: 201 });
  } catch (error) {
    console.error("Create university error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" || message === "Unauthorized" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
