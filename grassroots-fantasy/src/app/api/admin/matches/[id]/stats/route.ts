import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id: matchId } = params;

    const stats = await prisma.playerMatchStatistic.findMany({
      where: { matchId },
      include: {
        player: { select: { id: true, name: true, position: true } },
      },
      orderBy: { player: { name: "asc" } },
    });

    const data = stats.map((s) => ({
      id: s.id,
      playerId: s.playerId,
      playerName: s.player.name,
      position: s.player.position,
      minutes: s.minutes,
      goals: s.goals,
      assists: s.assists,
      cleanSheet: s.cleanSheet,
      saves: s.saves,
      yellowCards: s.yellowCards,
      redCards: s.redCards,
      ownGoals: s.ownGoals,
      penaltyMiss: s.penaltyMiss,
      penaltySave: s.penaltySave,
      goalsConceded: s.goalsConceded,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get match stats error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id: matchId } = params;
    const body = await request.json();
    const { stats } = body;

    if (!Array.isArray(stats)) {
      return NextResponse.json(
        { success: false, error: "stats array is required" },
        { status: 400 }
      );
    }

    for (const stat of stats) {
      await prisma.playerMatchStatistic.upsert({
        where: {
          playerId_matchId: { playerId: stat.playerId, matchId },
        },
        create: {
          playerId: stat.playerId,
          matchId,
          minutes: stat.minutes ?? 0,
          goals: stat.goals ?? 0,
          assists: stat.assists ?? 0,
          cleanSheet: stat.cleanSheet ?? false,
          saves: stat.saves ?? 0,
          yellowCards: stat.yellowCards ?? 0,
          redCards: stat.redCards ?? 0,
          ownGoals: stat.ownGoals ?? 0,
          penaltyMiss: stat.penaltyMiss ?? 0,
          penaltySave: stat.penaltySave ?? 0,
          goalsConceded: stat.goalsConceded ?? 0,
        },
        update: {
          minutes: stat.minutes ?? 0,
          goals: stat.goals ?? 0,
          assists: stat.assists ?? 0,
          cleanSheet: stat.cleanSheet ?? false,
          saves: stat.saves ?? 0,
          yellowCards: stat.yellowCards ?? 0,
          redCards: stat.redCards ?? 0,
          ownGoals: stat.ownGoals ?? 0,
          penaltyMiss: stat.penaltyMiss ?? 0,
          penaltySave: stat.penaltySave ?? 0,
          goalsConceded: stat.goalsConceded ?? 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update match stats error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
