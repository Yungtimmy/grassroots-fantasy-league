import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { cookieJar, getUser, prismaMock, resetHarness } from "./harness";
import { supabaseUser } from "./google-user";
import { jsonRequest } from "./http";
import { POST as registerAndPay } from "@/app/api/auth/register-and-pay/route";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";

vi.mock("next/headers", async () => {
  const { cookiesModule } = await import("./harness");
  return cookiesModule();
});

vi.mock("@/lib/db", async () => {
  const { prismaMock: prisma } = await import("./harness");
  return { prisma };
});

vi.mock("@/lib/supabase", async () => {
  const { getUser: verify } = await import("./harness");
  return {
    createSupabaseAnonClient: () => ({ auth: { getUser: verify } }),
  };
});

const profile = {
  name: "Player One",
  username: "player_one",
  universityId: "uni-1",
  email: "player@example.com",
  accessToken: "valid",
};

describe("registration and password sign-in", () => {
  beforeEach(() => {
    resetHarness();
    process.env.PAYMENT_PROVIDER = "mock";
    getUser.mockImplementation(async (token: string) => {
      if (token === "valid") return supabaseUser("player@example.com");
      return { data: { user: null }, error: { message: "invalid jwt" } };
    });
  });

  it("does not start payment registration from an email alone", async () => {
    const res = await registerAndPay(
      jsonRequest("http://localhost/api/auth/register-and-pay", {
        name: "Victim",
        username: "victim",
        universityId: "uni-1",
        email: "victim@example.com",
      })
    );
    expect(res.status).toBe(401);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("starts payment registration for the verified Google email", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.university.findUnique.mockResolvedValue({ id: "uni-1", status: "active" });
    prismaMock.season.findFirst.mockResolvedValue({
      id: "season-1",
      registrationFee: 5000,
      status: "active",
    });
    prismaMock.universityLeague.upsert.mockResolvedValue({ id: "league-1", entryFee: 5200 });
    prismaMock.payment.create.mockResolvedValue({ id: "pay-1" });

    const res = await registerAndPay(
      jsonRequest(
        "http://localhost/api/auth/register-and-pay",
        { ...profile, email: "Player@Example.com" },
        "valid"
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.authorizationUrl).toContain("/api/payments/callback?tx_ref=");
    expect(body.data.reference).toMatch(/^GFL-/);
    expect(body.data.amount).toBe(5200);

    expect(prismaMock.payment.create).toHaveBeenCalledTimes(1);
    const metadata = JSON.parse(prismaMock.payment.create.mock.calls[0][0].data.metadata);
    expect(metadata.email).toBe("player@example.com");
    expect(metadata.username).toBe("player_one");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("does not create an account for a different email than the Google session", async () => {
    const res = await register(
      jsonRequest(
        "http://localhost/api/auth/register",
        { ...profile, email: "victim@example.com" },
        "valid"
      )
    );
    expect(res.status).toBe(403);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("registers and signs in the verified Google user", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.university.findUnique.mockResolvedValue({ id: "uni-1", status: "active" });
    prismaMock.season.findFirst.mockResolvedValue({
      id: "season-1",
      registrationFee: 5000,
      status: "active",
    });
    prismaMock.universityLeague.upsert.mockResolvedValue({ id: "league-1" });
    prismaMock.user.create.mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      username: "player_one",
      name: "Player One",
      role: "user",
    });
    prismaMock.universityLeagueMember.create.mockResolvedValue({ id: "member-1" });

    const res = await register(
      jsonRequest("http://localhost/api/auth/register", profile, "valid")
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("player@example.com");
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "player@example.com", username: "player_one" }),
      })
    );
    expect(cookieJar.get("gfl-token")).toBeTruthy();
  });

  it("still accepts a correct password and rejects a wrong one", async () => {
    const passwordHash = await bcrypt.hash("correct-horse", 4);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-2",
      email: "password@example.com",
      username: "secret",
      name: "Secret",
      avatar: null,
      role: "user",
      passwordHash,
    });

    const ok = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "password@example.com",
        password: "correct-horse",
      })
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).success).toBe(true);
    expect(cookieJar.get("gfl-token")).toBeTruthy();

    cookieJar.delete("gfl-token");
    const bad = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "password@example.com",
        password: "wrong-password",
      })
    );
    expect(bad.status).toBe(401);
    expect(cookieJar.has("gfl-token")).toBe(false);
  });

  it("does not let a password login take over a Google account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      username: "player_one",
      name: "Player",
      avatar: null,
      role: "user",
      passwordHash: "google-oauth",
    });

    const res = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "player@example.com",
        password: "anything",
      })
    );
    expect(res.status).toBe(401);
    expect(cookieJar.has("gfl-token")).toBe(false);
  });
});
