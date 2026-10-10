import { describe, expect, it, vi } from "vitest";
import { parseRecomputeArgs, resolveGameweekRef, type GameweekRef } from "@/lib/recompute-cli";
import { squadForRecomputePreview } from "@/lib/scoring";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const weeks: GameweekRef[] = [
  { id: "gw1", name: "Week 1", number: 1, season: "2026" },
  { id: "gw2", name: "Week 2", number: 2, season: "2026" },
  { id: "gw2b", name: "Week 2", number: 2, season: "2025" },
];

describe("points:recompute --gameweek", () => {
  it("parses a dry run and a write for one gameweek", () => {
    expect(parseRecomputeArgs(["node", "script"])).toEqual({
      ok: true,
      write: false,
      captureLive: false,
    });
    expect(parseRecomputeArgs(["node", "script", "--gameweek", "Week 2", "--write"])).toEqual({
      ok: true,
      write: true,
      captureLive: false,
      gameweek: "Week 2",
    });
    expect(parseRecomputeArgs(["node", "script", "--capture-live", "--gameweek", "gw2"])).toEqual({
      ok: true,
      write: false,
      captureLive: true,
      gameweek: "gw2",
    });
  });

  it("refuses --gameweek when the name or id is missing", () => {
    expect(parseRecomputeArgs(["node", "script", "--gameweek"]).ok).toBe(false);
    expect(parseRecomputeArgs(["node", "script", "--gameweek", "--write"]).ok).toBe(false);
  });

  it("resolves an id or a unique name", () => {
    expect(resolveGameweekRef(weeks, "gw2").ok && resolveGameweekRef(weeks, "gw2")).toMatchObject({
      ok: true,
      gameweek: { id: "gw2", name: "Week 2" },
    });
    expect(resolveGameweekRef(weeks, "Week 1")).toMatchObject({
      ok: true,
      gameweek: { id: "gw1" },
    });
  });

  it("refuses an unknown gameweek and an ambiguous name", () => {
    const missing = resolveGameweekRef(weeks, "Week 9");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toMatch(/No gameweek/);

    const ambiguous = resolveGameweekRef(weeks, "Week 2");
    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) expect(ambiguous.error).toMatch(/Pass the gameweek id/);
  });

  it("previews only the requested gameweek and keeps the others stored", () => {
    const squad = [{ userId: "u", teamId: "t", playerId: "p", isStarting: true, isCaptain: false, isViceCaptain: false }];
    expect(squadForRecomputePreview({
      gameweekId: "gw1",
      recomputeIds: ["gw1"],
      lineupFrozenAt: "2026-10-01",
      snapshotSquad: squad,
      captureLiveId: null,
      currentSquad: [],
    })).toBe(squad);

    expect(squadForRecomputePreview({
      gameweekId: "gw2",
      recomputeIds: ["gw1"],
      lineupFrozenAt: "2026-10-08",
      snapshotSquad: squad,
      captureLiveId: null,
      currentSquad: [],
    })).toBeNull();
  });

  it("does not preview a gameweek that has no snapshot and is not the live capture", () => {
    expect(squadForRecomputePreview({
      gameweekId: "gw2",
      recomputeIds: [],
      lineupFrozenAt: null,
      snapshotSquad: [],
      captureLiveId: null,
      currentSquad: [],
    })).toBeNull();
  });
});
