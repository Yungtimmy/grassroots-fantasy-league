import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createToken } from "@/lib/auth";
import { GET } from "@/app/api/leaderboard/squad/[userId]/route";
import { decideSquadReveal, squadGameweekLabel } from "@/lib/squad-reveal";
import { cookieJar, prismaMock, resetHarness } from "./harness";

vi.mock("next/headers", async () => {
  const { cookiesModule } = await import("./harness");
  return cookiesModule();
});

vi.mock("@/lib/db", async () => {
  const { prismaMock: prisma } = await import("./harness");
  return { prisma };
});

const SEASON_ID = "season-1";
const OWNER_ID = "user-owner";
const OTHER_ID = "user-other";
const TEAM_ID = "team-other";

function request(userId: string, query: Record<string, string> = {}) {
  const params = new URLSearchParams({ seasonId: SEASON_ID, ...query });
  return new NextRequest(`http://localhost/api/leaderboard/squad/${userId}?${params}`);
}

function call(userId: string, query: Record<string, string> = {}) {
  return GET(request(userId, query), { params: Promise.resolve({ userId }) });
}

function gameweek(overrides: Record<string, unknown>) {
  return {
    id: "gw-active",
    number: 2,
    name: "Gameweek 2",
    status: "active",
    deadline: new Date(Date.now() + 60 * 60 * 1000),
    lineupFrozenAt: null,
    ...overrides,
  };
}

const livePlayer = {
  playerId: "p-live",
  position: "FWD",
  isCaptain: true,
  isViceCaptain: false,
  isStarting: true,
  player: {
    id: "p-live",
    name: "Edited Striker",
    position: "FWD",
    realTeam: { shortName: "ARS", name: "Arsenal" },
  },
};

const liveBench = {
  playerId: "p-bench",
  position: "MID",
  isCaptain: false,
  isViceCaptain: true,
  isStarting: false,
  player: {
    id: "p-bench",
    name: "Edited Midfielder",
    position: "MID",
    realTeam: { shortName: "CHE", name: "Chelsea" },
  },
};

const lockedPlayer = {
  playerId: "p-locked",
  position: "FWD",
  isCaptain: true,
  isViceCaptain: false,
  isStarting: true,
  player: {
    id: "p-locked",
    name: "Locked Striker",
    position: "FWD",
    realTeam: { shortName: "MCI", name: "Manchester City" },
  },
};

const lockedBench = {
  playerId: "p-locked-bench",
  position: "MID",
  isCaptain: false,
  isViceCaptain: true,
  isStarting: false,
  player: {
    id: "p-locked-bench",
    name: "Locked Midfielder",
    position: "MID",
    realTeam: { shortName: "LIV", name: "Liverpool" },
  },
};

function teamFor(userId: string) {
  return {
    id: userId === OWNER_ID ? "team-owner" : TEAM_ID,
    userId,
    name: userId === OWNER_ID ? "My XI" : "Edited XI",
    formation: "4-3-3",
    user: {
      id: userId,
      name: userId === OWNER_ID ? "Owner Manager" : "Other Manager",
      username: userId === OWNER_ID ? "owner" : "other",
    },
    league: { university: { shortName: "UNILAG", name: "University of Lagos" } },
    players: [livePlayer, liveBench],
  };
}

async function signIn(userId: string) {
  const token = await createToken({ userId, email: `${userId}@example.com`, role: "user" });
  cookieJar.set("gfl-token", token);
}

const clientFlags = {
  gameweekId: "gw-someone-else",
  locked: "true",
  reveal: "1",
  deadline: "2000-01-01T00:00:00.000Z",
  status: "finished",
};

describe("decideSquadReveal", () => {
  it("hides another squad for the whole time a gameweek is active", () => {
    const active = gameweek({
      deadline: new Date(Date.now() - 60_000),
      lineupFrozenAt: new Date(),
    });
    expect(decideSquadReveal(active)).toMatchObject({ reveal: false, reason: "hidden" });
    expect(decideSquadReveal(gameweek({ deadline: new Date(Date.now() + 60_000) }))).toMatchObject({
      reveal: false,
      reason: "hidden",
    });
  });

  it("reveals only the latest finished gameweek when that week has a snapshot", () => {
    const finished = gameweek({
      id: "gw-12",
      number: 12,
      status: "finished",
      lineupFrozenAt: new Date(),
    });
    expect(decideSquadReveal(finished)).toEqual({ reveal: true, gameweek: finished });
    expect(squadGameweekLabel(finished)).toBe("Gameweek 12 squad");
  });

  it("does not reveal a finished gameweek that was never frozen", () => {
    const finished = gameweek({ id: "gw-12", number: 12, status: "finished", lineupFrozenAt: null });
    expect(decideSquadReveal(finished)).toMatchObject({ reveal: false, reason: "unavailable" });
    expect(decideSquadReveal(null)).toMatchObject({ reveal: false, reason: "unavailable", gameweek: null });
  });
});

describe("GET /api/leaderboard/squad/[userId]", () => {
  beforeEach(() => {
    resetHarness();
    prismaMock.season.findUnique.mockResolvedValue({ id: SEASON_ID, name: "2026" });
    prismaMock.fantasyTeam.findFirst.mockImplementation(async (args: { where?: { userId?: string } }) => {
      const userId = args?.where?.userId;
      if (userId !== OWNER_ID && userId !== OTHER_ID) return null;
      return teamFor(userId);
    });
    prismaMock.fantasyTeam.count.mockResolvedValue(1);
    prismaMock.fantasyPointTransaction.findMany.mockResolvedValue([
      { playerId: "p-locked", totalPoints: 6 },
      { playerId: "p-locked", totalPoints: 3 },
      { playerId: "p-locked-bench", totalPoints: 8 },
      { playerId: "p-live", totalPoints: 4 },
      { playerId: "p-bench", totalPoints: 1 },
    ]);
    prismaMock.gameweekLineup.findMany.mockResolvedValue([lockedPlayer, lockedBench]);
  });

  it("refuses another squad while a gameweek is active, even after the deadline", async () => {
    await signIn(OWNER_ID);
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({
        id: "gw-12",
        number: 12,
        name: "Gameweek 12",
        status: "finished",
        deadline: new Date(Date.now() - 86_400_000),
        lineupFrozenAt: new Date(),
      }),
      gameweek({
        id: "gw-13",
        number: 13,
        name: "Gameweek 13",
        status: "active",
        deadline: new Date(Date.now() - 60_000),
        lineupFrozenAt: new Date(),
      }),
    ]);

    const res = await call(OTHER_ID, clientFlags);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ success: false, error: "Squads are hidden while a gameweek is live" });
    expect(JSON.stringify(body)).not.toContain("Locked Striker");
    expect(JSON.stringify(body)).not.toContain("Edited Striker");
    expect(body.players).toBeUndefined();
    expect(body.data).toBeUndefined();
    expect(prismaMock.fantasyTeam.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.gameweekLineup.findMany).not.toHaveBeenCalled();
    expect(prismaMock.fantasyPointTransaction.findMany).not.toHaveBeenCalled();
    expect(prismaMock.gameweek.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.gameweek.findMany).toHaveBeenCalledWith({ where: { seasonId: SEASON_ID } });
  });

  it("between gameweeks returns the last finished snapshot, not the current squad", async () => {
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({
        id: "gw-11",
        number: 11,
        name: "Gameweek 11",
        status: "finished",
        deadline: new Date(Date.now() - 14 * 86_400_000),
        lineupFrozenAt: new Date(Date.now() - 13 * 86_400_000),
      }),
      gameweek({
        id: "gw-12",
        number: 12,
        name: "Week 12",
        status: "finished",
        deadline: new Date(Date.now() - 86_400_000),
        lineupFrozenAt: new Date(Date.now() - 80_000_000),
      }),
      gameweek({
        id: "gw-13",
        number: 13,
        name: "Gameweek 13",
        status: "upcoming",
        deadline: new Date(Date.now() + 86_400_000),
        lineupFrozenAt: null,
      }),
    ]);

    const res = await call(OTHER_ID, clientFlags);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.source).toBe("snapshot");
    expect(body.data.gameweekId).toBe("gw-12");
    expect(body.data.gameweekNumber).toBe(12);
    expect(body.data.gameweekLabel).toBe("Gameweek 12 squad");
    expect(body.data.players.map((player: { name: string; isStarting: boolean; points: number }) => ({
      name: player.name,
      isStarting: player.isStarting,
      points: player.points,
    }))).toEqual([
      { name: "Locked Striker", isStarting: true, points: 9 },
      { name: "Locked Midfielder", isStarting: false, points: 8 },
    ]);
    expect(body.data.players[0]).toMatchObject({ isCaptain: true, isViceCaptain: false, club: "MCI" });
    expect(body.data.players[1]).toMatchObject({ isCaptain: false, isViceCaptain: true, club: "LIV" });
    expect(JSON.stringify(body)).not.toContain("Edited Striker");
    expect(JSON.stringify(body)).not.toContain("Edited Midfielder");
    expect(prismaMock.gameweekLineup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameweekId: "gw-12", teamId: TEAM_ID },
      }),
    );
    expect(prismaMock.fantasyPointTransaction.findMany).toHaveBeenCalledWith({
      where: {
        gameweekId: "gw-12",
        OR: [{ teamId: TEAM_ID }, { teamId: null, userId: OTHER_ID }],
      },
      select: { playerId: true, totalPoints: true },
    });
    expect(prismaMock.gameweek.findFirst).not.toHaveBeenCalled();
  });

  it("after the final gameweek shows that frozen squad with bench points at 1x", async () => {
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({
        id: "gw-12",
        number: 12,
        name: "Gameweek 12",
        status: "finished",
        deadline: new Date(Date.now() - 86_400_000),
        lineupFrozenAt: new Date(Date.now() - 80_000_000),
      }),
    ]);
    prismaMock.fantasyPointTransaction.findMany.mockResolvedValue([
      { playerId: "p-locked", totalPoints: 12 },
      { playerId: "p-locked-bench", totalPoints: 8 },
    ]);

    const res = await call(OTHER_ID);
    const body = await res.json();
    const starter = body.data.players.find((player: { playerId: string }) => player.playerId === "p-locked");
    const bench = body.data.players.find((player: { playerId: string }) => player.playerId === "p-locked-bench");

    expect(res.status).toBe(200);
    expect(body.data.gameweekLabel).toBe("Gameweek 12 squad");
    expect(body.data.source).toBe("snapshot");
    expect(starter).toMatchObject({ isStarting: true, isCaptain: true, points: 12 });
    expect(bench).toMatchObject({
      isStarting: false,
      isViceCaptain: true,
      points: 8,
    });
    expect(JSON.stringify(body)).not.toContain("Edited Striker");
  });

  it("returns not-available with no players when the finished gameweek has no snapshot", async () => {
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({
        id: "gw-11",
        number: 11,
        status: "finished",
        deadline: new Date(Date.now() - 14 * 86_400_000),
        lineupFrozenAt: new Date(),
      }),
      gameweek({
        id: "gw-12",
        number: 12,
        name: "Gameweek 12",
        status: "finished",
        deadline: new Date(Date.now() - 86_400_000),
        lineupFrozenAt: null,
      }),
      gameweek({
        id: "gw-13",
        number: 13,
        status: "upcoming",
        deadline: new Date(Date.now() + 86_400_000),
      }),
    ]);

    const res = await call(OTHER_ID, { gameweekId: "gw-11", locked: "true", reveal: "1" });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ success: false, error: "Squad not available for this gameweek" });
    expect(body.players).toBeUndefined();
    expect(body.data).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("Locked Striker");
    expect(JSON.stringify(body)).not.toContain("Edited Striker");
    expect(JSON.stringify(body)).not.toContain("Edited Midfielder");
    expect(prismaMock.fantasyTeam.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.gameweekLineup.findMany).not.toHaveBeenCalled();
    expect(prismaMock.fantasyPointTransaction.findMany).not.toHaveBeenCalled();
    expect(prismaMock.gameweek.findFirst).not.toHaveBeenCalled();
  });

  it("always allows a manager to see their own squad while a gameweek is live", async () => {
    await signIn(OWNER_ID);
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({
        id: "gw-active",
        number: 2,
        deadline: new Date(Date.now() + 86_400_000),
        lineupFrozenAt: new Date(),
      }),
      gameweek({ id: "gw-next", number: 3, status: "upcoming", deadline: new Date(Date.now() + 172_800_000) }),
    ]);

    const res = await call(OWNER_ID, { gameweekId: "gw-finished", reveal: "1", locked: "true" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.own).toBe(true);
    expect(body.data.source).toBe("current");
    expect(body.data.gameweekLabel).toBe("Gameweek 2 squad");
    expect(body.data.players.map((player: { name: string }) => player.name)).toEqual([
      "Edited Striker",
      "Edited Midfielder",
    ]);
    expect(body.data.players[0].isCaptain).toBe(true);
    expect(body.data.players[1].isViceCaptain).toBe(true);
    expect(body.data.gameweekId).toBe("gw-active");
    expect(prismaMock.gameweekLineup.findMany).not.toHaveBeenCalled();
    expect(prismaMock.gameweek.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.fantasyPointTransaction.findMany).toHaveBeenCalledWith({
      where: {
        gameweekId: "gw-active",
        OR: [{ teamId: "team-owner" }, { teamId: null, userId: OWNER_ID }],
      },
      select: { playerId: true, totalPoints: true },
    });
  });

  it("scores an owner's squad on the latest finished gameweek when none is active", async () => {
    await signIn(OWNER_ID);
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({
        id: "gw-old",
        number: 1,
        status: "finished",
        deadline: new Date(Date.now() - 86_400_000),
        lineupFrozenAt: new Date(),
      }),
      gameweek({
        id: "gw-next",
        number: 4,
        status: "upcoming",
        deadline: new Date(Date.now() + 86_400_000),
      }),
    ]);

    const res = await call(OWNER_ID, { gameweekId: "gw-next" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.own).toBe(true);
    expect(body.data.gameweekId).toBe("gw-old");
    expect(body.data.gameweekLabel).toBe("Gameweek 1 squad");
    expect(body.data.source).toBe("current");
    expect(body.data.players.map((player: { name: string }) => player.name)).toEqual([
      "Edited Striker",
      "Edited Midfielder",
    ]);
    expect(prismaMock.gameweekLineup.findMany).not.toHaveBeenCalled();
    expect(prismaMock.gameweek.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.fantasyPointTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gameweekId: "gw-old" }),
      }),
    );
  });
});
