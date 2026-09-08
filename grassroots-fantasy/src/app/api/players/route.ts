import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position");
    const team = searchParams.get("team");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "name";
    const order = (searchParams.get("order") || "asc") as "asc" | "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = { status: "active" };

    if (position && position !== "ALL") where.position = position;
    if (team) where.realTeamId = team;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const orderBy: Record<string, string> = {};
    if (sort === "price") orderBy.price = order;
    else if (sort === "points" || sort === "totalPoints") orderBy.totalPoints = order === "asc" && sort === "points" ? "desc" : order;
    else orderBy.name = order;

    if (sort === "points") orderBy.totalPoints = "desc";

    const [players, total] = await Promise.all([
      prisma.realPlayer.findMany({
        where,
        include: {
          realTeam: {
            select: { id: true, name: true, shortName: true, logo: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.realPlayer.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: players,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get players error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
