import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const university = await prisma.university.findUnique({
      where: { slug },
    });

    if (!university) {
      return NextResponse.json(
        { success: false, error: 'University not found' },
        { status: 404 }
      );
    }

    const activeSeason = await prisma.season.findFirst({
      where: { status: 'active' },
    });

    let league = null;
    let memberCount = 0;
    let teamCount = 0;

    if (activeSeason) {
      league = await prisma.universityLeague.findUnique({
        where: {
          universityId_seasonId: {
            universityId: university.id,
            seasonId: activeSeason.id,
          },
        },
        include: {
          season: true,
        },
      });

      if (league) {
        memberCount = await prisma.universityLeagueMember.count({
          where: { leagueId: league.id },
        });
        teamCount = await prisma.fantasyTeam.count({
          where: { leagueId: league.id },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...university,
        league,
        memberCount,
        teamCount,
        season: activeSeason,
      },
    });
  } catch (error) {
    console.error('Get university error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
