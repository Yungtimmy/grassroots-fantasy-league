import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import {
  DEFAULT_SCORING_RULES,
  rebuildSeason,
  rulesFromRows,
  scoreGameweek,
  scoreMatchStat,
  type MatchStatInput,
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

/**
 * Replace one gameweek's fantasy points from the stored match stats.
 * Safe to run any number of times: team totals and player totals are set
 * from the stats, not incremented.
 */
export async function recomputeGameweekPoints(
  gameweekId: string,
  db: ScoringDb,
): Promise<{ awardCount: number }> {
  const gameweek = await db.gameweek.findUnique({
    where: { id: gameweekId },
    select: { id: true, seasonId: true },
  });
  if (!gameweek) {
    throw new ScoringError("Gameweek not found", 404);
  }

  const [rules, matches, squadRows, previous] = await Promise.all([
    loadScoringRules(db),
    db.match.findMany({
      where: { gameweekId },
      select: {
        id: true,
        playerStats: {
          select: {
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
        },
      },
    }),
    db.fantasyTeamPlayer.findMany({
      where: { team: { league: { seasonId: gameweek.seasonId } } },
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
      select: { userId: true, playerId: true },
    }),
  ]);

  const stats = matches.flatMap((match) => match.playerStats.map((row) => toStatInput(match.id, row)));
  const squad: SquadSlot[] = squadRows.map((row) => ({
    userId: row.team.userId,
    teamId: row.team.id,
    playerId: row.playerId,
    isStarting: row.isStarting,
    isCaptain: row.isCaptain,
    isViceCaptain: row.isViceCaptain,
  }));

  const scored = scoreGameweek({ gameweekId, stats, squad, rules });

  await db.fantasyPointTransaction.deleteMany({ where: { gameweekId } });
  if (scored.awards.length > 0) {
    await db.fantasyPointTransaction.createMany({
      data: scored.awards.map((award) => ({
        userId: award.userId,
        playerId: award.playerId,
        gameweekId: award.gameweekId,
        eventType: award.eventType || "SCORE",
        basePoints: award.basePoints,
        multiplier: award.multiplier,
        totalPoints: award.totalPoints,
      })),
    });
  }

  const affectedUserIds = [...new Set([
    ...previous.map((txn) => txn.userId),
    ...scored.awards.map((award) => award.userId),
  ])];
  await syncTeamTotals(db, gameweek.seasonId, affectedUserIds);

  const affectedPlayerIds = [...new Set([
    ...previous.map((txn) => txn.playerId),
    ...stats.map((row) => row.playerId),
  ])];
  await syncPlayerTotals(db, rules, affectedPlayerIds);

  return { awardCount: scored.awards.length };
}

async function syncTeamTotals(db: ScoringDb, seasonId: string, userIds: string[]) {
  if (userIds.length === 0) return;

  const sums = await db.fantasyPointTransaction.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, gameweek: { seasonId } },
    _sum: { totalPoints: true },
  });
  const byUser = new Map(sums.map((row) => [row.userId, row._sum.totalPoints ?? 0]));

  for (const userId of userIds) {
    await db.fantasyTeam.updateMany({
      where: { userId, league: { seasonId } },
      data: { totalPoints: byUser.get(userId) ?? 0 },
    });
  }
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

export type RecomputeReport = {
  managers: ManagerPreview[];
  playersChanged: PlayerPreview[];
  playersUnchanged: number;
};

type SeasonSnapshot = {
  report: RecomputeReport;
  rules: ScoringRules;
};

async function loadSeasonSnapshot(): Promise<SeasonSnapshot> {
  const rules = await loadScoringRules(prisma);
  const seasons = await prisma.season.findMany({
    select: {
      id: true,
      name: true,
      gameweeks: {
        orderBy: { number: "asc" },
        select: {
          id: true,
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
                  saves: true,
                  yellowCards: true,
                  redCards: true,
                  ownGoals: true,
                  penaltyMiss: true,
                  penaltySave: true,
                  goalsConceded: true,
                  player: { select: { position: true } },
                },
              },
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

  const playerAfter = new Map<string, number>(players.map((player) => [player.id, 0]));
  for (const row of allStats) {
    const scored = scoreMatchStat(toStatInput(row.matchId, row), rules);
    playerAfter.set(row.playerId, (playerAfter.get(row.playerId) ?? 0) + scored.points);
  }

  const managers: ManagerPreview[] = [];

  for (const season of seasons) {
    const squad: SquadSlot[] = season.leagues.flatMap((league) =>
      league.teams.flatMap((team) =>
        team.players.map((player) => ({
          userId: team.userId,
          teamId: team.id,
          playerId: player.playerId,
          isStarting: player.isStarting,
          isCaptain: player.isCaptain,
          isViceCaptain: player.isViceCaptain,
        })),
      ),
    );

    const seasonGameweeks = season.gameweeks.map((gameweek) => ({
      gameweekId: gameweek.id,
      squad,
      stats: gameweek.matches.flatMap((match) => match.playerStats.map((row) => toStatInput(match.id, row))),
    }));
    const ledger = rebuildSeason(seasonGameweeks, rules);
    for (const league of season.leagues) {
      for (const team of league.teams) {
        managers.push({
          userId: team.user.id,
          name: team.user.name,
          username: team.user.username,
          teamName: team.name,
          season: season.name,
          before: team.totalPoints,
          after: ledger.teamTotals[team.userId] ?? 0,
        });
      }
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

  return { report: { managers, playersChanged, playersUnchanged }, rules };
}

/** Read-only. Prints nothing and writes nothing. */
export async function previewSeasonRecompute(): Promise<RecomputeReport> {
  const snapshot = await loadSeasonSnapshot();
  return snapshot.report;
}

/** Replace every gameweek, team total, and player total from stored stats. */
export async function recomputeAllStoredPoints(): Promise<RecomputeReport> {
  const snapshot = await loadSeasonSnapshot();
  await prisma.$transaction(async (tx) => {
    const seasons = await tx.season.findMany({
      select: { id: true, gameweeks: { select: { id: true } } },
    });
    for (const season of seasons) {
      for (const gameweek of season.gameweeks) {
        await recomputeGameweekPoints(gameweek.id, tx);
      }
      const teams = await tx.fantasyTeam.findMany({
        where: { league: { seasonId: season.id } },
        select: { userId: true },
      });
      await syncTeamTotals(tx, season.id, [...new Set(teams.map((team) => team.userId))]);
    }

    const players = await tx.realPlayer.findMany({ select: { id: true } });
    await syncPlayerTotals(tx, snapshot.rules, players.map((player) => player.id));
  }, { maxWait: 10_000, timeout: 120_000 });

  return snapshot.report;
}

