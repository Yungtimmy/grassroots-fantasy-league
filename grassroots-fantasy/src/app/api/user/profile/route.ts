export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        role: true,
        facultyId: true,
        departmentId: true,
        createdAt: true,
        faculty: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const membership = await prisma.universityLeagueMember.findFirst({
      where: { userId: authUser.userId },
      include: { league: { include: { university: { select: { name: true, shortName: true } } } } },
    });

    const team = membership
      ? await prisma.fantasyTeam.findFirst({
          where: { userId: authUser.userId, leagueId: membership.leagueId },
          select: { totalPoints: true, formation: true },
        })
      : null;

    let rank = 0;
    if (membership) {
      const season = await prisma.season.findFirst({ where: { status: "active" }, orderBy: { year: "desc" } });
      if (season) {
        const board = await prisma.fantasyTeam.findMany({
          where: { leagueId: membership.leagueId },
          orderBy: { totalPoints: "desc" },
          select: { userId: true, totalPoints: true },
        });
        rank = board.findIndex((t) => t.userId === authUser.userId) + 1;
      }
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      username: user.username,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      faculty: user.faculty?.name || null,
      department: user.department?.name || null,
      universityName: membership?.league.university.name || null,
      universityShort: membership?.league.university.shortName || null,
      totalPoints: team?.totalPoints ?? 0,
      formation: team?.formation || null,
      rank,
      joinDate: user.createdAt,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, username, phone, avatar } = body;

    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: authUser.userId } },
      });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        ...(name && { name }),
        ...(username && { username }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(avatar !== undefined && { avatar: avatar || null }),
      },
      select: {
        name: true,
        username: true,
        phone: true,
        avatar: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
