import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  MATCH_DURATION_MS,
  POSTPONED_STATUS,
  buildMatchUpdate,
  finishWarningMessage,
  fixturesNeedingFinishWarning,
  nextAutomaticMatchStatus,
  recomputePlanForFixtureDelete,
  recomputePlanForFixtureEdit,
} from "@/lib/fixture-admin";

const updateMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    match: {
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
  },
}));

describe("postponed fixtures", () => {
  const kickoff = new Date("2026-10-01T15:00:00.000Z");
  const afterKickoff = new Date(kickoff.getTime() + 3 * 60 * 60 * 1000);

  it("does not auto-mark a postponed fixture live or finished after kickoff", () => {
    expect(nextAutomaticMatchStatus(POSTPONED_STATUS, kickoff, afterKickoff)).toBe(POSTPONED_STATUS);
    expect(nextAutomaticMatchStatus("upcoming", kickoff, afterKickoff)).toBe("live");
    expect(nextAutomaticMatchStatus("live", kickoff, new Date(kickoff.getTime() + MATCH_DURATION_MS))).toBe("finished");
    expect(nextAutomaticMatchStatus("live", kickoff, new Date(kickoff.getTime() + MATCH_DURATION_MS - 1))).toBe("live");
  });

  it("only promotes upcoming and live rows", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    const { autoUpdateMatchStatuses } = await import("@/lib/matches");
    await autoUpdateMatchStatuses();

    expect(updateMany).toHaveBeenCalledTimes(2);
    const statuses = updateMany.mock.calls.map((call) => (call[0] as { where: { status: string } }).where.status);
    expect(statuses).toEqual(["upcoming", "live"]);
    expect(statuses).not.toContain(POSTPONED_STATUS);
  });

  it("recomputes the old and new gameweeks when a fixture with stats moves", () => {
    expect(recomputePlanForFixtureEdit({
      statCount: 3,
      previousGameweekId: "gw1",
      nextGameweekId: "gw2",
      body: { gameweekId: "gw2", date: "2026-10-20", time: "15:00", status: "postponed" },
    })).toEqual(["gw1", "gw2"]);
  });

  it("recomputes the same gameweek once when a scored fixture is only postponed", () => {
    expect(recomputePlanForFixtureEdit({
      statCount: 1,
      previousGameweekId: "gw1",
      nextGameweekId: "gw1",
      body: { status: "postponed", date: "2026-10-20", time: "15:00" },
    })).toEqual(["gw1"]);
  });

  it("does not recompute a move that has no stats, or a score-only edit", () => {
    expect(recomputePlanForFixtureEdit({
      statCount: 0,
      previousGameweekId: "gw1",
      nextGameweekId: "gw2",
      body: { gameweekId: "gw2", date: "2026-10-20" },
    })).toEqual([]);
    expect(recomputePlanForFixtureEdit({
      statCount: 4,
      previousGameweekId: "gw1",
      nextGameweekId: "gw1",
      body: { homeScore: 1, awayScore: 0 },
    })).toEqual([]);
  });

  it("recomputes a deleted fixture's gameweek only when it had stats", () => {
    expect(recomputePlanForFixtureDelete(2, "gw1")).toEqual(["gw1"]);
    expect(recomputePlanForFixtureDelete(0, "gw1")).toEqual([]);
  });

  it("keeps an explicit status and still marks a score-only save finished", () => {
    expect(buildMatchUpdate({ status: "postponed", date: "2026-10-20", time: "16:00" }).status).toBe("postponed");
    expect(buildMatchUpdate({ homeScore: 2, awayScore: 1 }).status).toBe("finished");
  });
});

describe("finish warning", () => {
  const fixtures = [
    { status: "upcoming", statCount: 0, label: "A vs B" },
    { status: "postponed", statCount: 0, label: "C vs D" },
    { status: "finished", statCount: 2, label: "E vs F" },
    { status: "live", statCount: 0, label: "G vs H" },
  ];

  it("lists fixtures with no stats that are not postponed, and does not block on its own", () => {
    const missing = fixturesNeedingFinishWarning(fixtures);
    expect(missing.map((fixture) => fixture.label)).toEqual(["A vs B", "G vs H"]);
    const message = finishWarningMessage("Week 1", missing);
    expect(message).toMatch(/A vs B \(upcoming\)/);
    expect(message).toMatch(/G vs H \(live\)/);
    expect(message).toMatch(/anyway/);
    expect(message).not.toMatch(/C vs D/);
    expect(finishWarningMessage("Week 1", [])).toBeNull();
  });

  it("is what the gameweeks admin page asks before finishing", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/app/teblad/gameweeks/page.tsx"),
      "utf8",
    );
    expect(source).toContain("finishWarningMessage");
    expect(source).toContain("fixturesNeedingFinishWarning");
    expect(source).toContain("window.confirm");
    expect(source).toContain("status: next");
    expect(source).toContain("lineupFrozenAt");
    expect(source).toContain("not frozen");
    expect(source).toContain("Frozen at ");
  });

  it("is offered on the fixtures admin page", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/app/teblad/matches/page.tsx"),
      "utf8",
    );
    expect(source).toContain("Postpone / move");
    expect(source).toContain('value: "postponed"');
  });
});
