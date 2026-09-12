export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const season = await prisma.season.findFirst({
      where: { status: "active" },
      orderBy: { year: "desc" },
    });
    if (!season) {
      return NextResponse.json({ success: false, error: "No active season" }, { status: 404 });
    }

    const membership = await prisma.universityLeagueMember.findFirst({
      where: { userId: params.userId, league: { seasonId: season.id } },
      include: { league: { include: { university: { select: { name: true, shortName: true } } } } },
    });
    if (!membership) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const team = await prisma.fantasyTeam.findUnique({
      where: {
        userId_leagueId: { userId: params.userId, leagueId: membership.leagueId },
      },
      select: {
        name: true,
        formation: true,
        totalPoints: true,
        players: {
          select: {
            isCaptain: true,
            isViceCaptain: true,
            isStarting: true,
            position: true,
            player: {
              select: {
                name: true,
                position: true,
                price: true,
                totalPoints: true,
                realTeam: { select: { shortName: true } },
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: "No squad found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { name: true, username: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        userName: user?.name ?? "Player",
        username: user?.username ?? "",
        university: membership.league.university.shortName,
        teamName: team.name,
        formation: team.formation,
        totalPoints: team.totalPoints,
        players: team.players.map((p) => ({
          name: p.player.name,
          position: p.position,
          realTeam: p.player.realTeam.shortName,
          isCaptain: p.isCaptain,
          isViceCaptain: p.isViceCaptain,
          isStarting: p.isStarting,
          points: p.player.totalPoints,
        })),
      },
    });
  } catch (error) {
    console.error("Share squad error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
