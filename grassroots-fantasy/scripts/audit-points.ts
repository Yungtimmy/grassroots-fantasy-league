/**
 * Read-only audit of finished gameweeks that have no lineup snapshot.
 *
 * Writes nothing. Does not build snapshots and does not change scores.
 * Point rows are classified from the pre-fix stat save: the row was
 * overwritten, and only FantasyTeam.totalPoints was incremented.
 *
 *   npm run points:audit
 *
 * Do not point this at a database you have not backed up. This command
 * still only reads. It needs the lineup_frozen_at column from the snapshot
 * migration so it can see which finished gameweeks have no snapshot.
 * It does not apply that migration.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assignTeamId,
  auditStoredRow,
  legacyMatchBase,
  summarizeTeamAudit,
  type PointRatioClass,
  type TeamAuditRow,
} from "../src/lib/points-audit";

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

function formatRatio(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "n/a";
  if (Number.isInteger(ratio)) return String(ratio);
  return ratio.toFixed(2);
}

type PrintedRow = {
  id: string;
  gameweekNumber: number;
  season: string;
  playerName: string;
  teamLabel: string;
  storedPoints: number;
  recomputedBase: number;
  fullGameweekBase: number;
  ratio: number | null;
  classification: PointRatioClass;
  note: string | null;
};

async function main() {
  if (process.argv.includes("--write")) {
    console.error("points:audit never writes. Remove --write.");
    process.exit(1);
  }

  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Refusing to run.");
    process.exit(1);
  }

  const { prisma } = await import("../src/lib/db");

  const finished = await prisma.gameweek.findMany({
    where: { status: "finished" },
    orderBy: [{ season: { name: "asc" } }, { number: "asc" }],
    select: {
      id: true,
      number: true,
      name: true,
      lineupFrozenAt: true,
      seasonId: true,
      season: { select: { name: true } },
      matches: {
        select: {
          id: true,
          playerStats: {
            select: {
              playerId: true,
              minutes: true,
              goals: true,
              assists: true,
              cleanSheet: true,
              yellowCards: true,
              redCards: true,
              ownGoals: true,
              penaltySave: true,
              goalsConceded: true,
              player: { select: { name: true, position: true } },
            },
          },
        },
      },
      pointTransactions: {
        select: {
          id: true,
          userId: true,
          teamId: true,
          playerId: true,
          basePoints: true,
          multiplier: true,
          totalPoints: true,
          player: { select: { name: true } },
          user: { select: { name: true, username: true } },
        },
      },
    },
  });

  const audited = finished.filter((gameweek) => gameweek.lineupFrozenAt == null);
  const snapshotted = finished.filter((gameweek) => gameweek.lineupFrozenAt != null);
  const seasonIds = [...new Set(audited.map((gameweek) => gameweek.seasonId))];

  const teams = seasonIds.length === 0
    ? []
    : await prisma.fantasyTeam.findMany({
        where: { league: { seasonId: { in: seasonIds } } },
        select: {
          id: true,
          name: true,
          totalPoints: true,
          userId: true,
          user: { select: { name: true, username: true } },
          league: { select: { seasonId: true, season: { select: { name: true } } } },
        },
      });

  const seasonTransactions = seasonIds.length === 0
    ? []
    : await prisma.fantasyPointTransaction.findMany({
        where: { gameweek: { seasonId: { in: seasonIds } } },
        select: {
          id: true,
          userId: true,
          teamId: true,
          playerId: true,
          gameweekId: true,
          totalPoints: true,
          gameweek: { select: { seasonId: true } },
        },
      });

  console.log("GFL points audit");
  console.log("Mode: READ ONLY — no rows will be written. Snapshots are not built. Scores are not changed.");
  console.log("");
  console.log("How to read this");
  console.log("- Each point row was overwritten on stat save. The ratio is the multiplier from that last save: x1, x2, or x3.");
  console.log("- A ratio of 2 is that last-save multiplier. It is not a regular score that was saved twice.");
  console.log("- The role and the owner are whoever held the player at the last save, not the lineup at the deadline.");
  console.log("- Repeated saves stacked onto the team total only. Inflation gap = stored team total − sum of its rows.");
  console.log("- These old rows omit substitutes and starters on 0. The current scorer includes substitutes at 1x (BENCH_MULTIPLIER). This report is not a lineup.");
  console.log("- Base points are recomputed per match with the pre-fix stat-save formula (appearance +1, clean sheet even at 0 minutes, penalty miss not scored). The old save stored one match, not the sum of the gameweek.");
  console.log("- Rows whose ratio is not 1, 2, or 3 are unexplained and are left out of the best-supported total.");
  console.log("");
  console.log(`Finished gameweeks with no snapshot: ${audited.length}`);
  console.log(`Finished gameweeks that already have a snapshot (skipped): ${snapshotted.length}`);

  if (audited.length === 0) {
    console.log("Nothing to audit.");
    return;
  }

  const printed: PrintedRow[] = [];
  const auditedClasses = new Map<string, { classification: PointRatioClass; storedPoints: number }>();

  for (const gameweek of audited) {
    console.log("");
    console.log(`GW${gameweek.number} ${gameweek.season.name} (${gameweek.id})`);
    if (gameweek.pointTransactions.length === 0) {
      console.log("  (no point rows)");
      continue;
    }

    const seasonTeams = teams
      .filter((team) => team.league.seasonId === gameweek.seasonId)
      .map((team) => ({ teamId: team.id, userId: team.userId }));
    const basesByPlayer = new Map<string, number[]>();
    for (const match of gameweek.matches) {
      for (const stat of match.playerStats) {
        const list = basesByPlayer.get(stat.playerId) ?? [];
        list.push(legacyMatchBase({ ...stat, position: stat.player.position }));
        basesByPlayer.set(stat.playerId, list);
      }
    }

    console.log(
      `  ${pad("Player", 22)}${pad("Team", 22)}${pad("Stored", 8)}${pad("Base", 8)}${pad("GW base", 9)}${pad("Ratio", 8)}Class`,
    );

    for (const txn of gameweek.pointTransactions) {
      const teamId = assignTeamId(txn, seasonTeams);
      const team = teams.find((item) => item.id === teamId);
      const result = auditStoredRow({
        storedPoints: txn.totalPoints,
        matchBases: basesByPlayer.get(txn.playerId) ?? [],
      });
      auditedClasses.set(txn.id, { classification: result.classification, storedPoints: txn.totalPoints });
      const teamLabel = team ? team.name : teamId ? teamId : "(unattributed)";
      printed.push({
        id: txn.id,
        gameweekNumber: gameweek.number,
        season: gameweek.season.name,
        playerName: txn.player.name,
        teamLabel,
        storedPoints: txn.totalPoints,
        recomputedBase: result.recomputedBase,
        fullGameweekBase: result.fullGameweekBase,
        ratio: result.ratio,
        classification: result.classification,
        note: result.note,
      });
      console.log(
        `  ${pad(txn.player.name, 22)}${pad(teamLabel, 22)}${pad(txn.totalPoints, 8)}${pad(result.recomputedBase, 8)}${pad(result.fullGameweekBase, 9)}${pad(formatRatio(result.ratio), 8)}${result.classification}`,
      );
      if (result.note) console.log(`    ${result.note} Stored row base ${txn.basePoints}, stored multiplier ${txn.multiplier}.`);
    }
  }

  const summaryRows: TeamAuditRow[] = [];
  for (const txn of seasonTransactions) {
    const seasonTeams = teams
      .filter((team) => team.league.seasonId === txn.gameweek.seasonId)
      .map((team) => ({ teamId: team.id, userId: team.userId }));
    const auditedRow = auditedClasses.get(txn.id);
    summaryRows.push({
      id: txn.id,
      teamId: assignTeamId(txn, seasonTeams),
      storedPoints: txn.totalPoints,
      classification: auditedRow?.classification ?? "x1",
      audited: auditedRow !== undefined,
    });
  }

  console.log("");
  console.log("Teams");
  console.log(
    `${pad("Manager", 22)}${pad("Team", 22)}${pad("Season", 16)}${pad("Stored", 10)}${pad("Sum of rows", 14)}${pad("Inflation", 12)}Best-supported`,
  );

  const relevantTeams = teams.filter((team) =>
    audited.some((gameweek) => gameweek.seasonId === team.league.seasonId),
  );
  for (const team of relevantTeams) {
    const summary = summarizeTeamAudit({
      teamId: team.id,
      storedTotal: team.totalPoints,
      rows: summaryRows,
    });
    console.log(
      `${pad(team.user.name, 22)}${pad(team.name, 22)}${pad(team.league.season.name, 16)}${pad(summary.storedTotal, 10)}${pad(summary.sumOfRows, 14)}${pad(summary.inflationGap, 12)}${summary.bestSupportedCorrected}`,
    );
  }

  const unresolved = printed.filter((row) => row.classification === "unexplained");
  const unattributed = printed.filter((row) => row.teamLabel === "(unattributed)");

  console.log("");
  console.log(`Unresolved rows: ${unresolved.length}`);
  for (const row of unresolved) {
    console.log(
      `  GW${row.gameweekNumber} ${row.season} ${row.playerName} ${row.teamLabel}: stored ${row.storedPoints}, recomputed base ${row.recomputedBase}, ratio ${formatRatio(row.ratio)}. ${row.note ?? ""}`,
    );
  }
  if (unattributed.length > 0) {
    console.log("");
    console.log(`Unattributed rows (manager has more than one team, and the row has no team): ${unattributed.length}`);
    console.log("These are not added to either team's sum.");
    for (const row of unattributed) {
      console.log(`  GW${row.gameweekNumber} ${row.season} ${row.playerName}: stored ${row.storedPoints}, class ${row.classification}`);
    }
  }

  console.log("");
  console.log("No changes written.");
}

main()
  .catch((error) => {
    console.error(safeMessage(error));
    process.exit(1);
  })
  .finally(async () => {
    if (!process.env.DATABASE_URL) return;
    const { prisma } = await import("../src/lib/db");
    await prisma.$disconnect();
  });
