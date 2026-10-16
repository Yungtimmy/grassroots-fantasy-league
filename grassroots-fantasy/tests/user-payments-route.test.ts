import { beforeEach, describe, expect, it, vi } from "vitest";
import { createToken } from "@/lib/auth";
import { GET } from "@/app/api/user/payments/route";
import {
  displayPaymentAmount,
  paymentHistoryStatus,
  toPaymentHistory,
  type HistoryPayment,
  type LeagueFee,
  type SeasonFee,
} from "@/lib/payment-history";
import { cookieJar, prismaMock, resetHarness } from "./harness";

vi.mock("next/headers", async () => {
  const { cookiesModule } = await import("./harness");
  return cookiesModule();
});

vi.mock("@/lib/db", async () => {
  const { prismaMock: prisma } = await import("./harness");
  return { prisma };
});

const season: SeasonFee = {
  id: "season-1",
  name: "2026 Season",
  registrationFee: 5200,
};

const league: LeagueFee = {
  id: "league-1",
  name: "UNILAG Fantasy League",
  entryFee: 50000,
  universityId: "uni-1",
  seasonId: "season-1",
  universityName: "University of Lagos",
};

function payment(overrides: Partial<HistoryPayment> = {}): HistoryPayment {
  return {
    id: "pay-1",
    amount: 5200,
    reference: "GFL-1",
    status: "successful",
    metadata: null,
    seasonId: "season-1",
    universityId: "uni-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

async function signIn(userId: string) {
  const token = await createToken({ userId, email: `${userId}@example.com`, role: "user" });
  cookieJar.set("gfl-token", token);
}

describe("payment history units", () => {
  it("keeps a season registration fee in naira and converts a matching league entry fee from kobo", () => {
    expect(displayPaymentAmount(5200, null)).toBe(5200);
    expect(displayPaymentAmount(50000, 50000)).toBe(500);
    expect(displayPaymentAmount(5200, 50000)).toBe(5200);
    expect(paymentHistoryStatus("successful")).toBe("SUCCESSFUL");
    expect(paymentHistoryStatus("pending")).toBe("PENDING");
    expect(paymentHistoryStatus("failed")).toBe("FAILED");
  });

  it("returns newest payments first with the fields the history page renders", () => {
    const older = payment({
      id: "pay-old",
      amount: 5200,
      reference: "GFL-OLD",
      status: "pending",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newer = payment({
      id: "pay-new",
      amount: 50000,
      reference: "GFL-NEW",
      status: "failed",
      metadata: JSON.stringify({ leagueId: "league-1", email: "hidden@example.com" }),
      createdAt: new Date("2026-03-02T00:00:00.000Z"),
    });

    expect(toPaymentHistory([older, newer], [season], [league])).toEqual([
      {
        id: "pay-new",
        date: "2026-03-02T00:00:00.000Z",
        amount: 500,
        status: "FAILED",
        reference: "GFL-NEW",
        description: "Entry fee for UNILAG Fantasy League",
      },
      {
        id: "pay-old",
        date: "2026-01-01T00:00:00.000Z",
        amount: 5200,
        status: "PENDING",
        reference: "GFL-OLD",
        description: "2026 Season registration",
      },
    ]);
  });
});

describe("GET /api/user/payments", () => {
  beforeEach(() => {
    resetHarness();
    prismaMock.season.findMany.mockResolvedValue([season]);
    prismaMock.universityLeague.findMany.mockResolvedValue([
      {
        id: league.id,
        name: league.name,
        entryFee: league.entryFee,
        universityId: league.universityId,
        seasonId: league.seasonId,
        university: { name: league.universityName },
      },
    ]);
  });

  it("returns 401 and does not read payments when the gfl-token session is missing or invalid", async () => {
    const missing = await GET();
    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({ error: "Unauthorized" });

    cookieJar.set("gfl-token", "not-a-token");
    const invalid = await GET();
    expect(invalid.status).toBe(401);
    expect(await invalid.json()).toEqual({ error: "Unauthorized" });
    expect(prismaMock.payment.findMany).not.toHaveBeenCalled();
  });

  it("returns only the signed-in user's payments, newest first, in naira", async () => {
    await signIn("user-1");
    prismaMock.payment.findMany.mockResolvedValue([
      payment({
        id: "pay-old",
        amount: 5200,
        reference: "GFL-OLD",
        status: "pending",
        metadata: "not-json",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      payment({
        id: "pay-new",
        amount: 50000,
        reference: "GFL-NEW",
        status: "successful",
        metadata: JSON.stringify({ leagueId: "league-1", email: "hidden@example.com" }),
        createdAt: new Date("2026-03-02T00:00:00.000Z"),
      }),
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prismaMock.payment.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        reference: true,
        status: true,
        metadata: true,
        seasonId: true,
        universityId: true,
        createdAt: true,
      },
    });
    expect(body.payments).toEqual([
      {
        id: "pay-new",
        date: "2026-03-02T00:00:00.000Z",
        amount: 500,
        status: "SUCCESSFUL",
        reference: "GFL-NEW",
        description: "Entry fee for UNILAG Fantasy League",
      },
      {
        id: "pay-old",
        date: "2026-01-01T00:00:00.000Z",
        amount: 5200,
        status: "PENDING",
        reference: "GFL-OLD",
        description: "2026 Season registration",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("hidden@example.com");
    expect(prismaMock.season.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["season-1"] } },
      select: { id: true, name: true, registrationFee: true },
    });
  });

  it("returns an empty list without looking up fees when the user has no payments", async () => {
    await signIn("user-2");
    prismaMock.payment.findMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ payments: [] });
    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-2" } }),
    );
    expect(prismaMock.season.findMany).not.toHaveBeenCalled();
    expect(prismaMock.universityLeague.findMany).not.toHaveBeenCalled();
  });
});
