import { beforeEach, describe, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";
import { cookieJar, getUser, prismaMock, resetHarness } from "./harness";
import { invalidSupabaseUser, supabaseUser } from "./google-user";
import { jsonRequest } from "./http";
import { POST } from "@/app/api/auth/claim/route";

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

const player = {
  id: "user-1",
  email: "player@example.com",
  role: "user",
  name: "Player",
};

describe("POST /api/auth/claim", () => {
  beforeEach(() => {
    resetHarness();
    getUser.mockImplementation(async (token: string) => {
      if (token === "valid") return supabaseUser("player@example.com");
      if (token === "unconfirmed") return supabaseUser("player@example.com", { confirmed: false });
      if (token === "github") return supabaseUser("player@example.com", { provider: "github" });
      return invalidSupabaseUser();
    });
  });

  it("does not log anyone in when only an email is supplied", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "victim",
      email: "victim@example.com",
      role: "user",
      name: "Victim",
    });

    const res = await POST(
      jsonRequest("http://localhost/api/auth/claim", { email: "victim@example.com" })
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(cookieJar.has("gfl-token")).toBe(false);
  });

  it("rejects a mismatched, unconfirmed, or non-Google token without looking up a user", async () => {
    for (const token of ["nope", "unconfirmed", "github"]) {
      resetHarness();
      getUser.mockImplementation(async (value: string) => {
        if (value === "valid") return supabaseUser("player@example.com");
        if (value === "unconfirmed") return supabaseUser("player@example.com", { confirmed: false });
        if (value === "github") return supabaseUser("player@example.com", { provider: "github" });
        return invalidSupabaseUser();
      });

      const res = await POST(
        jsonRequest(
          "http://localhost/api/auth/claim",
          { email: "player@example.com", accessToken: token },
        )
      );
      expect(res.status).toBe(401);
      expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
      expect(cookieJar.has("gfl-token")).toBe(false);
    }

    const mismatch = await POST(
      jsonRequest(
        "http://localhost/api/auth/claim",
        { email: "victim@example.com" },
        "valid"
      )
    );
    expect(mismatch.status).toBe(403);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it("issues a session for the verified Google account when that user is registered", async () => {
    prismaMock.user.findFirst.mockResolvedValue(player);

    const res = await POST(
      jsonRequest(
        "http://localhost/api/auth/claim",
        { email: "Player@Example.com" },
        "valid"
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user).toMatchObject({ id: "user-1", email: "player@example.com" });
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "player@example.com", mode: "insensitive" } },
      select: { id: true, email: true, role: true, name: true },
    });

    const token = cookieJar.get("gfl-token");
    expect(token).toBeTruthy();
    const { payload } = await jwtVerify(
      token as string,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("player@example.com");
    expect(payload.role).toBe("user");
  });

  it("sends an unregistered Google user to sign-up instead of creating a session", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const res = await POST(
      jsonRequest("http://localhost/api/auth/claim", { accessToken: "valid" })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(cookieJar.has("gfl-token")).toBe(false);
  });
});
