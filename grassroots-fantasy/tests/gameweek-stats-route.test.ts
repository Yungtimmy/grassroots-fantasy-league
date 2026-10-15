import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/gameweek-stats/route";

const seasonFindFirst = vi.fn();
const gameweekFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    season: {
      findFirst: (...args: unknown[]) => seasonFindFirst(...args),
    },
    gameweek: {
      findMany: (...args: unknown[]) => gameweekFindMany(...args),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({ role: "admin" })),
}));

function listGameweeks() {
  return GET(new NextRequest("http://localhost/api/admin/gameweek-stats"));
}

describe("admin gameweek stats default", () => {
  beforeEach(() => {
    seasonFindFirst.mockReset();
    gameweekFindMany.mockReset();
    seasonFindFirst.mockResolvedValue({ id: "season-1" });
  });

  it("defaults to the latest finished gameweek instead of gameweek 1", async () => {
    gameweekFindMany.mockResolvedValue([
      { id: "gw1", number: 1, name: "Week 1", status: "finished" },
      { id: "gw12", number: 12, name: "Week 12", status: "finished" },
      { id: "gw13", number: 13, name: "Week 13", status: "upcoming" },
    ]);

    const body = await (await listGameweeks()).json();

    expect(body.success).toBe(true);
    expect(body.data.defaultGameweekId).toBe("gw12");
    expect(body.data.gameweeks).toHaveLength(3);
    expect(gameweekFindMany).toHaveBeenCalledWith({
      where: { seasonId: "season-1" },
      orderBy: { number: "asc" },
      select: { id: true, number: true, name: true, status: true },
    });
  });

  it("uses the active gameweek when one is in progress", async () => {
    gameweekFindMany.mockResolvedValue([
      { id: "gw1", number: 1, name: "Week 1", status: "finished" },
      { id: "gw12", number: 12, name: "Week 12", status: "active" },
      { id: "gw13", number: 13, name: "Week 13", status: "upcoming" },
    ]);

    const body = await (await listGameweeks()).json();

    expect(body.data.defaultGameweekId).toBe("gw12");
  });

  it("does not treat an upcoming gameweek as the default", async () => {
    gameweekFindMany.mockResolvedValue([
      { id: "gw1", number: 1, name: "Week 1", status: "upcoming" },
      { id: "gw2", number: 2, name: "Week 2", status: "upcoming" },
    ]);

    const body = await (await listGameweeks()).json();

    expect(body.data.defaultGameweekId).toBeNull();
    expect(body.data.gameweeks).toHaveLength(2);
  });

  it("returns no default when there is no active season", async () => {
    seasonFindFirst.mockResolvedValue(null);

    const body = await (await listGameweeks()).json();

    expect(body.data).toEqual({ gameweeks: [], defaultGameweekId: null });
    expect(gameweekFindMany).not.toHaveBeenCalled();
  });
});
