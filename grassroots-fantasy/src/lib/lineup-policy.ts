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
