export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findDisplayedGameweek } from "@/lib/gameweek";
import { getCurrentSeason } from "@/lib/league";
import { teamGameweekPointRows } from "@/lib/scoring";
import {
  SQUAD_HIDDEN_MESSAGE,
  SQUAD_UNAVAILABLE_MESSAGE,
  decideSquadReveal,
  orderSquadPlayers,
  squadGameweekLabel,
  type RevealedSquadPlayer,
} from "@/lib/squad-reveal";

/**
 * Leaderboard reads are already public: /api/leaderboard/* does not require
 * sign-in. Another manager's squad follows that pattern. Sign-in is still
 * read so the viewer can always open their own squad, which is how /api/teams
 * already works.
 *
 * The gameweek comes from findDisplayedGameweek. Query flags such as
 * gameweekId, locked, or reveal are ignored.
 *
 * Another squad is refused while that gameweek is active. Between gameweeks,
 * and after the last one finishes, the response is that finished gameweek's
 * frozen lineup only. The current squad is never substituted for a missing
 * snapshot. The signed-in manager still reads their own current squad.
 */

const playerSelect = {
  id: true,
  name: true,
  position: true,
  realTeam: { select: { shortName: true, name: true } },
} as const;

type SlotRow = {
  playerId: string;
  position: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
  player: {
    id: string;
    name: string;
    position: string;
    realTeam: { shortName: string; name: string } | null;
  };
};

function hidden() {
  return NextResponse.json({ success: false, error: SQUAD_HIDDEN_MESSAGE }, { status: 403 });
}

function unavailable() {
  return NextResponse.json({ success: false, error: SQUAD_UNAVAILABLE_MESSAGE }, { status: 404 });
}

function toPlayer(row: SlotRow): RevealedSquadPlayer {
  return {
    playerId: row.playerId,
    name: row.player.name,
    position: row.position || row.player.position,
    club: row.player.realTeam?.shortName ?? "",
    isCaptain: row.isCaptain,
    isViceCaptain: row.isViceCaptain,
    isStarting: row.isStarting,
    points: 0,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Manager not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId")?.trim() || null;
    const teamId = searchParams.get("teamId")?.trim() || null;

    const authUser = await getAuthUser();
    const isOwner = authUser?.userId === userId;

    const season = seasonId
      ? await prisma.season.findUnique({ where: { id: seasonId } })
      : await getCurrentSeason();
    if (!season) {
      return NextResponse.json({ success: false, error: "Season not found" }, { status: 404 });
    }

    const displayed = await findDisplayedGameweek(season.id);
    if (!isOwner) {
      const decision = decideSquadReveal(displayed);
      if (!decision.reveal) {
        return decision.reason === "hidden" ? hidden() : unavailable();
      }
    }

    const gameweek = displayed;

    const team = await prisma.fantasyTeam.findFirst({
      where: {
        userId,
        ...(teamId ? { id: teamId } : {}),
        league: { seasonId: season.id },
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
        league: { include: { university: { select: { shortName: true, name: true } } } },
        players: { include: { player: { select: playerSelect } } },
      },
    });
    if (!team) {
      return NextResponse.json({ success: false, error: "No squad found" }, { status: 404 });
    }

    let source: "snapshot" | "current" = "current";
    let slots: RevealedSquadPlayer[];

    if (!isOwner) {
      // Another manager is only reachable here for a finished, frozen gameweek.
      // Never read team.players: that is the squad being edited for next week.
      if (!gameweek?.lineupFrozenAt) return unavailable();
      const lineup = await prisma.gameweekLineup.findMany({
        where: { gameweekId: gameweek.id, teamId: team.id },
        include: { player: { select: playerSelect } },
      });
      source = "snapshot";
      slots = lineup.map((row) => toPlayer(row));
    } else {
      slots = team.players.map((row) => toPlayer(row));
    }

    if (gameweek) {
      const rows = await teamGameweekPointRows(prisma, {
        teamId: team.id,
        userId: team.userId,
        seasonId: season.id,
        gameweekId: gameweek.id,
      });
      const points = new Map<string, number>();
      for (const row of rows) {
        points.set(row.playerId, (points.get(row.playerId) ?? 0) + row.totalPoints);
      }
      slots = slots.map((slot) => ({ ...slot, points: points.get(slot.playerId) ?? 0 }));
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: team.user.id,
        name: team.user.name,
        username: team.user.username,
        teamId: team.id,
        teamName: team.name,
        university: team.league.university.shortName,
        formation: team.formation,
        gameweekId: gameweek?.id ?? null,
        gameweekNumber: gameweek?.number ?? null,
        gameweekName: gameweek?.name ?? null,
        gameweekLabel: gameweek ? squadGameweekLabel(gameweek) : null,
        source,
        own: isOwner,
        players: orderSquadPlayers(slots),
      },
    });
  } catch (error) {
    console.error("Leaderboard squad reveal error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
