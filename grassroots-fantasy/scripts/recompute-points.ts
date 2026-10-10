/**
 * Rebuild gameweek points, manager Overall, and admin player totals from
 * the stored match stats.
 *
 * Dry run (default) only reads and prints before/after. Nothing is written
 * until you pass --write.
 *
 *   npm run points:recompute
 *   npm run points:recompute -- --write
 *
 * Do not point this at a database you have not backed up. The write path
 * runs in one transaction and replaces totals; it does not add to them.
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

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width);
}

async function main() {
  const write = process.argv.includes("--write");
  loadEnvFile();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Refusing to run.");
    process.exit(1);
  }

  const { previewSeasonRecompute, recomputeAllStoredPoints } = await import("../src/lib/scoring");
  const report = await previewSeasonRecompute();

  console.log("GFL points recompute");
  console.log(
    write
      ? "Mode: WRITE — totals will be replaced from stored stats."
      : "Mode: DRY RUN — no rows will be written. Pass --write to update the database.",
  );
  console.log("");
  console.log("Managers");
  console.log(
    `${pad("Name", 24)}${pad("Username", 18)}${pad("Team", 22)}${pad("Season", 18)}${pad("Before", 10)}${pad("After", 10)}Delta`,
  );

  if (report.managers.length === 0) {
    console.log("(no fantasy teams)");
  }

  let changedManagers = 0;
  for (const manager of report.managers) {
    const delta = manager.after - manager.before;
    if (delta !== 0) changedManagers += 1;
    const deltaText = delta > 0 ? `+${delta}` : String(delta);
    console.log(
      `${pad(manager.name, 24)}${pad(manager.username, 18)}${pad(manager.teamName, 22)}${pad(manager.season, 18)}${pad(manager.before, 10)}${pad(manager.after, 10)}${deltaText}`,
    );
  }

  console.log("");
  console.log(
    `Players whose base total would change: ${report.playersChanged.length} (${report.playersUnchanged} unchanged)`,
  );
  if (report.playersChanged.length > 0) {
    console.log(`${pad("Player", 28)}${pad("Before", 10)}${pad("After", 10)}Delta`);
    for (const player of report.playersChanged) {
      const delta = player.after - player.before;
      const deltaText = delta > 0 ? `+${delta}` : String(delta);
      console.log(`${pad(player.name, 28)}${pad(player.before, 10)}${pad(player.after, 10)}${deltaText}`);
    }
  }

  console.log("");
  console.log(`${changedManagers} manager total${changedManagers === 1 ? "" : "s"} would change.`);

  if (!write) {
    console.log("No changes written.");
    return;
  }

  console.log("Writing...");
  await recomputeAllStoredPoints();
  console.log("Write committed. Run the command again without --write to confirm the delta is 0.");
}

main().catch((error) => {
  console.error(safeMessage(error));
  process.exit(1);
});
