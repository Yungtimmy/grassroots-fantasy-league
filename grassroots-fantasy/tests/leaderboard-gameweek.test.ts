import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findDisplayedGameweek = vi.fn();
const gameweekPointsByTeam = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    fantasyTeam: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

vi.mock("@/lib/gameweek", () => ({
  findDisplayedGameweek: (...args: unknown[]) => findDisplayedGameweek(...args),
}));

vi.mock("@/lib/scoring", () => ({
  gameweekPointsByTeam: (...args: unknown[]) => gameweekPointsByTeam(...args),
}));

const team = {
  id: "team-1",
  totalPoints: 20,
  name: "XI",
  user: { id: "user-1", username: "ada", name: "Ada", avatar: null },
  league: { university: { shortName: "UNN", slug: "unn" } },
};

describe("leaderboard current gameweek", () => {
  beforeEach(() => {
    findMany.mockReset();
    findDisplayedGameweek.mockReset();
    gameweekPointsByTeam.mockReset();
    findMany.mockResolvedValue([team]);
    gameweekPointsByTeam.mockImplementation(async (_db: unknown, input: { gameweekId: string }) => {
      if (input.gameweekId === "gw-active") return { "team-1": 9 };
      if (input.gameweekId === "gw-old") return { "team-1": 4 };
      return {};
    });
  });

  it("fills the grassroots GW column from the displayed gameweek", async () => {
    findDisplayedGameweek.mockResolvedValue({ id: "gw-active", number: 2, status: "active" });
    const { LeaderboardService } = await import("@/lib/leaderboard");

    const rows = await LeaderboardService.getGrassrootsLeaderboard("season-1");

    expect(findDisplayedGameweek).toHaveBeenCalledWith("season-1");
    expect(gameweekPointsByTeam).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ gameweekId: "gw-active", seasonId: "season-1" }),
    );
    expect(rows[0]?.gameweekPoints).toBe(9);
  });

  it("leaves GW points at zero when there is no active or finished gameweek", async () => {
    findDisplayedGameweek.mockResolvedValue(null);
    const { LeaderboardService } = await import("@/lib/leaderboard");

    const rows = await LeaderboardService.getGrassrootsLeaderboard("season-1");

    expect(gameweekPointsByTeam).not.toHaveBeenCalled();
    expect(rows[0]?.gameweekPoints).toBe(0);
  });

  it("uses the displayed week for a university GW column, and that week for movement", async () => {
    findDisplayedGameweek.mockResolvedValue({ id: "gw-active", number: 2, status: "active" });
    const { LeaderboardService } = await import("@/lib/leaderboard");

    const rows = await LeaderboardService.getUniversityLeaderboard("uni-1", "season-1");

    expect(rows[0]?.gameweekPoints).toBe(9);
    expect(gameweekPointsByTeam).toHaveBeenCalledTimes(1);
    expect(gameweekPointsByTeam).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ gameweekId: "gw-active" }),
    );
  });

  it("keeps an explicit gameweek column and still moves ranks from the displayed week", async () => {
    findDisplayedGameweek.mockResolvedValue({ id: "gw-active", number: 2, status: "active" });
    const { LeaderboardService } = await import("@/lib/leaderboard");

    const rows = await LeaderboardService.getUniversityLeaderboard("uni-1", "season-1", "gw-old");

    expect(rows[0]?.gameweekPoints).toBe(4);
    expect(gameweekPointsByTeam).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ gameweekId: "gw-old" }),
    );
    expect(gameweekPointsByTeam).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ gameweekId: "gw-active" }),
    );
  });
});
