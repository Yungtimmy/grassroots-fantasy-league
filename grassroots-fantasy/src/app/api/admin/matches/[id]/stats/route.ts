export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ScoringError, recomputeGameweekPoints } from "@/lib/scoring";

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

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { gameweekId: true },
    });
    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    const normalized = stats.map((stat) => ({
      playerId: String(stat?.playerId ?? ""),
      minutes: count(stat?.minutes),
      goals: count(stat?.goals),
      assists: count(stat?.assists),
      cleanSheet: Boolean(stat?.cleanSheet),
      saves: count(stat?.saves),
      yellowCards: count(stat?.yellowCards),
      redCards: count(stat?.redCards),
      ownGoals: count(stat?.ownGoals),
      penaltyMiss: count(stat?.penaltyMiss),
      penaltySave: count(stat?.penaltySave),
      goalsConceded: count(stat?.goalsConceded),
    }));

    if (normalized.some((stat) => !stat.playerId)) {
      return NextResponse.json(
        { success: false, error: "Every stat row needs a playerId" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const stat of normalized) {
        const data = {
          minutes: stat.minutes,
          goals: stat.goals,
          assists: stat.assists,
          cleanSheet: stat.cleanSheet,
          saves: stat.saves,
          yellowCards: stat.yellowCards,
          redCards: stat.redCards,
          ownGoals: stat.ownGoals,
          penaltyMiss: stat.penaltyMiss,
          penaltySave: stat.penaltySave,
          goalsConceded: stat.goalsConceded,
        };
        await tx.playerMatchStatistic.upsert({
          where: { playerId_matchId: { playerId: stat.playerId, matchId } },
          create: { playerId: stat.playerId, matchId, ...data },
          update: data,
        });
      }

      await recomputeGameweekPoints(match.gameweekId, tx);
    }, { maxWait: 10_000, timeout: 60_000 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update match stats error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof ScoringError
      ? error.status
      : message === "Forbidden"
        ? 403
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

function count(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}
