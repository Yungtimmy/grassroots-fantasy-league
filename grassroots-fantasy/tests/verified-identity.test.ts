import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUser, resetHarness } from "./harness";
import { invalidSupabaseUser, supabaseUser } from "./google-user";
import {
  identityFromSupabaseUser,
  resolveGoogleIdentity,
} from "@/lib/verified-identity";

vi.mock("@/lib/supabase", async () => {
  const { getUser: verify } = await import("./harness");
  return {
    createSupabaseAnonClient: () => ({ auth: { getUser: verify } }),
  };
});

describe("identityFromSupabaseUser", () => {
  it("accepts a confirmed Google user", () => {
    const identity = identityFromSupabaseUser(supabaseUser("player@example.com").data.user);
    expect(identity).toEqual({ email: "player@example.com", userId: "sb-user-1" });
  });

  it("rejects email-only records, unconfirmed emails, and non-Google providers", () => {
    expect(identityFromSupabaseUser(null)).toBeNull();
    expect(identityFromSupabaseUser({ id: "1", email: "a@b.com" })).toBeNull();
    expect(
      identityFromSupabaseUser(supabaseUser("a@b.com", { confirmed: false }).data.user)
    ).toBeNull();
    expect(
      identityFromSupabaseUser(supabaseUser("a@b.com", { provider: "github" }).data.user)
    ).toBeNull();
  });
});

describe("resolveGoogleIdentity", () => {
  beforeEach(() => {
    resetHarness();
  });

  it("fails when no access token is provided", async () => {
    const result = await resolveGoogleIdentity(
      { headers: new Headers() },
      { email: "victim@example.com" }
    );
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("fails when the token is not a verified Google session", async () => {
    getUser.mockResolvedValue(invalidSupabaseUser());
    const result = await resolveGoogleIdentity(
      { headers: new Headers({ authorization: "Bearer nope" }) },
      { email: "victim@example.com" }
    );
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("fails when the requested email belongs to someone else", async () => {
    getUser.mockResolvedValue(supabaseUser("player@example.com"));
    const result = await resolveGoogleIdentity(
      { headers: new Headers({ authorization: "Bearer valid" }) },
      { email: "victim@example.com" }
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("returns the verified email when the token matches", async () => {
    getUser.mockResolvedValue(supabaseUser("player@example.com"));
    const result = await resolveGoogleIdentity(
      { headers: new Headers() },
      { email: "Player@Example.com", accessToken: "valid" }
    );
    expect(result).toEqual({
      ok: true,
      identity: { email: "player@example.com", userId: "sb-user-1" },
    });
  });
});
