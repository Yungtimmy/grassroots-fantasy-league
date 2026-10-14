import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { cookieJar, prismaMock, resetHarness } from "./harness";
import { rebuildGameweekSquads } from "@/lib/squad-rebuild";
import { POST } from "@/app/api/admin/gameweeks/[id]/rebuild-squads/route";

vi.mock("next/headers", async () => {
  const { cookiesModule } = await import("./harness");
  return cookiesModule();
});

vi.mock("@/lib/db", async () => {
  const { prismaMock: prisma } = await import("./harness");
  return { prisma };
});

vi.mock("@/lib/squad-rebuild", () => ({
  rebuildGameweekSquads: vi.fn(),
}));

const rebuild = vi.mocked(rebuildGameweekSquads);

function plan(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    canWrite: true,
    written: false,
    alreadyFrozen: false,
    reason: null,
    gameweek: {
      id: "gw-12",
      name: "Gameweek 12",
      number: 12,
      seasonName: "2026",
      status: "finished",
      endDate: "2026-10-08T22:00:00.000Z",
    },
    teams: [
      {
        status: "ready",
        teamId: "team-1",
        teamName: "Lions",
        userName: "Ada",
        reason: null,
        squadSavedAt: "2026-10-08T18:00:00.000Z",
        players: [
          {
            playerId: "p-zero",
            playerName: "Silent",
            position: "GK",
            isStarting: false,
            isCaptain: false,
            isViceCaptain: false,
            filledFromCurrentSquad: true,
          },
        ],
      },
      {
        status: "skipped",
        teamId: "team-2",
        teamName: "Edited",
        userName: "Bo",
        reason: "This squad was saved after the gameweek ended, so the current squad was not used to fill players who did not score.",
        squadSavedAt: "2026-10-09T09:00:00.000Z",
        players: [],
      },
    ],
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

function post(body: unknown, id = "gw-12") {
  return POST(
    new NextRequest(`http://localhost/api/admin/gameweeks/${id}/rebuild-squads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: { id } },
  );
}

describe("POST /api/admin/gameweeks/[id]/rebuild-squads", () => {
  beforeEach(() => {
    resetHarness();
    rebuild.mockReset();
    process.env.ADMIN_SESSION_SECRET = "test-admin-secret";
    prismaMock.gameweek.findUnique.mockResolvedValue({ id: "gw-12" });
    rebuild.mockResolvedValue(plan() as Awaited<ReturnType<typeof rebuildGameweekSquads>>);
  });

  it("requires an admin session and does not read squads", async () => {
    const res = await post({ confirm: true });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(rebuild).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("previews one gameweek and writes nothing", async () => {
    await signAdmin();
    const res = await post({ confirm: false });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.written).toBe(false);
    expect(body.data.teams.map((team: { teamName: string; status: string }) => ({
      teamName: team.teamName,
      status: team.status,
    }))).toEqual([
      { teamName: "Lions", status: "ready" },
      { teamName: "Edited", status: "skipped" },
    ]);
    expect(body.data.teams[0].players[0].filledFromCurrentSquad).toBe(true);
    expect(rebuild).toHaveBeenCalledWith(prismaMock, { gameweekId: "gw-12", confirm: false });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("confirm runs inside a transaction", async () => {
    await signAdmin();
    rebuild.mockImplementation(async () => plan({ written: true }) as Awaited<ReturnType<typeof rebuildGameweekSquads>>);

    const res = await post({ confirm: true });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.written).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(rebuild).toHaveBeenCalledWith(prismaMock, { gameweekId: "gw-12", confirm: true });
  });

  it("does not report success when confirm writes nothing", async () => {
    await signAdmin();
    rebuild.mockResolvedValue(plan({
      ok: false,
      canWrite: false,
      alreadyFrozen: true,
      written: false,
      reason: "A lineup snapshot already exists for this gameweek. It was not overwritten.",
      teams: [],
    }) as Awaited<ReturnType<typeof rebuildGameweekSquads>>);

    const res = await post({ confirm: true });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.data.written).toBe(false);
    expect(body.error).toMatch(/not overwritten/);
  });

  it("returns 404 when the gameweek id is unknown", async () => {
    await signAdmin();
    prismaMock.gameweek.findUnique.mockResolvedValue(null);

    const res = await post({ confirm: false }, "missing");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(rebuild).not.toHaveBeenCalled();
  });
});
