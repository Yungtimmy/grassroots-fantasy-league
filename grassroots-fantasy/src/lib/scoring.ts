import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { canSnapshotCurrentSquads, liveLineupGameweekId, planSeasonRecompute } from "./lineup-policy";
import {
  DEFAULT_SCORING_RULES,
  attributePoints,
  rebuildWithSnapshots,
  rulesFromRows,
  scoreGameweek,
  scoreMatchStat,
  type MatchStatInput,
  type PointTxn,
  type ScoringRuleRow,
  type ScoringRules,
  type SquadSlot,
} from "./scoring-engine";

export type ScoringDb = PrismaClient | Prisma.TransactionClient;

export class ScoringError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ScoringError";
    this.status = status;
  }
}

type StatRow = {
  playerId: string;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  saves: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltyMiss: number;
  penaltySave: number;
  goalsConceded: number;
  player: { position: string };
};

function toStatInput(matchId: string, row: StatRow): MatchStatInput {
  return {
    matchId,
    playerId: row.playerId,
    position: row.player.position,
    minutes: row.minutes,
    goals: row.goals,
    assists: row.assists,
    cleanSheet: row.cleanSheet,
    saves: row.saves,
    yellowCards: row.yellowCards,
    redCards: row.redCards,
    ownGoals: row.ownGoals,
    penaltyMiss: row.penaltyMiss,
    penaltySave: row.penaltySave,
    goalsConceded: row.goalsConceded,
  };
}

export async function loadScoringRules(db: ScoringDb = prisma): Promise<ScoringRules> {
  const rows = await db.scoringRule.findMany({
    select: { event: true, position: true, points: true },
  });
  return rulesFromRows(rows as ScoringRuleRow[], DEFAULT_SCORING_RULES);
}

const NO_SAVED_LINEUP =
  "Gameweek has no saved lineup. It locked before lineups were recorded, and current squads belong to a later gameweek, so this save was not applied.";

type LineupRow = {
  playerId: string;
  isStarting: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  team: { id: string; userId: string };
};

function squadFromLineups(rows: LineupRow[]): SquadSlot[] {
  return rows.map((row) => ({
    userId: row.team.userId,
    teamId: row.team.id,
    playerId: row.playerId,
    isStarting: row.isStarting,
    isCaptain: row.isCaptain,
    isViceCaptain: row.isViceCaptain,
  }));
}

const statSelect = {
  playerId: true,
  minutes: true,
  goals: true,
  assists: true,
  cleanSheet: true,
  saves: true,
  yellowCards: true,
  redCards: true,
  ownGoals: true,
  penaltyMiss: true,
  penaltySave: true,
  goalsConceded: true,
  player: { select: { position: true } },
} as const;

async function writeCurrentSquads(db: ScoringDb, gameweekId: string, seasonId: string) {
  const rows = await db.fantasyTeamPlayer.findMany({
    where: { team: { league: { seasonId } } },
    select: {
      teamId: true,
      playerId: true,
      isCaptain: true,
      isViceCaptain: true,
      isStarting: true,
      position: true,
    },
  });

  await db.gameweekLineup.deleteMany({ where: { gameweekId } });
  if (rows.length > 0) {
    await db.gameweekLineup.createMany({
      data: rows.map((row) => ({
        gameweekId,
        teamId: row.teamId,
        playerId: row.playerId,
        isCaptain: row.isCaptain,
        isViceCaptain: row.isViceCaptain,
        isStarting: row.isStarting,
        position: row.position,
      })),
    });
  }
  await db.gameweek.update({
    where: { id: gameweekId },
    data: { lineupFrozenAt: new Date() },
  });
}

/** Copy current squads onto this gameweek only while it is still the live one. */
export async function captureLineupIfLive(gameweekId: string, db: ScoringDb): Promise<boolean> {
  const gameweek = await db.gameweek.findUnique({
    where: { id: gameweekId },
    select: { id: true, seasonId: true, lineupFrozenAt: true },
  });
  if (!gameweek || gameweek.lineupFrozenAt) return false;

  const seasonGameweeks = await db.gameweek.findMany({
    where: { seasonId: gameweek.seasonId },
    select: { id: true, number: true, status: true },
  });
  if (!canSnapshotCurrentSquads(gameweekId, seasonGameweeks)) return false;

  await writeCurrentSquads(db, gameweekId, gameweek.seasonId);
  return true;
}

/**
 * While the live gameweek is already frozen and squad edits are still
 * allowed, keep that team's snapshot in step with the save.
 */
export async function updateLiveSnapshotForTeam(
  db: ScoringDb,
  seasonId: string,
  teamId: string,
  slots: Array<{
    playerId: string;
    position: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
    isStarting: boolean;
  }>,
): Promise<void> {
  const gameweeks = await db.gameweek.findMany({
    where: { seasonId },
    select: { id: true, number: true, status: true, lineupFrozenAt: true },
  });
  const liveId = liveLineupGameweekId(gameweeks);
  const live = gameweeks.find((gameweek) => gameweek.id === liveId);
  if (!live?.lineupFrozenAt) return;

  await db.gameweekLineup.deleteMany({ where: { gameweekId: live.id, teamId } });
  if (slots.length === 0) return;
  await db.gameweekLineup.createMany({
    data: slots.map((slot) => ({
      gameweekId: live.id,
      teamId,
      playerId: slot.playerId,
      isCaptain: slot.isCaptain,
      isViceCaptain: slot.isViceCaptain,
      isStarting: slot.isStarting,
      position: slot.position,
    })),
  });
}

/**
 * Replace one gameweek's fantasy points from its saved lineup and the stored
 * match stats. Safe to run any number of times: team totals and player totals
 * are set from the stats, not incremented.
 *
 * `allowCapture` (default true) freezes the live gameweek from the current
 * squad when it has no snapshot yet. A gameweek that is no longer live and
 * has no snapshot is refused. Pass `allowCapture: false` to skip it instead,
 * which is what the recompute script does.
 */
export async function recomputeGameweekPoints(
  gameweekId: string,
  db: ScoringDb,
  options: { allowCapture?: boolean } = {},
): Promise<{ awardCount: number; skipped: boolean }> {
  const allowCapture = options.allowCapture ?? true;
  const gameweek = await db.gameweek.findUnique({
    where: { id: gameweekId },
    select: { id: true, seasonId: true, lineupFrozenAt: true },
  });
  if (!gameweek) {
    throw new ScoringError("Gameweek not found", 404);
  }

  if (!gameweek.lineupFrozenAt) {
    if (!allowCapture) return { awardCount: 0, skipped: true };
    const captured = await captureLineupIfLive(gameweekId, db);
    if (!captured) throw new ScoringError(NO_SAVED_LINEUP, 409);
  }

  const [rules, matches, lineupRows, previous] = await Promise.all([
    loadScoringRules(db),
    db.match.findMany({
      where: { gameweekId },
      select: { id: true, playerStats: { select: statSelect } },
    }),
    db.gameweekLineup.findMany({
      where: { gameweekId },
      select: {
        playerId: true,
        isStarting: true,
        isCaptain: true,
        isViceCaptain: true,
        team: { select: { id: true, userId: true } },
      },
    }),
    db.fantasyPointTransaction.findMany({
      where: { gameweekId },
      select: { userId: true, teamId: true, playerId: true },
    }),
  ]);

  const stats = matches.flatMap((match) => match.playerStats.map((row) => toStatInput(match.id, row)));
  const scored = scoreGameweek({
    gameweekId,
    stats,
    squad: squadFromLineups(lineupRows),
    rules,
  });

  await db.fantasyPointTransaction.deleteMany({ where: { gameweekId } });
  if (scored.awards.length > 0) {
    await db.fantasyPointTransaction.createMany({
      data: scored.awards.map((award) => ({
        userId: award.userId,
        teamId: award.teamId,
        playerId: award.playerId,
        gameweekId: award.gameweekId,
        eventType: award.eventType || "SCORE",
        basePoints: award.basePoints,
        multiplier: award.multiplier,
        totalPoints: award.totalPoints,
      })),
    });
  }

  const teamIds = new Set<string>(scored.awards.map((award) => award.teamId));
  for (const txn of previous) {
    if (txn.teamId) teamIds.add(txn.teamId);
  }
  const nullUserIds = [...new Set(previous.filter((txn) => !txn.teamId).map((txn) => txn.userId))];
  if (nullUserIds.length > 0) {
    const candidates = await db.fantasyTeam.findMany({
      where: { userId: { in: nullUserIds }, league: { seasonId: gameweek.seasonId } },
      select: { id: true, userId: true },
    });
    const byUser = new Map<string, string[]>();
    for (const team of candidates) {
      const list = byUser.get(team.userId) ?? [];
      list.push(team.id);
      byUser.set(team.userId, list);
    }
    for (const ids of byUser.values()) {
      if (ids.length === 1) teamIds.add(ids[0]!);
    }
  }
  await syncTeamTotals(db, gameweek.seasonId, [...teamIds]);

  const affectedPlayerIds = [...new Set([
    ...previous.map((txn) => txn.playerId),
    ...stats.map((row) => row.playerId),
  ])];
  await syncPlayerTotals(db, rules, affectedPlayerIds);

  return { awardCount: scored.awards.length, skipped: false };
}

async function syncTeamTotals(db: ScoringDb, seasonId: string, teamIds: string[]) {
  const unique = [...new Set(teamIds)];
  if (unique.length === 0) return;

  const seeded = await db.fantasyTeam.findMany({
    where: { id: { in: unique } },
    select: { userId: true },
  });
  const userIds = [...new Set(seeded.map((team) => team.userId))];
  if (userIds.length === 0) return;

  const teams = await db.fantasyTeam.findMany({
    where: { userId: { in: userIds }, league: { seasonId } },
    select: { id: true, userId: true },
  });
  if (teams.length === 0) return;

  const rows = await db.fantasyPointTransaction.findMany({
    where: {
      gameweek: { seasonId },
      OR: [
        { teamId: { in: teams.map((team) => team.id) } },
        { teamId: null, userId: { in: userIds } },
      ],
    },
    select: { teamId: true, userId: true, totalPoints: true },
  });
  const { totals } = attributePoints({
    rows,
    teams: teams.map((team) => ({ teamId: team.id, userId: team.userId })),
  });

  for (const team of teams) {
    await db.fantasyTeam.update({
      where: { id: team.id },
      data: { totalPoints: totals[team.id] ?? 0 },
    });
  }
}

/**
 * Gameweek points for each team. Rows with no teamId count only when that
 * manager has a single team in the season.
 */
export async function gameweekPointsByTeam(
  db: ScoringDb,
  input: { seasonId: string; gameweekId: string; teams: Array<{ teamId: string; userId: string }> },
): Promise<Record<string, number>> {
  const userIds = [...new Set(input.teams.map((team) => team.userId))];
  if (userIds.length === 0) return {};

  const seasonTeams = await db.fantasyTeam.findMany({
    where: { userId: { in: userIds }, league: { seasonId: input.seasonId } },
    select: { id: true, userId: true },
  });
  if (seasonTeams.length === 0) return {};

  const rows = await db.fantasyPointTransaction.findMany({
    where: {
      gameweekId: input.gameweekId,
      OR: [
        { teamId: { in: seasonTeams.map((team) => team.id) } },
        { teamId: null, userId: { in: userIds } },
      ],
    },
    select: { teamId: true, userId: true, totalPoints: true },
  });
  return attributePoints({
    rows,
    teams: seasonTeams.map((team) => ({ teamId: team.id, userId: team.userId })),
  }).totals;
}

/** Points for one team in one gameweek. Bench is already excluded by the snapshot. */
export async function teamGameweekPointRows(
  db: ScoringDb,
  input: { teamId: string; userId: string; seasonId: string; gameweekId: string },
): Promise<Array<{ playerId: string; totalPoints: number }>> {
  const teamCount = await db.fantasyTeam.count({
    where: { userId: input.userId, league: { seasonId: input.seasonId } },
  });
  return db.fantasyPointTransaction.findMany({
    where: {
      gameweekId: input.gameweekId,
      OR: [
        { teamId: input.teamId },
        ...(teamCount === 1 ? [{ teamId: null, userId: input.userId }] : []),
      ],
    },
    select: { playerId: true, totalPoints: true },
  });
}

async function syncPlayerTotals(db: ScoringDb, rules: ScoringRules, playerIds: string[]) {
  if (playerIds.length === 0) return;

  const rows = await db.playerMatchStatistic.findMany({
    where: { playerId: { in: playerIds } },
    select: {
      matchId: true,
      playerId: true,
      minutes: true,
      goals: true,
      assists: true,
      cleanSheet: true,
      saves: true,
      yellowCards: true,
      redCards: true,
      ownGoals: true,
      penaltyMiss: true,
      penaltySave: true,
      goalsConceded: true,
      player: { select: { position: true } },
    },
  });

  const totals = new Map<string, number>(playerIds.map((id) => [id, 0]));
  for (const row of rows) {
    const scored = scoreMatchStat(toStatInput(row.matchId, row), rules);
    totals.set(row.playerId, (totals.get(row.playerId) ?? 0) + scored.points);
  }

  for (const [playerId, totalPoints] of totals) {
    await db.realPlayer.update({
      where: { id: playerId },
      data: { totalPoints },
    });
  }
}

export type ManagerPreview = {
  userId: string;
  teamId: string;
  name: string;
  username: string;
  teamName: string;
  season: string;
  before: number;
  after: number;
};

export type PlayerPreview = {
  playerId: string;
  name: string;
  before: number;
  after: number;
};

export type SkippedGameweekPreview = {
  gameweekId: string;
  number: number;
  season: string;
  reason: string;
  isLive: boolean;
};

export type RecomputeReport = {
  managers: ManagerPreview[];
  playersChanged: PlayerPreview[];
  playersUnchanged: number;
  skippedGameweeks: SkippedGameweekPreview[];
  unattributedPoints: number;
  unattributedRows: number;
  captureLiveId: string | null;
};

type SeasonSnapshot = {
  report: RecomputeReport;
  rules: ScoringRules;
};

export type RecomputeOptions = {
  /**
   * Preview or write the live gameweek from the current squad when it has
   * no snapshot yet. Historical gameweeks are still skipped.
   */
  captureLive?: boolean;
};

async function loadSeasonSnapshot(options: RecomputeOptions = {}): Promise<SeasonSnapshot> {
  const rules = await loadScoringRules(prisma);
  const seasons = await prisma.season.findMany({
    select: {
      id: true,
      name: true,
      gameweeks: {
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          status: true,
          lineupFrozenAt: true,
          lineups: {
            select: {
              playerId: true,
              isStarting: true,
              isCaptain: true,
              isViceCaptain: true,
              team: { select: { id: true, userId: true } },
            },
          },
          matches: {
            select: {
              id: true,
              playerStats: { select: statSelect },
            },
          },
        },
      },
      leagues: {
        select: {
          teams: {
            select: {
              id: true,
              name: true,
              totalPoints: true,
              userId: true,
              user: { select: { id: true, name: true, username: true } },
              players: {
                select: {
                  playerId: true,
                  isStarting: true,
                  isCaptain: true,
                  isViceCaptain: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const players = await prisma.realPlayer.findMany({
    select: { id: true, name: true, totalPoints: true },
  });
  const allStats = await prisma.playerMatchStatistic.findMany({
    select: {
      matchId: true,
      playerId: true,
      minutes: true,
      goals: true,
      assists: true,
      cleanSheet: true,
      saves: true,
      yellowCards: true,
      redCards: true,
      ownGoals: true,
      penaltyMiss: true,
      penaltySave: true,
      goalsConceded: true,
      player: { select: { position: true } },
    },
  });
  const storedPoints = await prisma.fantasyPointTransaction.findMany({
    select: {
      userId: true,
      teamId: true,
      playerId: true,
      gameweekId: true,
      eventType: true,
      basePoints: true,
      multiplier: true,
      totalPoints: true,
      gameweek: { select: { seasonId: true } },
    },
  });

  const playerAfter = new Map<string, number>(players.map((player) => [player.id, 0]));
  for (const row of allStats) {
    const scored = scoreMatchStat(toStatInput(row.matchId, row), rules);
    playerAfter.set(row.playerId, (playerAfter.get(row.playerId) ?? 0) + scored.points);
  }

  const managers: ManagerPreview[] = [];
  const skippedGameweeks: SkippedGameweekPreview[] = [];
  let unattributedPoints = 0;
  let unattributedRows = 0;
  let captureLiveId: string | null = null;

  for (const season of seasons) {
    const teams = season.leagues.flatMap((league) => league.teams);
    const currentSquad: SquadSlot[] = teams.flatMap((team) =>
      team.players.map((player) => ({
        userId: team.userId,
        teamId: team.id,
        playerId: player.playerId,
        isStarting: player.isStarting,
        isCaptain: player.isCaptain,
        isViceCaptain: player.isViceCaptain,
      })),
    );
    const plan = planSeasonRecompute(season.gameweeks, { captureLive: options.captureLive });
    if (plan.captureLiveId) captureLiveId = plan.captureLiveId;

    for (const skipped of plan.skipped) {
      skippedGameweeks.push({
        gameweekId: skipped.id,
        number: skipped.number,
        season: season.name,
        reason: skipped.reason,
        isLive: skipped.isLive,
      });
    }

    const preserved: PointTxn[] = storedPoints
      .filter((txn) => txn.gameweek.seasonId === season.id)
      .map((txn) => ({
        userId: txn.userId,
        teamId: txn.teamId,
        playerId: txn.playerId,
        gameweekId: txn.gameweekId,
        eventType: txn.eventType,
        basePoints: txn.basePoints,
        multiplier: txn.multiplier,
        totalPoints: txn.totalPoints,
      }));

    const rebuilt = rebuildWithSnapshots(
      season.gameweeks.map((gameweek) => {
        const stats = gameweek.matches.flatMap((match) =>
          match.playerStats.map((row) => toStatInput(match.id, row)),
        );
        if (gameweek.lineupFrozenAt) {
          return { gameweekId: gameweek.id, stats, squad: squadFromLineups(gameweek.lineups) };
        }
        if (plan.captureLiveId === gameweek.id) {
          return { gameweekId: gameweek.id, stats, squad: currentSquad };
        }
        return { gameweekId: gameweek.id, stats, squad: null, currentSquad };
      }),
      preserved,
      rules,
    );

    const attributed = attributePoints({
      rows: rebuilt.ledger.transactions.map((txn) => ({
        teamId: txn.teamId,
        userId: txn.userId,
        totalPoints: txn.totalPoints,
      })),
      teams: teams.map((team) => ({ teamId: team.id, userId: team.userId })),
    });
    unattributedPoints += attributed.unattributedPoints;
    unattributedRows += attributed.unattributedRows;

    for (const team of teams) {
      managers.push({
        userId: team.user.id,
        teamId: team.id,
        name: team.user.name,
        username: team.user.username,
        teamName: team.name,
        season: season.name,
        before: team.totalPoints,
        after: attributed.totals[team.id] ?? 0,
      });
    }
  }

  managers.sort((a, b) => a.season.localeCompare(b.season) || a.name.localeCompare(b.name) || a.teamName.localeCompare(b.teamName));

  const playersChanged: PlayerPreview[] = [];
  let playersUnchanged = 0;
  for (const player of players) {
    const after = playerAfter.get(player.id) ?? 0;
    if (after === player.totalPoints) {
      playersUnchanged += 1;
      continue;
    }
    playersChanged.push({
      playerId: player.id,
      name: player.name,
      before: player.totalPoints,
      after,
    });
  }
  playersChanged.sort((a, b) => a.name.localeCompare(b.name));

  return {
    report: {
      managers,
      playersChanged,
      playersUnchanged,
      skippedGameweeks,
      unattributedPoints,
      unattributedRows,
      captureLiveId,
    },
    rules,
  };
}

/** Read-only. Prints nothing and writes nothing. */
export async function previewSeasonRecompute(options: RecomputeOptions = {}): Promise<RecomputeReport> {
  const snapshot = await loadSeasonSnapshot(options);
  return snapshot.report;
}

/**
 * Replace snapshotted gameweeks, team totals, and player totals.
 * Gameweeks with no lineup snapshot are left as they are.
 */
export async function recomputeAllStoredPoints(options: RecomputeOptions = {}): Promise<RecomputeReport> {
  const snapshot = await loadSeasonSnapshot(options);
  await prisma.$transaction(async (tx) => {
    const seasons = await tx.season.findMany({
      select: {
        id: true,
        gameweeks: {
          select: { id: true, number: true, status: true, lineupFrozenAt: true },
        },
      },
    });
    for (const season of seasons) {
      const plan = planSeasonRecompute(season.gameweeks, { captureLive: options.captureLive });
      if (plan.captureLiveId) {
        await captureLineupIfLive(plan.captureLiveId, tx);
      }
      for (const gameweekId of plan.recomputeIds) {
        await recomputeGameweekPoints(gameweekId, tx, { allowCapture: false });
      }
      const teams = await tx.fantasyTeam.findMany({
        where: { league: { seasonId: season.id } },
        select: { id: true },
      });
      await syncTeamTotals(tx, season.id, teams.map((team) => team.id));
    }

    const players = await tx.realPlayer.findMany({ select: { id: true } });
    await syncPlayerTotals(tx, snapshot.rules, players.map((player) => player.id));
  }, { maxWait: 10_000, timeout: 120_000 });

  return snapshot.report;
}

