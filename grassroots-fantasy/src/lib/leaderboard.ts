import { prisma } from './db';

export class LeaderboardService {
  static async getUniversityLeaderboard(universityId: string, seasonId: string, gameweekId?: string) {
    const teams = await prisma.fantasyTeam.findMany({
      where: {
        league: { universityId, seasonId },
      },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true } },
        league: { include: { university: { select: { id: true, shortName: true, slug: true } } } },
      },
    });

    let leaderboard = teams.map(team => ({
      rank: 0,
      userId: team.user.id,
      username: team.user.username,
      name: team.user.name,
      avatar: team.user.avatar,
      teamName: team.name,
      university: team.league.university.shortName,
      universitySlug: team.league.university.slug,
      totalPoints: team.totalPoints,
      gameweekPoints: 0,
      movement: 0,
    }));

    if (gameweekId) {
      for (const entry of leaderboard) {
        const points = await prisma.fantasyPointTransaction.aggregate({
          where: { userId: entry.userId, gameweekId },
          _sum: { totalPoints: true },
        });
        entry.gameweekPoints = points._sum.totalPoints ?? 0;
      }
    }

    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    leaderboard.forEach((entry, i) => { entry.rank = i + 1; });

    return leaderboard;
  }

  static async getGrassrootsLeaderboard(seasonId: string, limit = 100, offset = 0) {
    const teams = await prisma.fantasyTeam.findMany({
      where: { league: { seasonId } },
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true } },
        league: { include: { university: { select: { id: true, shortName: true, slug: true } } } },
      },
      orderBy: { totalPoints: 'desc' },
      take: limit,
      skip: offset,
    });

    return teams.map((team, i) => ({
      rank: offset + i + 1,
      userId: team.user.id,
      username: team.user.username,
      name: team.user.name,
      avatar: team.user.avatar,
      teamName: team.name,
      university: team.league.university.shortName,
      universitySlug: team.league.university.slug,
      totalPoints: team.totalPoints,
      gameweekPoints: 0,
      movement: 0,
    }));
  }

  static async getUniversityRankings(seasonId: string) {
    const leagues = await prisma.universityLeague.findMany({
      where: { seasonId, status: { in: ['open', 'active'] } },
      include: {
        university: { select: { id: true, name: true, shortName: true, slug: true, logo: true } },
        teams: { select: { totalPoints: true } },
      },
    });

    const rankings = leagues.map(league => {
      const totalPoints = league.teams.reduce((sum, t) => sum + t.totalPoints, 0);
      return {
        rank: 0,
        universityId: league.university.id,
        name: league.university.name,
        shortName: league.university.shortName,
        slug: league.university.slug,
        logo: league.university.logo,
        totalPoints,
        playerCount: league.teams.length,
      };
    });

    rankings.sort((a, b) => b.totalPoints - a.totalPoints);
    rankings.forEach((entry, i) => { entry.rank = i + 1; });

    return rankings;
  }

  static async getGrassrootsCount(seasonId: string): Promise<number> {
    return prisma.fantasyTeam.count({
      where: { league: { seasonId } },
    });
  }
}
