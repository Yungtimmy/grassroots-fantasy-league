import type { RecomputeReport } from "./scoring";

export type RecomputeTeamRow = {
  teamId: string;
  teamName: string;
  name: string;
  username: string;
  season: string;
  before: number;
  after: number;
  delta: number;
};

export type RecomputeTotals = {
  before: number;
  after: number;
  delta: number;
  teams: number;
  teamsChanged: number;
};

export type RecomputeActionResult = {
  ok: boolean;
  written: boolean;
  reason: string | null;
  gameweek: RecomputeReport["targetedGameweek"];
  teams: RecomputeTeamRow[];
  totals: RecomputeTotals;
};

/**
 * Shape the same preview the CLI prints. A gameweek with no lineup snapshot
 * is refused, which is what `points:recompute --gameweek` does when
 * `--capture-live` is not passed.
 */
export function summarizeGameweekRecompute(
  report: RecomputeReport,
  gameweekId: string,
): Omit<RecomputeActionResult, "written"> {
  const skipped = report.skippedGameweeks.find((row) => row.gameweekId === gameweekId);
  const targeted = report.targetedGameweek?.id === gameweekId ? report.targetedGameweek : null;
  const teams = report.managers
    .filter((manager) => !targeted || manager.season === targeted.season)
    .map((manager) => ({
      teamId: manager.teamId,
      teamName: manager.teamName,
      name: manager.name,
      username: manager.username,
      season: manager.season,
      before: manager.before,
      after: manager.after,
      delta: manager.after - manager.before,
    }));
  const before = teams.reduce((sum, team) => sum + team.before, 0);
  const after = teams.reduce((sum, team) => sum + team.after, 0);
  return {
    ok: Boolean(targeted) && !skipped,
    reason: skipped?.reason ?? (targeted ? null : "Gameweek not found"),
    gameweek: targeted,
    teams,
    totals: {
      before,
      after,
      delta: after - before,
      teams: teams.length,
      teamsChanged: teams.filter((team) => team.delta !== 0).length,
    },
  };
}

export function recomputeActionLog(input: {
  confirm: boolean;
  written: boolean;
  ok: boolean;
  reason: string | null;
  gameweek: RecomputeReport["targetedGameweek"];
  totals: RecomputeTotals;
}): string {
  const state = input.written ? "WRITTEN" : input.ok ? "DRY RUN" : "REFUSED";
  const gameweek = input.gameweek;
  const delta = input.totals.delta > 0 ? `+${input.totals.delta}` : String(input.totals.delta);
  const why = input.reason ? ` reason=${JSON.stringify(input.reason)}` : "";
  return `[recompute-points] ${state} confirm=${input.confirm} gameweek=${gameweek ? `GW${gameweek.number} ${gameweek.name}` : "none"} id=${gameweek?.id ?? "none"} season=${gameweek?.season ?? "none"} teams=${input.totals.teams} changed=${input.totals.teamsChanged} before=${input.totals.before} after=${input.totals.after} delta=${delta} at=${new Date().toISOString()}${why}`;
}
