/**
 * Rebuild gameweek points, manager Overall, and admin player totals from
 * the stored match stats and per-gameweek lineup snapshots.
 *
 * A gameweek with no snapshot is skipped. Current squads are not used for it.
 * Pass --capture-live to copy the current squad onto the one live gameweek
 * (the earliest upcoming or active gameweek) before scoring that gameweek.
 * Finished gameweeks that were never snapshotted stay skipped.
 *
 * Substitutes are included at BENCH_MULTIPLIER (1x). Captain and vice still
 * come from that gameweek's lineup snapshot.
 *
 * Dry run (default) only reads and prints before/after. Nothing is written
 * until you pass --write. Every snapshotted gameweek is rebuilt, including
 * the active one. There is no flag that limits the write to one gameweek.
 *
 * Pass --gameweek with a gameweek name or id to rebuild that gameweek only.
 * The name must match exactly. If two gameweeks share a name, pass the id.
 * Other gameweeks keep their stored points. --capture-live still applies
 * only when the chosen gameweek is the live one and has no snapshot yet.
 *
 *   npm run points:recompute
 *   npm run points:recompute -- --gameweek "Week 2"
 *   npm run points:recompute -- --gameweek <id> --write
 *   npm run points:recompute -- --capture-live
 *   npm run points:recompute -- --write
 *   npm run points:recompute -- --capture-live --write
 *
 * Do not point this at a database you have not backed up. The write path
 * runs in one transaction and replaces totals for the snapshotted gameweeks
 * in this run only. It does not add to them.
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
  const { parseRecomputeArgs } = await import("../src/lib/recompute-cli");
  const parsed = parseRecomputeArgs(process.argv);
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exit(1);
  }
  const { write, captureLive } = parsed;
  loadEnvFile();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Refusing to run.");
    process.exit(1);
  }

  const { previewSeasonRecompute, recomputeAllStoredPoints } = await import("../src/lib/scoring");
  const report = await previewSeasonRecompute({
    captureLive,
    gameweek: parsed.gameweek,
  });

  console.log("GFL points recompute");
  console.log(
    write
      ? report.targetedGameweek
        ? "Mode: WRITE — the selected gameweek will be replaced from stored stats."
        : "Mode: WRITE — snapshotted gameweeks will be replaced from stored stats."
      : "Mode: DRY RUN — no rows will be written. Pass --write to update the database.",
  );
  if (report.targetedGameweek) {
    const target = report.targetedGameweek;
    console.log(
      `Gameweek: GW${target.number} ${target.name} (${target.season}, ${target.id}). Other gameweeks are left unchanged.`,
    );
  }
  if (captureLive) {
    console.log(
      report.captureLiveId
        ? `Capture live: gameweek ${report.captureLiveId} would be snapshotted from the current squad.`
        : "Capture live: no open gameweek is waiting for a snapshot.",
    );
  }
  console.log("");

  if (report.skippedGameweeks.length === 0) {
    console.log("Skipped gameweeks: none.");
  } else {
    console.log("Skipped gameweeks (current squads were NOT used):");
    for (const gameweek of report.skippedGameweeks) {
      console.log(`  GW${gameweek.number} ${gameweek.season} (${gameweek.gameweekId}): ${gameweek.reason}`);
    }
  }
  if (report.unattributedRows > 0) {
    console.log(
      `Warning: ${report.unattributedRows} point row${report.unattributedRows === 1 ? "" : "s"} (${report.unattributedPoints} pts) have no team and belong to a manager with more than one team. They are not added to either total.`,
    );
  }
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

  if (report.skippedGameweeks.length > 0) {
    console.log("Skipped gameweeks will not be modified.");
  }
  console.log("Writing...");
  await recomputeAllStoredPoints({ captureLive, gameweek: parsed.gameweek });
  console.log("Write committed. Run the command again without --write to confirm the delta is 0.");
}

main().catch((error) => {
  console.error(safeMessage(error));
  process.exit(1);
});
