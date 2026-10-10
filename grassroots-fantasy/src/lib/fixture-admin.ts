/**
 * Admin fixture postpone / move helpers. No database access: the route
 * applies the plan inside one transaction and calls recomputeGameweekPoints.
 */

export const POSTPONED_STATUS = "postponed";

/** Same window autoUpdateMatchStatuses uses before a live match becomes finished. */
export const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

export class FixtureAdminError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FixtureAdminError";
    this.status = status;
  }
}

/**
 * Postponed fixtures stay postponed after the original kickoff.
 * Only `upcoming` can become `live`, and only `live` can become `finished`.
 */
export function nextAutomaticMatchStatus(status: string, kickoff: Date, now: Date): string {
  if (status === POSTPONED_STATUS) return POSTPONED_STATUS;
  if (status === "upcoming" && kickoff.getTime() <= now.getTime()) return "live";
  if (status === "live" && now.getTime() - kickoff.getTime() >= MATCH_DURATION_MS) return "finished";
  return status;
}

export type MatchUpdateBody = {
  homeScore?: unknown;
  awayScore?: unknown;
  gameweekId?: unknown;
  homeTeamId?: unknown;
  awayTeamId?: unknown;
  venue?: unknown;
  time?: unknown;
  date?: unknown;
  status?: unknown;
};

export function buildMatchUpdate(body: MatchUpdateBody): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (body.homeScore !== undefined) updateData.homeScore = body.homeScore;
  if (body.awayScore !== undefined) updateData.awayScore = body.awayScore;
  if (typeof body.gameweekId === "string" && body.gameweekId) updateData.gameweekId = body.gameweekId;
  if (typeof body.homeTeamId === "string" && body.homeTeamId) updateData.homeTeamId = body.homeTeamId;
  if (typeof body.awayTeamId === "string" && body.awayTeamId) updateData.awayTeamId = body.awayTeamId;
  if (body.venue !== undefined) updateData.venue = body.venue || null;
  if (body.time !== undefined) updateData.time = body.time || null;
  if (typeof body.date === "string" && body.date) {
    const time = typeof body.time === "string" ? body.time : "";
    const parsed = time ? new Date(`${body.date}T${time}`) : new Date(body.date);
    if (Number.isNaN(parsed.getTime())) {
      throw new FixtureAdminError("Fixture date is not valid", 400);
    }
    updateData.date = parsed;
  }
  if (typeof body.status === "string" && body.status) {
    updateData.status = body.status;
  } else if (body.homeScore !== undefined && body.awayScore !== undefined) {
    updateData.status = "finished";
  }
  return updateData;
}

/**
 * When a fixture that already has stats is postponed, moved, or given a new
 * kickoff, both gameweeks have to be rebuilt. A score-only edit does not.
 * The same gameweek is listed once.
 */
export function recomputePlanForFixtureEdit(input: {
  statCount: number;
  previousGameweekId: string;
  nextGameweekId: string;
  body: MatchUpdateBody;
}): string[] {
  const moved = input.nextGameweekId !== input.previousGameweekId;
  const postponed = input.body.status === POSTPONED_STATUS;
  const rescheduled = input.body.date !== undefined || input.body.time !== undefined;
  if (input.statCount <= 0 || (!moved && !postponed && !rescheduled)) return [];
  const ids = [input.previousGameweekId];
  if (moved) ids.push(input.nextGameweekId);
  return ids;
}

/** Deleting a fixture that has stats must rebuild that gameweek. */
export function recomputePlanForFixtureDelete(statCount: number, gameweekId: string): string[] {
  return statCount > 0 ? [gameweekId] : [];
}

export type FinishWarningFixture = {
  status: string;
  statCount: number;
  label: string;
};

/** Fixtures that should be listed before an admin marks a gameweek finished. */
export function fixturesNeedingFinishWarning<T extends { status: string; statCount: number }>(
  fixtures: readonly T[],
): T[] {
  const missing: T[] = [];
  for (const fixture of fixtures) {
    if (fixture.status !== POSTPONED_STATUS && fixture.statCount <= 0) missing.push(fixture);
  }
  return missing;
}

export function finishWarningMessage(
  gameweekName: string,
  fixtures: readonly { label: string; status: string }[],
): string | null {
  if (fixtures.length === 0) return null;
  const lines = fixtures.map((fixture) => `- ${fixture.label} (${fixture.status})`).join("\n");
  return `${gameweekName} has fixtures with no stats that are not postponed:\n${lines}\n\nFinish this gameweek anyway?`;
}
