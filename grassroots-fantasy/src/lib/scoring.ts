import { prisma } from './db';

export class ScoringService {
  static async calculatePoints(matchId: string, playerId: string, eventType: string): Promise<number> {
    const stat = await prisma.playerMatchStatistic.findUnique({
      where: { playerId_matchId: { playerId, matchId } },
    });
    if (!stat) return 0;

    const player = await prisma.realPlayer.findUnique({
      where: { id: playerId },
      select: { position: true },
    });
    if (!player) return 0;

    const rule = await prisma.scoringRule.findFirst({
      where: {
        event: eventType,
        OR: [
          { position: player.position },
          { position: null },
        ],
      },
      orderBy: { position: 'asc' },
    });

    return rule?.points ?? 0;
  }

  static async calculateAllPoints(matchId: string, gameweekId: string): Promise<void> {
    const stats = await prisma.playerMatchStatistic.findMany({
      where: { matchId },
      include: { player: true },
    });

    for (const stat of stats) {
      const events: Array<{ type: string; points: number }> = [];

      // Appearance: +1 for playing
      if (stat.minutes > 0) {
        events.push({ type: 'APPEARANCE', points: 1 });
      }

      // Goals
      if (stat.goals > 0) {
        const goalPoints: Record<string, number> = { GK: 10, DEF: 8, MID: 6, FWD: 5 };
        events.push({ type: 'GOAL', points: (goalPoints[stat.player.position] ?? 0) * stat.goals });
      }

      // Assists
      if (stat.assists > 0) {
        events.push({ type: 'ASSIST', points: 3 * stat.assists });
      }

      // Clean sheet (GK and DEF only)
      if (stat.cleanSheet) {
        const csPoints: Record<string, number> = { GK: 5, DEF: 4 };
        const pts = csPoints[stat.player.position] ?? 0;
        if (pts > 0) {
          events.push({ type: 'CLEAN_SHEET', points: pts });
        }
      }

      // Goal conceded (GK only)
      if (stat.player.position === 'GK' && stat.goalsConceded > 0) {
        events.push({ type: 'GOAL_CONCEDED', points: -2 * stat.goalsConceded });
      }

      // Penalty save (GK only)
      if (stat.penaltySave > 0) {
        events.push({ type: 'PENALTY_SAVE', points: 5 * stat.penaltySave });
      }

      // Yellow card
      if (stat.yellowCards > 0) {
        events.push({ type: 'YELLOW_CARD', points: -1 * stat.yellowCards });
      }

      // Red card
      if (stat.redCards > 0) {
        events.push({ type: 'RED_CARD', points: -3 * stat.redCards });
      }

      // Own goal
      if (stat.ownGoals > 0) {
        events.push({ type: 'OWN_GOAL', points: -2 * stat.ownGoals });
      }

      const totalBasePoints = events.reduce((sum, e) => sum + e.points, 0);

      // Award to ALL owners of this player
      const teamPlayers = await prisma.fantasyTeamPlayer.findMany({
        where: { playerId: stat.playerId },
        include: { team: true },
      });

      for (const teamPlayer of teamPlayers) {
        const multiplier = teamPlayer.isCaptain ? 3 : teamPlayer.isViceCaptain ? 2 : 1;

        await prisma.fantasyPointTransaction.upsert({
          where: {
            userId_playerId_gameweekId: {
              userId: teamPlayer.team.userId,
              playerId: stat.playerId,
              gameweekId,
            },
          },
          update: {
            eventType: events.map(e => e.type).join(','),
            basePoints: totalBasePoints,
            multiplier,
            totalPoints: totalBasePoints * multiplier,
          },
          create: {
            userId: teamPlayer.team.userId,
            playerId: stat.playerId,
            gameweekId,
            eventType: events.map(e => e.type).join(','),
            basePoints: totalBasePoints,
            multiplier,
            totalPoints: totalBasePoints * multiplier,
          },
        });

        await prisma.fantasyTeam.update({
          where: { id: teamPlayer.teamId },
          data: { totalPoints: { increment: totalBasePoints * multiplier } },
        });
      }
    }
  }
}
