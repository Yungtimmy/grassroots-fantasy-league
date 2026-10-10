import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectDisplayedGameweek } from "@/lib/gameweek";

const findMany = vi.fn();
const findFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    gameweek: {
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

describe("selectDisplayedGameweek", () => {
  it("uses the active gameweek instead of a later one that only exists", () => {
    const selected = selectDisplayedGameweek([
      { id: "gw1", number: 1, status: "finished" },
      { id: "gw2", number: 2, status: "active" },
      { id: "gw3", number: 3, status: "upcoming" },
    ]);
    expect(selected?.id).toBe("gw2");
  });

  it("uses the lowest number when more than one gameweek is active", () => {
    const selected = selectDisplayedGameweek([
      { id: "gw2", number: 2, status: "active" },
      { id: "gw1", number: 1, status: "active" },
    ]);
    expect(selected?.id).toBe("gw1");
  });

  it("uses the most recent finished gameweek when none is active", () => {
    const selected = selectDisplayedGameweek([
      { id: "gw1", number: 1, status: "finished" },
      { id: "gw3", number: 3, status: "upcoming" },
      { id: "gw2", number: 2, status: "finished" },
    ]);
    expect(selected?.id).toBe("gw2");
  });

  it("does not treat an upcoming gameweek as current", () => {
    expect(selectDisplayedGameweek([
      { id: "gw1", number: 1, status: "upcoming" },
      { id: "gw2", number: 2, status: "upcoming" },
    ])).toBeNull();
  });
});

describe("findDisplayedGameweek", () => {
  beforeEach(() => {
    findMany.mockReset();
    findFirst.mockReset();
  });

  it("loads every gameweek in the season and ignores a higher upcoming week", async () => {
    findMany.mockResolvedValue([
      { id: "gw1", number: 1, status: "finished" },
      { id: "gw2", number: 2, status: "active" },
      { id: "gw3", number: 3, status: "upcoming" },
    ]);

    const { findDisplayedGameweek } = await import("@/lib/gameweek");
    const selected = await findDisplayedGameweek("season-1");

    expect(selected?.id).toBe("gw2");
    expect(findMany).toHaveBeenCalledWith({ where: { seasonId: "season-1" } });
    expect(findFirst).not.toHaveBeenCalled();
  });
});
