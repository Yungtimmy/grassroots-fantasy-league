export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { FANTASY_BUDGET } from "@/lib/utils";
import { getCurrentSeason } from "@/lib/league";

const STARTING_SIZE = 11;
const SUB_SIZE = 5;
const SQUAD_SIZE = STARTING_SIZE + SUB_SIZE;

type TeamContext =
  | { ok: false; error: string; status: 404 }
  | { ok: true; seasonId: string; leagueId: string };

async function getUserTeamContext(userId: string): Promise<TeamContext> {
  const season = await getCurrentSeason();
  if (!season) return { ok: false, error: "No season is open", status: 404 };

  const leagueMembership = await prisma.universityLeagueMember.findFirst({
    where: {
      userId,
      league: { seasonId: season.id },
    },
  });
  if (!leagueMembership) {
    return { ok: false, error: "Not registered for the current season", status: 404 };
  }

  return { ok: true, seasonId: season.id, leagueId: leagueMembership.leagueId };
}

function includeTeam() {
  return {
    players: {
      include: {
        player: {
          include: {
            realTeam: {
              select: { id: true, name: true, shortName: true, logo: true },
            },
          },
        },
      },
    },
    league: {
      include: {
        university: { select: { id: true, name: true, shortName: true, slug: true } },
      },
    },
  } as const;
}

function validateSquad(players: Array<{ playerId: string; isCaptain?: boolean; isViceCaptain?: boolean; isStarting?: boolean }>) {
  if (!Array.isArray(players) || players.length !== SQUAD_SIZE) {
    return `Squad must be ${STARTING_SIZE} starters and ${SUB_SIZE} substitutes (${SQUAD_SIZE} players).`;
  }

  const ids = players.map((p) => p.playerId);
  if (new Set(ids).size !== ids.length) {
    return "Duplicate players are not allowed.";
  }

  const starting = players.filter((p) => p.isStarting);
  const subs = players.filter((p) => !p.isStarting);
  if (starting.length !== STARTING_SIZE) return `Select exactly ${STARTING_SIZE} starters.`;
  if (subs.length !== SUB_SIZE) return `Select exactly ${SUB_SIZE} substitutes.`;

  const captains = players.filter((p) => p.isCaptain);
  if (captains.length !== 1) return "Select exactly one captain.";
  if (!captains[0].isStarting) return "Captain must be in the starting 11.";

  const vices = players.filter((p) => p.isViceCaptain);
  if (vices.length > 1) return "Select at most one vice captain.";
  if (vices.length === 1 && vices[0].playerId === captains[0].playerId) {
    return "Captain and vice captain must be different players.";
  }

  return null;
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const ctx = await getUserTeamContext(authUser.userId);
    if (!ctx.ok) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
    }

    const team = await prisma.fantasyTeam.findUnique({
      where: {
        userId_leagueId: {
          userId: authUser.userId,
          leagueId: ctx.leagueId,
        },
      },
      include: includeTeam(),
    });

    if (!team) {
      return NextResponse.json({ success: true, data: null });
    }

    // Get gameweek for per-player GW points (most recent with any status)
    const season = await getCurrentSeason();
    const activeGw = season ? await prisma.gameweek.findFirst({
      where: { seasonId: season.id },
      orderBy: { number: "desc" },
    }) : null;

    // Fetch gameweek points per player
    const playerIds = team.players.map((p: { player: { id: string } }) => p.player.id);
    const gwTransactions = activeGw ? await prisma.fantasyPointTransaction.findMany({
      where: { gameweekId: activeGw.id, playerId: { in: playerIds } },
    }) : [];
    const gwPointsMap = new Map(gwTransactions.map((t) => [t.playerId, t.totalPoints]));

    // Enrich team data with GW points
    const enrichedTeam = {
      ...team,
      gameweekId: activeGw?.id ?? null,
      players: team.players.map((p: any) => ({
        ...p,
        gameweekPoints: gwPointsMap.get(p.player.id) ?? 0,
      })),
    };

    return NextResponse.json({ success: true, data: enrichedTeam });
  } catch (error) {
    console.error("Get team error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return saveTeam(request, false);
}

export async function PUT(request: NextRequest) {
  return saveTeam(request, true);
}

async function saveTeam(request: NextRequest, isUpdate: boolean) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { name, formation, players } = body as {
      name?: string;
      formation?: string;
      players?: Array<{
        playerId: string;
        isCaptain?: boolean;
        isViceCaptain?: boolean;
        isStarting?: boolean;
      }>;
    };

    const ctx = await getUserTeamContext(authUser.userId);
    if (!ctx.ok) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
    }

    const leagueId = ctx.leagueId;

    const activeGameweek = await prisma.gameweek.findFirst({
      where: { seasonId: ctx.seasonId, status: { in: ["upcoming", "active"] } },
      orderBy: { number: "asc" },
    });
    if (activeGameweek) {
      const isStatusLocked = activeGameweek.status === "active";
      const isDeadlinePassed = activeGameweek.deadline.getTime() < Date.now();
      if (isStatusLocked || isDeadlinePassed) {
        return NextResponse.json(
          { success: false, error: "Squad is locked. Gameweek deadline has passed or is active." },
          { status: 403 }
        );
      }
    }

    if (players) {
      const squadError = validateSquad(players);
      if (squadError) {
        return NextResponse.json({ success: false, error: squadError }, { status: 400 });
      }
    }

    let existing = await prisma.fantasyTeam.findUnique({
      where: { userId_leagueId: { userId: authUser.userId, leagueId } },
    });

    if (!existing && isUpdate) {
      return NextResponse.json({ success: false, error: "No team found. Save a squad first." }, { status: 404 });
    }

    if (existing && !isUpdate && !players) {
      return NextResponse.json({ success: false, error: "Team already exists. Use PUT to update." }, { status: 409 });
    }

    let usedBudget = existing?.usedBudget ?? 0;
    let resolvedPlayers:
      | Array<{
          playerId: string;
          position: string;
          isCaptain: boolean;
          isViceCaptain: boolean;
          isStarting: boolean;
        }>
      | undefined;

    if (players && players.length > 0) {
      const dbPlayers = await prisma.realPlayer.findMany({
        where: { id: { in: players.map((p) => p.playerId) } },
      });
      if (dbPlayers.length !== players.length) {
        return NextResponse.json({ success: false, error: "One or more players were not found" }, { status: 400 });
      }

      usedBudget = dbPlayers.reduce((sum, p) => sum + p.price, 0);
      if (usedBudget > FANTASY_BUDGET) {
        return NextResponse.json(
          { success: false, error: `Budget exceeded. Used ${(usedBudget / 10).toFixed(1)}m of 100.0m` },
          { status: 400 }
        );
      }

      resolvedPlayers = players.map((slot) => {
        const player = dbPlayers.find((p) => p.id === slot.playerId)!;
        return {
          playerId: slot.playerId,
          position: player.position,
          isCaptain: Boolean(slot.isCaptain),
          isViceCaptain: Boolean(slot.isViceCaptain),
          isStarting: slot.isStarting !== false,
        };
      });
    }

    const teamName = name?.trim() || existing?.name || `${authUser.email.split("@")[0]}'s XI`;

    if (!existing) {
      existing = await prisma.fantasyTeam.create({
        data: {
          userId: authUser.userId,
          leagueId,
          name: teamName,
          formation: formation || "4-4-2",
          budget: FANTASY_BUDGET,
          usedBudget,
        },
      });
    } else {
      await prisma.fantasyTeam.update({
        where: { id: existing.id },
        data: {
          name: teamName,
          ...(formation && { formation }),
          budget: FANTASY_BUDGET,
          ...(resolvedPlayers && { usedBudget }),
        },
      });
    }

    if (resolvedPlayers) {
      await prisma.fantasyTeamPlayer.deleteMany({ where: { teamId: existing.id } });
      await prisma.fantasyTeamPlayer.createMany({
        data: resolvedPlayers.map((p) => ({
          teamId: existing!.id,
          ...p,
        })),
      });
    }

    const fullTeam = await prisma.fantasyTeam.findUnique({
      where: { id: existing.id },
      include: includeTeam(),
    });

    return NextResponse.json({ success: true, data: fullTeam }, { status: isUpdate || existing ? 200 : 201 });
  } catch (error) {
    console.error("Save team error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
