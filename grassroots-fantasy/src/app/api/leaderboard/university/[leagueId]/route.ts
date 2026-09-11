export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { LeaderboardService } from '@/lib/leaderboard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params;
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const gameweekId = searchParams.get('gameweekId') || undefined;

    if (!seasonId) {
      return NextResponse.json(
        { success: false, error: 'seasonId query parameter is required' },
        { status: 400 }
      );
    }

    const leaderboard = await LeaderboardService.getUniversityLeaderboard(
      leagueId,
      seasonId,
      gameweekId
    );

    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Get university leaderboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
