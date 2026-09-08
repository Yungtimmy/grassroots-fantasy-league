import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const activeSeason = await prisma.season.findFirst({
      where: { status: 'active' },
    });

    let leagueMembership = null;
    let fantasyTeam = null;

    if (activeSeason) {
      leagueMembership = await prisma.universityLeagueMember.findFirst({
        where: {
          userId: authUser.userId,
          league: { seasonId: activeSeason.id },
        },
        include: {
          league: {
            include: {
              university: {
                select: { id: true, name: true, shortName: true, slug: true, logo: true },
              },
            },
          },
        },
      });

      if (leagueMembership) {
        fantasyTeam = await prisma.fantasyTeam.findFirst({
          where: {
            userId: authUser.userId,
            leagueId: leagueMembership.leagueId,
          },
          include: {
            players: {
              include: {
                player: {
                  include: {
                    realTeam: {
                      select: { id: true, name: true, shortName: true, logo: true },
                    },
                  },
                },
              },
            },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        leagueMembership,
        fantasyTeam,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
