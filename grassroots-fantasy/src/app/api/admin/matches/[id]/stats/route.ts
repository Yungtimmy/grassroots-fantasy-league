export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ScoringService } from "@/lib/scoring";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id: matchId } = params;

    // Get the match to find both teams
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    // Load all players from both teams
    const players = await prisma.realPlayer.findMany({
      where: { realTeamId: { in: [match.homeTeamId, match.awayTeamId] } },
      select: { id: true, name: true, position: true, realTeamId: true },
      orderBy: { name: "asc" },
    });

    // Load existing stats for this match
    const existingStats = await prisma.playerMatchStatistic.findMany({
      where: { matchId },
    });

    const statsMap = new Map(existingStats.map((s) => [s.playerId, s]));

    // Merge: all players with their stats (or defaults)
    const data = players.map((p) => {
      const stat = statsMap.get(p.id);
      return {
        id: stat?.id ?? `new-${p.id}`,
        playerId: p.id,
        playerName: p.name,
        position: p.position,
        teamId: p.realTeamId,
        isHome: p.realTeamId === match.homeTeamId,
        minutes: stat?.minutes ?? 0,
        goals: stat?.goals ?? 0,
        assists: stat?.assists ?? 0,
        cleanSheet: stat?.cleanSheet ?? false,
        saves: stat?.saves ?? 0,
        yellowCards: stat?.yellowCards ?? 0,
        redCards: stat?.redCards ?? 0,
        ownGoals: stat?.ownGoals ?? 0,
        penaltyMiss: stat?.penaltyMiss ?? 0,
        penaltySave: stat?.penaltySave ?? 0,
        goalsConceded: stat?.goalsConceded ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      match: {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    });
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
      // Skip players with no meaningful data
      const hasData = stat.minutes > 0 || stat.goals > 0 || stat.assists > 0 ||
        stat.saves > 0 || stat.yellowCards > 0 || stat.redCards > 0 ||
        stat.ownGoals > 0 || stat.penaltyMiss > 0 || stat.penaltySave > 0 ||
        stat.goalsConceded > 0 || stat.cleanSheet;

      if (!hasData) continue;

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

    // Auto-run scoring after saving stats
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { gameweekId: true },
      });
      if (match) {
        await ScoringService.calculateAllPoints(matchId, match.gameweekId);
      }
    } catch (scoringError) {
      console.error("Auto-scoring failed:", scoringError);
      // Don't fail the request, stats were saved
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update match stats error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
