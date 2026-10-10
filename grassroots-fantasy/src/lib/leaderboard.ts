import { prisma } from './db';
import { findDisplayedGameweek } from './gameweek';
import { gameweekPointsByTeam } from './scoring';

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
      teamId: team.id,
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

    const displayed = await findDisplayedGameweek(seasonId);
    const columnId = gameweekId ?? displayed?.id;
    const teamRefs = leaderboard.map((entry) => ({ teamId: entry.teamId, userId: entry.userId }));
    let columnPoints: Record<string, number> | null = null;
    if (columnId) {
      columnPoints = await gameweekPointsByTeam(prisma, {
        seasonId,
        gameweekId: columnId,
        teams: teamRefs,
      });
      for (const entry of leaderboard) {
        entry.gameweekPoints = columnPoints[entry.teamId] ?? 0;
      }
    }

    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    leaderboard.forEach((entry, i) => { entry.rank = i + 1; });

    if (displayed) {
      const gwLookup = columnId === displayed.id && columnPoints
        ? columnPoints
        : await gameweekPointsByTeam(prisma, {
            seasonId,
            gameweekId: displayed.id,
            teams: teamRefs,
          });

      const prevEntries = leaderboard.map(e => ({
        teamId: e.teamId,
        prevPoints: e.totalPoints - (gwLookup[e.teamId] ?? 0),
      }));
      prevEntries.sort((a, b) => b.prevPoints - a.prevPoints);
      const prevRankMap: Record<string, number> = {};
      prevEntries.forEach((e, i) => { prevRankMap[e.teamId] = i + 1; });

      for (const entry of leaderboard) {
        entry.movement = (prevRankMap[entry.teamId] ?? entry.rank) - entry.rank;
      }
    }

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
    });

    const allEntries = teams.map((team) => ({
      teamId: team.id,
      userId: team.user.id,
      username: team.user.username,
      name: team.user.name,
      avatar: team.user.avatar,
      teamName: team.name,
      university: team.league.university.shortName,
      universitySlug: team.league.university.slug,
      totalPoints: team.totalPoints,
    }));

    const displayed = await findDisplayedGameweek(seasonId);

    let movementMap: Record<string, number> = {};
    let gwPointsLookup: Record<string, number> = {};
    if (displayed) {
      gwPointsLookup = await gameweekPointsByTeam(prisma, {
        seasonId,
        gameweekId: displayed.id,
        teams: allEntries.map((entry) => ({ teamId: entry.teamId, userId: entry.userId })),
      });

      const prevEntries = allEntries.map((e) => ({
        ...e,
        prevPoints: e.totalPoints - (gwPointsLookup[e.teamId] ?? 0),
      }));
      prevEntries.sort((a, b) => b.prevPoints - a.prevPoints);
      const prevRankMap: Record<string, number> = {};
      prevEntries.forEach((e, i) => { prevRankMap[e.teamId] = i + 1; });

      const currentRankMap: Record<string, number> = {};
      allEntries.forEach((e, i) => { currentRankMap[e.teamId] = i + 1; });

      for (const e of allEntries) {
        movementMap[e.teamId] = (prevRankMap[e.teamId] ?? e.totalPoints) - (currentRankMap[e.teamId] ?? e.totalPoints);
      }
    }

    const paginated = allEntries.slice(offset, offset + limit);

    return paginated.map((team, i) => ({
      rank: offset + i + 1,
      teamId: team.teamId,
      userId: team.userId,
      username: team.username,
      name: team.name,
      avatar: team.avatar,
      teamName: team.teamName,
      university: team.university,
      universitySlug: team.universitySlug,
      totalPoints: team.totalPoints,
      gameweekPoints: gwPointsLookup[team.teamId] ?? 0,
      movement: movementMap[team.teamId] ?? 0,
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
