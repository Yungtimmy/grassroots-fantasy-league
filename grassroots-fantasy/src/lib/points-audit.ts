/**
 * Read-only classification of point rows written by the pre-fix stat save.
 *
 * That save upserted FantasyPointTransaction (so the row is the last save,
 * not a stack) and incremented FantasyTeam.totalPoints. A row's ratio is
 * therefore x1, x2, or x3 for the role at the last save. Repeated saves show
 * up as team.totalPoints minus the sum of the rows.
 *
 * The base below is the pre-fix stat-save formula, not the current scorer.
 * This module does not write and does not build lineup snapshots.
 */

export type PointRatioClass = "x1" | "x2" | "x3" | "unexplained";

export type LegacyStat = {
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltySave: number;
  goalsConceded: number;
  position: string;
};

/** Base points from one match, as calculateAllPoints used to write them. */
export function legacyMatchBase(stat: LegacyStat): number {
  let points = 0;
  if (stat.minutes > 0) points += 1;

  const goalPoints: Record<string, number> = { GK: 10, DEF: 8, MID: 6, FWD: 5 };
  if (stat.goals > 0) points += (goalPoints[stat.position] ?? 0) * stat.goals;
  if (stat.assists > 0) points += 3 * stat.assists;

  if (stat.cleanSheet) {
    const cleanSheetPoints: Record<string, number> = { GK: 5, DEF: 4 };
    points += cleanSheetPoints[stat.position] ?? 0;
  }

  if (stat.position === "GK" && stat.goalsConceded > 0) {
    points += -2 * stat.goalsConceded;
  }
  if (stat.penaltySave > 0) points += 5 * stat.penaltySave;
  if (stat.yellowCards > 0) points += -1 * stat.yellowCards;
  if (stat.redCards > 0) points += -3 * stat.redCards;
  if (stat.ownGoals > 0) points += -2 * stat.ownGoals;

  return points;
}

export function classifyPointRatio(
  storedPoints: number,
  recomputedBase: number,
): { ratio: number | null; classification: PointRatioClass } {
  if (recomputedBase === 0 || !Number.isFinite(storedPoints) || !Number.isFinite(recomputedBase)) {
    return { ratio: null, classification: "unexplained" };
  }

  const ratio = storedPoints / recomputedBase;
  if (storedPoints === recomputedBase) return { ratio: 1, classification: "x1" };
  if (storedPoints === recomputedBase * 2) return { ratio: 2, classification: "x2" };
  if (storedPoints === recomputedBase * 3) return { ratio: 3, classification: "x3" };
  return { ratio, classification: "unexplained" };
}

export type AuditedRow = {
  recomputedBase: number;
  /** Sum of every match in the gameweek. The old save did not store this sum. */
  fullGameweekBase: number;
  ratio: number | null;
  classification: PointRatioClass;
  note: string | null;
};

/**
 * Compare stored points with per-match bases recomputed from stored stats.
 * The old save kept one match, so a hit on a match base is x1, x2, or x3.
 * A ratio of 2 is that multiplier, not a doubled x1. Anything else is unexplained.
 */
export function auditStoredRow(input: {
  storedPoints: number;
  matchBases: number[];
}): AuditedRow {
  const fullGameweekBase = input.matchBases.reduce((sum, base) => sum + base, 0);
  const hits = [...new Set(input.matchBases)]
    .map((base) => ({ base, ...classifyPointRatio(input.storedPoints, base) }))
    .filter((hit) => hit.classification !== "unexplained");
  const classes = new Set(hits.map((hit) => hit.classification));

  if (hits.length > 0 && classes.size === 1) {
    const hit = hits[0]!;
    return {
      recomputedBase: hit.base,
      fullGameweekBase,
      ratio: hit.ratio,
      classification: hit.classification,
      note: input.matchBases.length > 1
        ? "Matches one match, not the sum of the gameweek. The old save overwrote the row with the last match."
        : null,
    };
  }

  if (classes.size > 1) {
    return {
      recomputedBase: fullGameweekBase,
      fullGameweekBase,
      ratio: fullGameweekBase === 0 ? null : input.storedPoints / fullGameweekBase,
      classification: "unexplained",
      note: "More than one match fits a different multiplier, so the last save cannot be told apart.",
    };
  }

  const summed = classifyPointRatio(input.storedPoints, fullGameweekBase);
  return {
    recomputedBase: fullGameweekBase,
    fullGameweekBase,
    ratio: summed.ratio,
    classification: "unexplained",
    note: "Stored points are not 1x, 2x, or 3x a match base recomputed from stored stats.",
  };
}

export type TeamAuditRow = {
  id: string;
  teamId: string | null;
  storedPoints: number;
  classification: PointRatioClass;
  /** True when the row belongs to a finished gameweek with no lineup snapshot. */
  audited: boolean;
};

export type TeamAuditSummary = {
  storedTotal: number;
  sumOfRows: number;
  inflationGap: number;
  bestSupportedCorrected: number;
  unresolvedRowIds: string[];
};

/**
 * Stacking lives in the team total. Best-supported is the sum of rows, minus
 * audited rows whose ratio is not x1, x2, or x3.
 */
export function summarizeTeamAudit(input: {
  teamId: string;
  storedTotal: number;
  rows: TeamAuditRow[];
}): TeamAuditSummary {
  const mine = input.rows.filter((row) => row.teamId === input.teamId);
  const sumOfRows = mine.reduce((sum, row) => sum + row.storedPoints, 0);
  const unresolved = mine.filter((row) => row.audited && row.classification === "unexplained");
  const unresolvedPoints = unresolved.reduce((sum, row) => sum + row.storedPoints, 0);

  return {
    storedTotal: input.storedTotal,
    sumOfRows,
    inflationGap: input.storedTotal - sumOfRows,
    bestSupportedCorrected: sumOfRows - unresolvedPoints,
    unresolvedRowIds: unresolved.map((row) => row.id),
  };
}

/** Attach a legacy row to a team only when it already has one, or the manager has one team. */
export function assignTeamId(
  row: { teamId: string | null; userId: string },
  teams: Array<{ teamId: string; userId: string }>,
): string | null {
  if (row.teamId) return row.teamId;
  const matches = teams.filter((team) => team.userId === row.userId);
  if (matches.length === 1) return matches[0]!.teamId;
  return null;
}
