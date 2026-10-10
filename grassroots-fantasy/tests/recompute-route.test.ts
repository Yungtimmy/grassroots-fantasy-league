import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { cookieJar, resetHarness } from "./harness";
import { ScoringError, previewSeasonRecompute, recomputeAllStoredPoints } from "@/lib/scoring";
import { POST } from "@/app/api/admin/gameweeks/[id]/recompute/route";

vi.mock("next/headers", async () => {
  const { cookiesModule } = await import("./harness");
  return cookiesModule();
});

vi.mock("@/lib/db", async () => {
  const { prismaMock: prisma } = await import("./harness");
  return { prisma };
});

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
    previewSeasonRecompute: vi.fn(),
    recomputeAllStoredPoints: vi.fn(),
  };
});

const preview = vi.mocked(previewSeasonRecompute);
const writePoints = vi.mocked(recomputeAllStoredPoints);

const gameweekId = "gw-active";

function report(overrides: Record<string, unknown> = {}) {
  return {
    managers: [
      {
        userId: "u1",
        teamId: "t1",
        name: "Ada",
        username: "ada",
        teamName: "Lions",
        season: "2026",
        before: 10,
        after: 14,
      },
      {
        userId: "u2",
        teamId: "t2",
        name: "Bo",
        username: "bo",
        teamName: "Tigers",
        season: "2026",
        before: 5,
        after: 5,
      },
      {
        userId: "u3",
        teamId: "t3",
        name: "Cy",
        username: "cy",
        teamName: "Other",
        season: "2025",
        before: 99,
        after: 99,
      },
    ],
    playersChanged: [],
    playersUnchanged: 3,
    skippedGameweeks: [],
    unattributedPoints: 0,
    unattributedRows: 0,
    captureLiveId: null,
    targetedGameweek: { id: gameweekId, name: "Week 2", number: 2, season: "2026" },
    ...overrides,
  };
}

async function signAdmin() {
  const secret = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  cookieJar.set("gfl-admin", token);
}

function post(body: unknown, id = gameweekId) {
  return POST(
    new NextRequest(`http://localhost/api/admin/gameweeks/${id}/recompute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: { id } },
  );
}

describe("POST /api/admin/gameweeks/[id]/recompute", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    resetHarness();
    preview.mockReset();
    writePoints.mockReset();
    log.mockClear();
    preview.mockResolvedValue(report() as Awaited<ReturnType<typeof previewSeasonRecompute>>);
    writePoints.mockResolvedValue(report() as Awaited<ReturnType<typeof recomputeAllStoredPoints>>);
    process.env.ADMIN_SESSION_SECRET = "test-admin-secret";
  });

  it("requires an admin session and does not read or write points", async () => {
    const res = await post({ confirm: true });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(preview).not.toHaveBeenCalled();
    expect(writePoints).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it("previews one gameweek and writes nothing", async () => {
    await signAdmin();
    const res = await post({ confirm: false });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.written).toBe(false);
    expect(body.data.ok).toBe(true);
    expect(body.data.teams).toEqual([
      expect.objectContaining({ teamName: "Lions", before: 10, after: 14, delta: 4 }),
      expect.objectContaining({ teamName: "Tigers", before: 5, after: 5, delta: 0 }),
    ]);
    expect(body.data.totals).toEqual({
      before: 15,
      after: 19,
      delta: 4,
      teams: 2,
      teamsChanged: 1,
    });
    expect(preview).toHaveBeenCalledWith({ gameweek: gameweekId });
    expect(writePoints).not.toHaveBeenCalled();
    expect(log.mock.calls.some((call) => String(call[0]).includes("[recompute-points] DRY RUN"))).toBe(true);
  });

  it("confirm writes through the same recompute as the script", async () => {
    await signAdmin();
    const res = await post({ confirm: true });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.written).toBe(true);
    expect(preview).toHaveBeenCalledWith({ gameweek: gameweekId });
    expect(writePoints).toHaveBeenCalledTimes(1);
    expect(writePoints).toHaveBeenCalledWith({ gameweek: gameweekId });
    expect(log.mock.calls.some((call) => String(call[0]).includes("[recompute-points] WRITTEN"))).toBe(true);
  });

  it("refuses a gameweek with no lineup snapshot and does not write", async () => {
    await signAdmin();
    preview.mockResolvedValue(report({
      skippedGameweeks: [{
        gameweekId,
        number: 2,
        season: "2026",
        reason: "No lineup snapshot. Current squads belong to a later gameweek, so this gameweek is skipped.",
        isLive: false,
      }],
    }) as Awaited<ReturnType<typeof previewSeasonRecompute>>);

    const res = await post({ confirm: true });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.data.ok).toBe(false);
    expect(body.data.written).toBe(false);
    expect(body.error).toMatch(/No lineup snapshot/);
    expect(writePoints).not.toHaveBeenCalled();
    expect(log.mock.calls.some((call) => String(call[0]).includes("[recompute-points] REFUSED"))).toBe(true);
  });

  it("returns the scorer error and does not write when the gameweek id is unknown", async () => {
    await signAdmin();
    preview.mockRejectedValue(new ScoringError("No gameweek with id or name \"missing\".", 400));

    const res = await post({ confirm: true }, "missing");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(writePoints).not.toHaveBeenCalled();
  });
});
