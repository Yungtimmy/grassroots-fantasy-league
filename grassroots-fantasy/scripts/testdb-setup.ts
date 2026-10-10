/**
 * Apply the Prisma schema and seed the Supabase test project.
 * Exits non-zero before any database command unless every DB URL points
 * at project rctbzvpieotfmoagqbbk.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSeedPlan, buildSeedPlan, TEST_PASSWORD } from "./testdb-data";
import {
  assertDirectSchemaUrl,
  assertTestDatabase,
  TestDatabaseGuardError,
  TEST_SUPABASE_PROJECT_REF,
} from "../src/lib/test-db-guard";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function applyEnvFile(filePath: string, locked: Set<string>) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice("export ".length).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (locked.has(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadEnv() {
  const locked = new Set<string>();
  for (const key of Object.keys(process.env)) locked.add(key);
  applyEnvFile(path.join(appRoot, ".env"), locked);
  applyEnvFile(path.join(appRoot, ".env.local"), locked);
}

function runPrisma(args: string[], env: NodeJS.ProcessEnv) {
  const prisma = path.join(appRoot, "node_modules", ".bin", "prisma");
  const result = spawnSync(prisma, args, {
    cwd: appRoot,
    env,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function pushTarget(databaseUrl: string, directUrl: string | null): string {
  return directUrl ?? databaseUrl;
}

async function main() {
  process.chdir(appRoot);
  loadEnv();

  let databaseUrl: string;
  let directUrl: string | null;
  let schemaUrl: string;
  try {
    ({ databaseUrl, directUrl } = assertTestDatabase(process.env));
    assertSeedPlan(buildSeedPlan(new Date()));
    schemaUrl = pushTarget(databaseUrl, directUrl);
    assertDirectSchemaUrl(schemaUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refusing to run.";
    console.error(message);
    process.exit(1);
  }

  const schemaHost = new URL(schemaUrl).host;

  console.log(`Applying schema to Supabase project ${TEST_SUPABASE_PROJECT_REF} (${schemaHost}).`);
  const schemaEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: schemaUrl,
    PRISMA_HIDE_UPDATE_MESSAGE: "1",
  };
  // This repo has no migration history. `prisma db push` syncs schema.prisma,
  // including a gameweek lineup snapshot model once that checkout contains it.
  runPrisma(["db", "push", "--skip-generate"], schemaEnv);
  runPrisma(["generate"], schemaEnv);

  const { seedTestDatabase } = await import("./testdb-seed");
  const plan = await seedTestDatabase();
  const past = plan.gameweeks.find((gw) => gw.deadline.getTime() < plan.now.getTime());
  const upcoming = plan.gameweeks.find((gw) => gw.deadline.getTime() > plan.now.getTime());
  console.log("");
  console.log(`Test database ready (Supabase project ${TEST_SUPABASE_PROJECT_REF}).`);
  console.log(`Season: ${plan.season.name}`);
  console.log(`Past deadline: ${past?.name} (${past?.deadline.toISOString()})`);
  console.log(`Upcoming deadline: ${upcoming?.name} (${upcoming?.deadline.toISOString()})`);
  console.log(`Manager password: ${TEST_PASSWORD}`);
  for (const mgr of plan.managers) {
    console.log(`  ${mgr.email}  ${mgr.name}`);
  }
  console.log("Re-run is safe. Seeded fixture stats and these managers' points are reset.");
}

main().catch((error: unknown) => {
  if (error instanceof TestDatabaseGuardError) {
    console.error(error.message);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exit(1);
});
