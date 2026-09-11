export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { gameweekId } = body;

    if (!gameweekId) {
      return NextResponse.json(
        { success: false, error: "gameweekId is required" },
        { status: 400 }
      );
    }

    const gameweek = await prisma.gameweek.findUnique({
      where: { id: gameweekId },
      include: {
        matches: {
          include: {
            playerStats: {
              include: { player: true },
            },
          },
        },
      },
    });

    if (!gameweek) {
      return NextResponse.json(
        { success: false, error: "Gameweek not found" },
        { status: 404 }
      );
    }

    if (gameweek.status !== "finished") {
      return NextResponse.json(
        { success: false, error: "Gameweek must be finished before applying scoring" },
        { status: 400 }
      );
    }

    // Reset existing points for this gameweek before re-applying
    const existingTxs = await prisma.fantasyPointTransaction.findMany({
      where: { gameweekId },
    });

    for (const tx of existingTxs) {
      const team = await prisma.fantasyTeam.findFirst({
        where: { userId: tx.userId, league: { seasonId: gameweek.seasonId } },
      });
      if (team) {
        await prisma.fantasyTeam.update({
          where: { id: team.id },
          data: { totalPoints: { decrement: tx.totalPoints } },
        });
      }
    }

    await prisma.fantasyPointTransaction.deleteMany({
      where: { gameweekId },
    });

    // Load scoring rules into a map
    const scoringRules = await prisma.scoringRule.findMany();
    const rulesMap = new Map<string, number>();
    for (const rule of scoringRules) {
      const key = rule.position ? `${rule.event}:${rule.position}` : `${rule.event}:*`;
      rulesMap.set(key, rule.points);
    }

    const getRulePoints = (event: string, position: string): number => {
      const posKey = `${event}:${position}`;
      const globalKey = `${event}:*`;
      return rulesMap.get(posKey) ?? rulesMap.get(globalKey) ?? 0;
    };

    const results = [];

    for (const match of gameweek.matches) {
      for (const stat of match.playerStats) {
        const player = stat.player;
        let basePoints = 0;
        const events: string[] = [];

        // Appearance: +1 for playing
        if (stat.minutes > 0) {
          basePoints += getRulePoints("APPEARANCE", player.position);
          events.push("APPEARANCE");
        }

        // Goals
        if (stat.goals > 0) {
          const pts = getRulePoints("GOAL", player.position) * stat.goals;
          basePoints += pts;
          events.push(`GOALx${stat.goals}`);
        }

        // Assists
        if (stat.assists > 0) {
          const pts = getRulePoints("ASSIST", player.position) * stat.assists;
          basePoints += pts;
          events.push(`ASSISTx${stat.assists}`);
        }

        // Clean sheet (GK and DEF only)
        if (stat.cleanSheet) {
          const pts = getRulePoints("CLEAN_SHEET", player.position);
          if (pts !== 0) {
            basePoints += pts;
            events.push("CLEAN_SHEET");
          }
        }

        // Goal conceded (GK only)
        if (player.position === "GK" && stat.goalsConceded > 0) {
          const pts = getRulePoints("GOAL_CONCEDED", "GK") * stat.goalsConceded;
          basePoints += pts;
          events.push(`GOAL_CONCEDEDx${stat.goalsConceded}`);
        }

        // Penalty save (GK only)
        if (stat.penaltySave > 0) {
          const pts = getRulePoints("PENALTY_SAVE", player.position) * stat.penaltySave;
          basePoints += pts;
          events.push(`PENALTY_SAVEx${stat.penaltySave}`);
        }

        // Yellow card
        if (stat.yellowCards > 0) {
          const pts = getRulePoints("YELLOW_CARD", player.position) * stat.yellowCards;
          basePoints += pts;
          events.push(`YELLOW_CARDx${stat.yellowCards}`);
        }

        // Red card
        if (stat.redCards > 0) {
          const pts = getRulePoints("RED_CARD", player.position) * stat.redCards;
          basePoints += pts;
          events.push(`RED_CARDx${stat.redCards}`);
        }

        // Own goal
        if (stat.ownGoals > 0) {
          const pts = getRulePoints("OWN_GOAL", player.position) * stat.ownGoals;
          basePoints += pts;
          events.push(`OWN_GOALx${stat.ownGoals}`);
        }

        if (events.length === 0) continue;

        // Award points to ALL owners of this player
        const teamPlayers = await prisma.fantasyTeamPlayer.findMany({
          where: { playerId: stat.playerId },
          include: { team: true },
        });

        for (const teamPlayer of teamPlayers) {
          const multiplier = teamPlayer.isCaptain ? 3 : teamPlayer.isViceCaptain ? 2 : 1;
          const totalPoints = basePoints * multiplier;

          await prisma.fantasyPointTransaction.create({
            data: {
              userId: teamPlayer.team.userId,
              playerId: stat.playerId,
              gameweekId,
              eventType: events.join(","),
              basePoints,
              multiplier,
              totalPoints,
            },
          });

          await prisma.fantasyTeam.update({
            where: { id: teamPlayer.teamId },
            data: { totalPoints: { increment: totalPoints } },
          });

          results.push({
            playerId: stat.playerId,
            playerName: player.name,
            position: player.position,
            userId: teamPlayer.team.userId,
            isCaptain: teamPlayer.isCaptain,
            events,
            basePoints,
            multiplier,
            totalPoints,
          });
        }

        // Update real player total (once per player per gameweek)
        await prisma.realPlayer.update({
          where: { id: stat.playerId },
          data: { totalPoints: { increment: basePoints } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { gameweekId, processedStats: results.length, results },
    });
  } catch (error) {
    console.error("Apply scoring error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
