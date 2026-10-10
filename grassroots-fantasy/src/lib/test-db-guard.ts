/**
 * Refuses to touch any database except the empty Supabase test project.
 * Pure: no client, no network, no writes. The setup script calls this
 * before Prisma is loaded.
 */

export const TEST_SUPABASE_PROJECT_REF = "rctbzvpieotfmoagqbbk";

/** Every database URL this app reads. DATABASE_URL is required; the rest are checked when set. */
export const DATABASE_URL_ENV_VARS = ["DATABASE_URL", "DIRECT_URL"] as const;

export type DatabaseUrlEnvVar = (typeof DATABASE_URL_ENV_VARS)[number];

const REQUIRED_DATABASE_URL_ENV_VARS: readonly DatabaseUrlEnvVar[] = ["DATABASE_URL"];

export class TestDatabaseGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestDatabaseGuardError";
  }
}

export type EnvSource = Record<string, string | undefined>;

export type IdentifiedProject =
  | { ok: true; ref: string }
  | { ok: false; reason: string };

function normalizeEnvValue(value: string | undefined): string | null {
  if (value == null) return null;
  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * A URL points at a Supabase project only when the username is
 * `postgres.<ref>` (pooler) and/or the host is `db.<ref>.supabase.co`.
 * A password or path that happens to contain the ref does not count.
 */
export function identifySupabaseProject(connectionString: string): IdentifiedProject {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return { ok: false, reason: "could not be parsed as a URL" };
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    return {
      ok: false,
      reason: `uses ${url.protocol.replace(":", "") || "an unknown protocol"} instead of postgres`,
    };
  }

  const host = url.hostname.toLowerCase();
  let user = "";
  try {
    user = decodeURIComponent(url.username).toLowerCase();
  } catch {
    user = url.username.toLowerCase();
  }

  const refs: string[] = [];
  const hostMatch = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  if (hostMatch) refs.push(hostMatch[1]);
  const userMatch = user.match(/^postgres\.([a-z0-9]+)$/);
  if (userMatch) refs.push(userMatch[1]);

  if (refs.length === 0) {
    return {
      ok: false,
      reason: `does not name a Supabase project (host ${host || "unknown"})`,
    };
  }
  if (refs.length === 2 && refs[0] !== refs[1]) {
    return {
      ok: false,
      reason: `names more than one Supabase project (${refs[0]}, ${refs[1]})`,
    };
  }
  return { ok: true, ref: refs[0] };
}

function refusal(envName: string, detail: string): TestDatabaseGuardError {
  return new TestDatabaseGuardError(
    `Refusing to run. ${envName} ${detail}. This command only runs against Supabase project ${TEST_SUPABASE_PROJECT_REF}. Nothing was written.`
  );
}

function assertOne(envName: string, connectionString: string): void {
  const identified = identifySupabaseProject(connectionString);
  if (!identified.ok) {
    throw refusal(envName, identified.reason);
  }
  if (identified.ref !== TEST_SUPABASE_PROJECT_REF) {
    throw refusal(
      envName,
      `points at Supabase project ${identified.ref}, not ${TEST_SUPABASE_PROJECT_REF}`
    );
  }
}

export function assertTestDatabase(env: EnvSource): {
  databaseUrl: string;
  directUrl: string | null;
} {
  const resolved: Partial<Record<DatabaseUrlEnvVar, string>> = {};

  for (const name of DATABASE_URL_ENV_VARS) {
    const value = normalizeEnvValue(env[name]);
    if (!value) {
      if (REQUIRED_DATABASE_URL_ENV_VARS.includes(name)) {
        throw refusal(name, "is not set");
      }
      continue;
    }
    assertOne(name, value);
    resolved[name] = value;
  }

  const databaseUrl = resolved.DATABASE_URL;
  if (!databaseUrl) {
    throw refusal("DATABASE_URL", "is not set");
  }

  return {
    databaseUrl,
    directUrl: resolved.DIRECT_URL ?? null,
  };
}

/**
 * `prisma db push` must use a session or direct connection. The transaction
 * pooler (port 6543 / pgbouncer) can fail halfway through DDL.
 */
export function assertDirectSchemaUrl(connectionString: string): void {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw refusal("schema URL", "could not be parsed as a URL");
  }
  const port = url.port || "5432";
  if (port === "6543" || url.searchParams.get("pgbouncer") === "true") {
    throw refusal(
      "schema connection",
      "uses the transaction pooler (port 6543). Set DIRECT_URL to the session pooler or db." +
        TEST_SUPABASE_PROJECT_REF +
        ".supabase.co on port 5432"
    );
  }
}
