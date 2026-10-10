import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { recomputeGameweekPoints, ScoringError } from "@/lib/scoring";

const recompute = vi.mocked(recomputeGameweekPoints);

const prisma = {
  match: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  gameweek: {
    findUnique: vi.fn(),
  },
  playerMatchStatistic: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
};

vi.mock("@/lib/db", () => ({ prisma }));

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({ role: "admin" })),
}));

vi.mock("@/lib/scoring", () => {
  class ScoringError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.name = "ScoringError";
      this.status = status;
    }
  }
  return {
    ScoringError,
    recomputeGameweekPoints: vi.fn(),
  };
});

function put(body: unknown) {
  return new NextRequest("http://localhost/api/admin/matches/match-1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del() {
  return new NextRequest("http://localhost/api/admin/matches/match-1", { method: "DELETE" });
}

describe("admin fixture postpone, move, and delete", () => {
  beforeEach(() => {
    prisma.match.findUnique.mockReset();
    prisma.match.update.mockReset();
    prisma.match.delete.mockReset();
    prisma.gameweek.findUnique.mockReset();
    prisma.playerMatchStatistic.deleteMany.mockReset();
    prisma.$transaction.mockClear();
    recompute.mockReset();
    recompute.mockResolvedValue({ awardCount: 1, skipped: false });
    prisma.match.update.mockResolvedValue({ id: "match-1", gameweekId: "gw2", status: "postponed" });
    prisma.match.delete.mockResolvedValue({ id: "match-1" });
    prisma.playerMatchStatistic.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("recomputes the old and new gameweeks in one transaction when stats exist", async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: "match-1",
      gameweekId: "gw1",
      _count: { playerStats: 2 },
    });
    prisma.gameweek.findUnique.mockResolvedValue({ id: "gw2" });
    const { PUT } = await import("@/app/api/admin/matches/[id]/route");

    const res = await PUT(put({
      gameweekId: "gw2",
      date: "2026-10-20",
      time: "15:00",
      status: "postponed",
    }), { params: { id: "match-1" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(recompute.mock.calls.map((call) => call[0])).toEqual(["gw1", "gw2"]);
    expect(recompute.mock.calls[0]?.[1]).toBe(recompute.mock.calls[1]?.[1]);
  });

  it("returns the existing 409 and does not treat the move as saved when the target has no snapshot", async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: "match-1",
      gameweekId: "gw1",
      _count: { playerStats: 2 },
    });
    prisma.gameweek.findUnique.mockResolvedValue({ id: "gw2" });
    recompute.mockImplementation(async (gameweekId: string) => {
      if (gameweekId === "gw2") {
        throw new ScoringError(
          "Gameweek has no saved lineup. It locked before lineups were recorded, and current squads belong to a later gameweek, so this save was not applied.",
          409,
        );
      }
      return { awardCount: 1, skipped: false };
    });
    const { PUT } = await import("@/app/api/admin/matches/[id]/route");

    const res = await PUT(put({
      gameweekId: "gw2",
      date: "2026-10-20",
      time: "16:00",
      status: "postponed",
    }), { params: { id: "match-1" } });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/no saved lineup/);
    expect(body.error).toMatch(/not applied/);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("moves a fixture with no stats without recomputing", async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: "match-1",
      gameweekId: "gw1",
      _count: { playerStats: 0 },
    });
    prisma.gameweek.findUnique.mockResolvedValue({ id: "gw2" });
    const { PUT } = await import("@/app/api/admin/matches/[id]/route");

    const res = await PUT(put({
      gameweekId: "gw2",
      date: "2026-10-20",
      time: "15:00",
      status: "upcoming",
    }), { params: { id: "match-1" } });

    expect(res.status).toBe(200);
    expect(recompute).not.toHaveBeenCalled();
  });

  it("recomputes after deleting a fixture that has stats, and not after one that does not", async () => {
    const { DELETE } = await import("@/app/api/admin/matches/[id]/route");
    const order: string[] = [];
    prisma.playerMatchStatistic.deleteMany.mockImplementation(async () => {
      order.push("stats");
      return { count: 2 };
    });
    prisma.match.delete.mockImplementation(async () => {
      order.push("match");
      return { id: "match-1" };
    });
    recompute.mockImplementation(async () => {
      order.push("recompute");
      return { awardCount: 0, skipped: false };
    });

    prisma.match.findUnique.mockResolvedValue({
      id: "match-1",
      gameweekId: "gw1",
      _count: { playerStats: 2 },
    });
    const withStats = await DELETE(del(), { params: { id: "match-1" } });
    expect(withStats.status).toBe(200);
    expect(order).toEqual(["stats", "match", "recompute"]);
    expect(recompute).toHaveBeenCalledWith("gw1", prisma);

    recompute.mockClear();
    prisma.match.findUnique.mockResolvedValue({
      id: "match-1",
      gameweekId: "gw1",
      _count: { playerStats: 0 },
    });
    const withoutStats = await DELETE(del(), { params: { id: "match-1" } });
    expect(withoutStats.status).toBe(200);
    expect(recompute).not.toHaveBeenCalled();
  });
});
