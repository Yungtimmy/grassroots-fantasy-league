/**
 * Which gameweek the current fantasy squad still belongs to.
 *
 * Squad edits are blocked while the earliest upcoming or active gameweek is
 * active or past its deadline. Once that gameweek is finished, the next one
 * becomes editable and FantasyTeamPlayer is no longer the previous lineup.
 * Only that earliest open gameweek can be snapshotted from the current squad.
 */

export type GameweekLockState = {
  id: string;
  number: number;
  status: string;
  lineupFrozenAt?: Date | string | null;
};

export function liveLineupGameweekId(
  gameweeks: Array<Pick<GameweekLockState, "id" | "number" | "status">>,
): string | null {
  const live = gameweeks
    .filter((gameweek) => gameweek.status === "upcoming" || gameweek.status === "active")
    .sort((a, b) => a.number - b.number);
  return live[0]?.id ?? null;
}

export function canSnapshotCurrentSquads(
  gameweekId: string,
  gameweeks: Array<Pick<GameweekLockState, "id" | "number" | "status">>,
): boolean {
  return liveLineupGameweekId(gameweeks) === gameweekId;
}

export type SkippedGameweek = {
  id: string;
  number: number;
  isLive: boolean;
  reason: string;
};

export type RecomputePlan = {
  /** Gameweeks that already have a snapshot, plus the live one when capture is requested. */
  recomputeIds: string[];
  skipped: SkippedGameweek[];
  /** Live gameweek whose current squad would be copied. Null when nothing is captured. */
  captureLiveId: string | null;
};

const SKIPPED_HISTORICAL =
  "No lineup snapshot. Current squads belong to a later gameweek, so this gameweek is skipped.";
const SKIPPED_LIVE =
  "No lineup snapshot. Current squads still belong to this gameweek, but they are not used unless you pass --capture-live.";

/**
 * Decision used by scripts/recompute-points.ts. A gameweek without a snapshot
 * is never scored from the current squad. Pass captureLive to include the
 * one live gameweek; every other missing snapshot is still skipped.
 */
export function planSeasonRecompute(
  gameweeks: GameweekLockState[],
  options: { captureLive?: boolean } = {},
): RecomputePlan {
  const liveId = liveLineupGameweekId(gameweeks);
  const recomputeIds: string[] = [];
  const skipped: SkippedGameweek[] = [];
  let captureLiveId: string | null = null;

  for (const gameweek of [...gameweeks].sort((a, b) => a.number - b.number)) {
    const isLive = gameweek.id === liveId;
    if (gameweek.lineupFrozenAt != null) {
      recomputeIds.push(gameweek.id);
      continue;
    }
    if (options.captureLive && isLive) {
      captureLiveId = gameweek.id;
      recomputeIds.push(gameweek.id);
      continue;
    }
    skipped.push({
      id: gameweek.id,
      number: gameweek.number,
      isLive,
      reason: isLive ? SKIPPED_LIVE : SKIPPED_HISTORICAL,
    });
  }

  return { recomputeIds, skipped, captureLiveId };
}

/**
 * One-time freeze of today's squads onto a named gameweek that is already
 * finished. The ordinary capture path still refuses that. This one proceeds
 * only when the checks below pass.
 *
 * What the code can verify:
 * - this gameweek has no snapshot yet
 * - this gameweek's own deadline has passed (the squad lock uses that)
 * - no later gameweek is active, finished, or past its deadline
 * - every current squad row was saved at or before this gameweek's deadline
 *   (a squad save replaces FantasyTeamPlayer, so createdAt is the latest save)
 *
 * What it cannot verify is FREEZE_CANNOT_VERIFY.
 */
export const FREEZE_CANNOT_VERIFY = [
  "There is no squad-edit log. FantasyTeamPlayer.createdAt is only the latest save, because a save deletes and recreates those rows.",
  "Direct database edits are not visible.",
  "Nothing here proves the squad lock was the code running in production for the whole time since the deadline.",
  "Marking this gameweek finished turns the squad lock off when no later gameweek is active or past its own deadline. The app does not record that the lock stayed on. No squad save after the deadline is the check.",
] as const;

export type NamedFreezeGameweek = {
  id: string;
  seasonId: string;
  seasonName: string;
  number: number;
  name: string;
  status: string;
  deadline: Date | string;
  lineupFrozenAt: Date | string | null;
  lineupCount: number;
};

export type SquadSaveStamp = {
  seasonId: string;
  teamId: string;
  teamName: string;
  /** Latest FantasyTeamPlayer.createdAt. Null when the team has no players. */
  squadSavedAt: Date | string | null;
  /** FantasyTeam.updatedAt. A rename updates this without changing the squad rows. */
  teamUpdatedAt: Date | string;
};

export type FreezeAssessment = {
  ok: boolean;
  reasons: string[];
  unverified: readonly string[];
  gameweekId: string | null;
};

function instant(value: Date | string): number {
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return parsed;
}

function stamp(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export function assessNamedGameweekFreeze(input: {
  gameweekName?: string;
  seasonName?: string;
  targetId?: string;
  gameweeks: NamedFreezeGameweek[];
  squads: SquadSaveStamp[];
  now: Date;
}): FreezeAssessment {
  const unverified = FREEZE_CANNOT_VERIFY;
  const reasons: string[] = [];
  const name = input.gameweekName?.trim();
  const seasonName = input.seasonName?.trim();

  let pool = input.gameweeks;
  if (seasonName) {
    pool = pool.filter((gameweek) => gameweek.seasonName === seasonName);
    if (pool.length === 0) {
      reasons.push(`No gameweeks found in season "${seasonName}".`);
    }
  }

  let matches: NamedFreezeGameweek[] = [];
  if (input.targetId) {
    matches = pool.filter((gameweek) => gameweek.id === input.targetId);
    if (matches.length === 0) reasons.push("Gameweek not found.");
  } else if (!name) {
    reasons.push("A gameweek name is required.");
  } else {
    matches = pool.filter((gameweek) => gameweek.name === name);
    if (matches.length === 0) reasons.push(`No gameweek named "${name}".`);
    if (matches.length > 1) {
      reasons.push(`More than one gameweek is named "${name}". Pass the season name as well.`);
    }
  }

  if (reasons.length > 0 || matches.length !== 1) {
    return { ok: false, reasons, unverified, gameweekId: matches.length === 1 ? matches[0]!.id : null };
  }

  const target = matches[0]!;
  const deadlineMs = instant(target.deadline);
  if (Number.isNaN(deadlineMs)) {
    reasons.push("This gameweek's deadline is not a valid time.");
  }
  if (target.lineupFrozenAt != null || target.lineupCount > 0) {
    reasons.push("A lineup snapshot already exists for this gameweek.");
  }
  if (!Number.isNaN(deadlineMs) && deadlineMs >= input.now.getTime()) {
    reasons.push("This gameweek's deadline has not passed, so squad editing has not been locked by it.");
  }

  const later = input.gameweeks.filter(
    (gameweek) => gameweek.seasonId === target.seasonId && gameweek.number > target.number,
  );
  for (const gameweek of later.sort((a, b) => a.number - b.number)) {
    const laterDeadline = instant(gameweek.deadline);
    if (gameweek.status !== "upcoming") {
      reasons.push(`GW${gameweek.number} ${gameweek.name} has opened (status ${gameweek.status}).`);
      continue;
    }
    if (!Number.isNaN(laterDeadline) && laterDeadline <= input.now.getTime()) {
      reasons.push(`GW${gameweek.number} ${gameweek.name} deadline has passed.`);
    }
  }

  if (!Number.isNaN(deadlineMs)) {
    const seasonSquads = input.squads.filter((squad) => squad.seasonId === target.seasonId);
    for (const squad of seasonSquads) {
      if (squad.squadSavedAt != null) {
        const savedMs = instant(squad.squadSavedAt);
        if (Number.isNaN(savedMs) || savedMs > deadlineMs) {
          reasons.push(
            `Team "${squad.teamName}" was saved at ${squad.squadSavedAt == null ? "an unknown time" : stamp(squad.squadSavedAt)}, which is after the deadline ${stamp(target.deadline)}.`,
          );
        }
        continue;
      }
      const updatedMs = instant(squad.teamUpdatedAt);
      if (Number.isNaN(updatedMs) || updatedMs > deadlineMs) {
        reasons.push(
          `Team "${squad.teamName}" has no players and was updated at ${stamp(squad.teamUpdatedAt)}, after the deadline ${stamp(target.deadline)}. A wiped squad cannot be told apart from a rename.`,
        );
      }
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    unverified,
    gameweekId: target.id,
  };
}
