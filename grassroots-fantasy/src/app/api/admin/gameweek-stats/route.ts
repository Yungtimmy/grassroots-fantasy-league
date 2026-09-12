export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    
    const { searchParams } = new URL(request.url);
    const gameweekId = searchParams.get("gameweekId");
    
    if (!gameweekId) {
      const season = await prisma.season.findFirst({ where: { status: "active" }, orderBy: { year: "desc" } });
      if (!season) return NextResponse.json({ success: true, data: { gameweeks: [] } });
      
      const gameweeks = await prisma.gameweek.findMany({
        where: { seasonId: season.id },
        orderBy: { number: "asc" },
        select: { id: true, number: true, name: true, status: true },
      });
      return NextResponse.json({ success: true, data: { gameweeks } });
    }
    
    const mostSelected = await prisma.fantasyTeamPlayer.groupBy({
      by: ["playerId"],
      where: { isStarting: true, team: { league: { season: { status: "active" } } } },
      _count: { playerId: true },
      orderBy: { _count: { playerId: "desc" } },
      take: 10,
    });
    
    const playerIds = mostSelected.map((p) => p.playerId);
    const players = await prisma.realPlayer.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, name: true, position: true, realTeam: { select: { shortName: true } } },
    });
    
    const mostSelectedWithDetails = mostSelected.map((ms) => ({
      ...ms,
      player: players.find((p) => p.id === ms.playerId),
      selectedCount: ms._count.playerId,
    }));
    
    const topScorers = await prisma.fantasyPointTransaction.groupBy({
      by: ["playerId"],
      where: { gameweekId },
      _sum: { totalPoints: true },
      orderBy: { _sum: { totalPoints: "desc" } },
      take: 10,
    });
    
    const topScorerIds = topScorers.map((t) => t.playerId).filter(Boolean) as string[];
    const topPlayers = await prisma.realPlayer.findMany({
      where: { id: { in: topScorerIds } },
      select: { id: true, name: true, position: true, realTeam: { select: { shortName: true } } },
    });
    
    const topScorersWithDetails = topScorers.map((ts) => ({
      ...ts,
      player: topPlayers.find((p) => p.id === ts.playerId),
      totalPoints: ts._sum.totalPoints ?? 0,
    }));
    
    return NextResponse.json({
      success: true,
      data: { mostSelected: mostSelectedWithDetails, topScorers: topScorersWithDetails },
    });
  } catch (error) {
    console.error("Gameweek stats error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
