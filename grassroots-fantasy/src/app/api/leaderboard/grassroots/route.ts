export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { LeaderboardService } from '@/lib/leaderboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!seasonId) {
      return NextResponse.json(
        { success: false, error: 'seasonId query parameter is required' },
        { status: 400 }
      );
    }

    const leaderboard = await LeaderboardService.getGrassrootsLeaderboard(
      seasonId,
      limit,
      offset
    );

    const total = await LeaderboardService.getGrassrootsCount(seasonId);

    return NextResponse.json({
      success: true,
      data: {
        items: leaderboard,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Get grassroots leaderboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
