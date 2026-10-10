import { createSupabaseAnonClient } from "@/lib/supabase";

export interface VerifiedGoogleIdentity {
  email: string;
  userId: string;
}

export type IdentityResult =
  | { ok: true; identity: VerifiedGoogleIdentity }
  | { ok: false; status: 401 | 403; error: string };

const GOOGLE_SIGN_IN_REQUIRED = "A verified Google sign-in is required";
const EMAIL_MISMATCH = "Email does not match the signed-in Google account";

type GoogleUserLike = {
  id?: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: { provider?: string; providers?: string[] } | null;
  identities?: { provider?: string }[] | null;
};

export function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function extractAccessToken(
  headers: { get(name: string): string | null },
  body: { accessToken?: unknown }
): string | null {
  const header = headers.get("authorization");
  if (header) {
    const match = /^Bearer\s+(\S+)/i.exec(header.trim());
    if (match?.[1]) return match[1];
  }
  if (typeof body.accessToken === "string" && body.accessToken.trim()) {
    return body.accessToken.trim();
  }
  return null;
}

export function identityFromSupabaseUser(
  user: GoogleUserLike | null | undefined
): VerifiedGoogleIdentity | null {
  const email = user?.email?.trim();
  if (!user?.id || !email || !email.includes("@")) return null;
  if (!user.email_confirmed_at) return null;

  const providers = new Set<string>();
  if (user.app_metadata?.provider) providers.add(user.app_metadata.provider);
  for (const provider of user.app_metadata?.providers ?? []) {
    if (provider) providers.add(provider);
  }
  for (const identity of user.identities ?? []) {
    if (identity?.provider) providers.add(identity.provider);
  }
  if (!providers.has("google")) return null;

  return { email, userId: user.id };
}

export async function verifyGoogleAccessToken(
  accessToken: string
): Promise<VerifiedGoogleIdentity | null> {
  try {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return identityFromSupabaseUser(data.user);
  } catch {
    return null;
  }
}

export async function resolveGoogleIdentity(
  request: { headers: { get(name: string): string | null } },
  body: { email?: unknown; accessToken?: unknown }
): Promise<IdentityResult> {
  const accessToken = extractAccessToken(request.headers, body);
  if (!accessToken) {
    return { ok: false, status: 401, error: GOOGLE_SIGN_IN_REQUIRED };
  }

  const identity = await verifyGoogleAccessToken(accessToken);
  if (!identity) {
    return { ok: false, status: 401, error: GOOGLE_SIGN_IN_REQUIRED };
  }

  if (typeof body.email === "string" && body.email.trim() && !emailsMatch(body.email, identity.email)) {
    return { ok: false, status: 403, error: EMAIL_MISMATCH };
  }

  return { ok: true, identity };
}

export async function readJsonObject(request: {
  json(): Promise<unknown>;
}): Promise<Record<string, unknown>> {
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}
