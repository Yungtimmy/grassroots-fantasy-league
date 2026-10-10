/**
 * Freeze today's squads as the lineup snapshot for one named gameweek.
 *
 * Dry run unless --confirm is passed. Writes nothing else: it does not
 * score, recompute, or open a later gameweek.
 *
 *   npm run points:freeze -- --gameweek "Week 1"
 *   npm run points:freeze -- --gameweek "Week 1" --season "2026" --confirm
 *
 * Refuses when a snapshot already exists, a later gameweek has opened or
 * passed its deadline, or a current squad was saved after this deadline.
 * It cannot prove the squad lock was on for the whole time since the
 * deadline. The dry run prints that limit.
 *
 * Do not point this at a database you have not backed up.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitAt = trimmed.indexOf("=");
    if (splitAt === -1) continue;
    const key = trimmed.slice(0, splitAt).trim();
    let value = trimmed.slice(splitAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function safeMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  const url = process.env.DATABASE_URL;
  if (url) message = message.split(url).join("[redacted]");
  return message;
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function roleText(slot: { isStarting: boolean; isCaptain: boolean; isViceCaptain: boolean }): string {
  const place = slot.isStarting ? "XI" : "bench";
  if (slot.isCaptain) return `${place} captain`;
  if (slot.isViceCaptain) return `${place} vice`;
  return place;
}

let exitCode = 0;

async function main() {
  if (process.argv.includes("--write")) {
    console.error("points:freeze does not accept --write. Pass --confirm to freeze, after reading the dry run.");
    process.exit(1);
  }

  const gameweekName = argValue("--gameweek");
  const seasonName = argValue("--season");
  const confirm = process.argv.includes("--confirm");

  if (!gameweekName) {
    console.error('Usage: npm run points:freeze -- --gameweek "Week 1" [--season "Season name"] [--confirm]');
    process.exit(1);
  }

  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Refusing to run.");
    process.exit(1);
  }

  const [{ freezeNamedGameweekSquads }, { prisma }] = await Promise.all([
    import("../src/lib/scoring"),
    import("../src/lib/db"),
  ]);
  const result = confirm
    ? await prisma.$transaction((tx) => freezeNamedGameweekSquads(tx, {
        gameweekName,
        seasonName,
        confirm: true,
      }), { maxWait: 10_000, timeout: 60_000 })
    : await freezeNamedGameweekSquads(prisma, {
        gameweekName,
        seasonName,
        confirm: false,
      });

  console.log("GFL freeze current squads");
  console.log(
    confirm
      ? "Mode: CONFIRM — current squads will be copied onto this gameweek when the guards pass."
      : "Mode: DRY RUN — nothing will be written. Pass --confirm after reading this list.",
  );
  console.log("");

  if (!result.gameweek) {
    console.log("Gameweek: not found");
  } else {
    console.log(
      `Gameweek: ${result.gameweek.name} (GW${result.gameweek.number}, ${result.gameweek.seasonName}, ${result.gameweek.status})`,
    );
    console.log(`Deadline: ${result.gameweek.deadline}`);
    console.log(`Id: ${result.gameweek.id}`);
  }

  console.log("");
  console.log(result.ok ? "Guards: pass" : "Guards: refuse");
  for (const reason of result.reasons) console.log(`  ${reason}`);

  console.log("");
  console.log("Cannot verify:");
  for (const line of result.unverified) console.log(`  ${line}`);

  console.log("");
  console.log(`Squads that ${result.frozen ? "were" : "would be"} captured: ${result.slots.length} players`);
  let currentTeam = "";
  for (const slot of result.slots) {
    if (slot.teamName !== currentTeam) {
      currentTeam = slot.teamName;
      console.log(`  ${slot.teamName} (${slot.userName})`);
    }
    console.log(`    ${slot.playerName}  ${slot.position}  ${roleText(slot)}`);
  }
  if (result.slots.length === 0) console.log("  (no players)");

  console.log("");
  if (result.frozen) {
    console.log("Frozen. Re-save the missed Appearance next. Do not open the next gameweek yet.");
    return;
  }
  if (!result.ok) {
    console.error("Not frozen.");
    exitCode = 1;
    return;
  }
  console.log("No changes written.");
}

main()
  .catch((error) => {
    console.error(safeMessage(error));
    exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) {
      const { prisma } = await import("../src/lib/db");
      await prisma.$disconnect();
    }
    if (exitCode !== 0) process.exit(exitCode);
  });
