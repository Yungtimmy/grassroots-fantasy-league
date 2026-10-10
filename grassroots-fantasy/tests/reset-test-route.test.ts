import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { cookieJar, prismaMock, resetHarness } from "./harness";
import { isTestDataResetEnabled } from "@/lib/reset-guard";
import { POST } from "@/app/api/admin/reset-test/route";

vi.mock("next/headers", async () => {
  const { cookiesModule } = await import("./harness");
  return cookiesModule();
});

vi.mock("@/lib/db", async () => {
  const { prismaMock: prisma } = await import("./harness");
  return { prisma };
});

async function signAdmin(role = "admin", expired = false) {
  const secret = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET);
  const token = new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();
  if (expired) token.setExpirationTime(Math.floor(Date.now() / 1000) - 60);
  else token.setExpirationTime("1h");
  return token.sign(secret);
}

function stubDeletes() {
  prismaMock.fantasyPointTransaction.deleteMany.mockResolvedValue({ count: 1 });
  prismaMock.fantasyTeamPlayer.deleteMany.mockResolvedValue({ count: 2 });
  prismaMock.fantasyTeam.deleteMany.mockResolvedValue({ count: 3 });
  prismaMock.playerMatchStatistic.deleteMany.mockResolvedValue({ count: 4 });
  prismaMock.match.deleteMany.mockResolvedValue({ count: 5 });
  prismaMock.gameweek.deleteMany.mockResolvedValue({ count: 6 });
  prismaMock.realPlayer.updateMany.mockResolvedValue({ count: 7 });
}

describe("test reset availability", () => {
  it("is disabled in production unless explicitly enabled", () => {
    expect(isTestDataResetEnabled({ NODE_ENV: "test" })).toBe(true);
    expect(isTestDataResetEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isTestDataResetEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isTestDataResetEnabled({ NODE_ENV: "production", ALLOW_TEST_DATA_RESET: "false" })
    ).toBe(false);
    expect(
      isTestDataResetEnabled({ NODE_ENV: "production", ALLOW_TEST_DATA_RESET: "true" })
    ).toBe(true);
  });
});

function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("POST /api/admin/reset-test", () => {
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    resetHarness();
    delete process.env.ALLOW_TEST_DATA_RESET;
    setNodeEnv(previousNodeEnv);
    process.env.ADMIN_SESSION_SECRET = "test-admin-secret";
  });

  it("rejects a request with no admin session and does not touch data", async () => {
    stubDeletes();
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.fantasyPointTransaction.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.match.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.gameweek.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid or non-admin cookie", async () => {
    cookieJar.set("gfl-admin", "not-a-jwt");
    expect((await POST()).status).toBe(401);

    cookieJar.set("gfl-admin", await signAdmin("user"));
    expect((await POST()).status).toBe(401);

    cookieJar.set("gfl-admin", await signAdmin("admin", true));
    expect((await POST()).status).toBe(401);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("is not reachable in production, even with a valid admin session", async () => {
    setNodeEnv("production");
    cookieJar.set("gfl-admin", await signAdmin());
    stubDeletes();

    const res = await POST();
    expect(res.status).toBe(404);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.fantasyPointTransaction.deleteMany).not.toHaveBeenCalled();
  });

  it("still requires an admin session when production reset is explicitly enabled", async () => {
    setNodeEnv("production");
    process.env.ALLOW_TEST_DATA_RESET = "true";

    const blocked = await POST();
    expect(blocked.status).toBe(401);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("clears test data for an admin session outside production", async () => {
    const { prisma } = await import("@/lib/db");
    expect(prisma).toBe(prismaMock);

    cookieJar.set("gfl-admin", await signAdmin());
    stubDeletes();

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.details).toEqual({
      pointTransactions: 1,
      squadPlayers: 2,
      teams: 3,
      playerStats: 4,
      matches: 5,
      gameweeks: 6,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(prismaMock.fantasyTeam.deleteMany).toHaveBeenCalled();
    expect(prismaMock.realPlayer.updateMany).toHaveBeenCalledWith({ data: { totalPoints: 0 } });
  });
});
