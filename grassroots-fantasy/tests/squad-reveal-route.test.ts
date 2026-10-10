import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createToken } from "@/lib/auth";
import { GET } from "@/app/api/leaderboard/squad/[userId]/route";
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
      { playerId: "p-live", totalPoints: 4 },
      { playerId: "p-bench", totalPoints: 1 },
    ]);
    prismaMock.gameweekLineup.findMany.mockResolvedValue([lockedPlayer]);
  });

  it("refuses another squad before the deadline and returns no players", async () => {
    await signIn(OWNER_ID);
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({ id: "gw-finished", number: 1, status: "finished", deadline: new Date(Date.now() - 86_400_000), lineupFrozenAt: new Date() }),
      gameweek({ deadline: new Date(Date.now() + 86_400_000), lineupFrozenAt: new Date() }),
    ]);

    const res = await call(OTHER_ID, {
      gameweekId: "gw-finished",
      locked: "true",
      reveal: "1",
      deadline: "2000-01-01T00:00:00.000Z",
      status: "active",
    });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ success: false, error: "Squads reveal at the deadline" });
    expect(JSON.stringify(body)).not.toContain("Locked Striker");
    expect(JSON.stringify(body)).not.toContain("Edited Striker");
    expect(body.players).toBeUndefined();
    expect(body.data).toBeUndefined();
    expect(prismaMock.fantasyTeam.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.gameweekLineup.findMany).not.toHaveBeenCalled();
    expect(prismaMock.fantasyPointTransaction.findMany).not.toHaveBeenCalled();
    const lookup = prismaMock.gameweek.findMany.mock.calls[0][0];
    expect(lookup.where).toEqual({ seasonId: SEASON_ID });
    expect(JSON.stringify(lookup)).not.toContain("gw-finished");
  });

  it("allows another squad after the deadline and prefers the frozen lineup", async () => {
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({
        deadline: new Date(Date.now() - 60_000),
        lineupFrozenAt: new Date(Date.now() - 30_000),
      }),
    ]);

    const res = await call(OTHER_ID, { gameweekId: "gw-someone-else", reveal: "0" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.source).toBe("snapshot");
    expect(body.data.players.map((player: { name: string }) => player.name)).toEqual(["Locked Striker"]);
    expect(body.data.players[0]).toMatchObject({
      isCaptain: true,
      isViceCaptain: false,
      isStarting: true,
      points: 9,
      club: "MCI",
    });
    expect(JSON.stringify(body)).not.toContain("Edited Striker");
    expect(prismaMock.fantasyPointTransaction.findMany).toHaveBeenCalledWith({
      where: {
        gameweekId: "gw-active",
        OR: [{ teamId: TEAM_ID }, { teamId: null, userId: OTHER_ID }],
      },
      select: { playerId: true, totalPoints: true },
    });
  });

  it("falls back to the current squad only when the locked gameweek has no snapshot", async () => {
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({ deadline: new Date(Date.now() - 60_000), lineupFrozenAt: null }),
    ]);

    const res = await call(OTHER_ID);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.source).toBe("current");
    expect(body.data.players.map((player: { name: string; isStarting: boolean; points: number }) => ({
      name: player.name,
      isStarting: player.isStarting,
      points: player.points,
    }))).toEqual([
      { name: "Edited Striker", isStarting: true, points: 4 },
      { name: "Edited Midfielder", isStarting: false, points: 1 },
    ]);
    expect(body.data.players.find((player: { name: string }) => player.name === "Edited Midfielder").isViceCaptain).toBe(true);
    expect(prismaMock.gameweekLineup.findMany).not.toHaveBeenCalled();
  });

  it("refuses when no gameweek is active, even if the client names one", async () => {
    await signIn(OWNER_ID);
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({
        id: "gw-upcoming",
        status: "upcoming",
        deadline: new Date(Date.now() + 86_400_000),
      }),
      gameweek({
        id: "gw-finished",
        number: 1,
        status: "finished",
        deadline: new Date(Date.now() - 86_400_000),
        lineupFrozenAt: new Date(),
      }),
    ]);

    const res = await call(OTHER_ID, { gameweekId: "gw-finished", status: "active", locked: "true" });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ success: false, error: "Squads reveal at the deadline" });
    expect(body.players).toBeUndefined();
    expect(prismaMock.fantasyTeam.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.gameweekLineup.findMany).not.toHaveBeenCalled();
  });

  it("always allows a manager to see their own squad before the deadline", async () => {
    await signIn(OWNER_ID);
    prismaMock.gameweek.findMany.mockResolvedValue([
      gameweek({ deadline: new Date(Date.now() + 86_400_000) }),
    ]);

    const res = await call(OWNER_ID, { gameweekId: "gw-finished", reveal: "1", locked: "true" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.own).toBe(true);
    expect(body.data.source).toBe("current");
    expect(body.data.players.map((player: { name: string }) => player.name)).toEqual([
      "Edited Striker",
      "Edited Midfielder",
    ]);
    expect(body.data.players[0].isCaptain).toBe(true);
    expect(body.data.players[1].isViceCaptain).toBe(true);
    expect(prismaMock.gameweekLineup.findMany).not.toHaveBeenCalled();
  });
});
