import { NextRequest, NextResponse } from 'next/server';
import { LeaderboardService } from '@/lib/leaderboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    if (!seasonId) {
      return NextResponse.json(
        { success: false, error: 'seasonId query parameter is required' },
        { status: 400 }
      );
    }

    const rankings = await LeaderboardService.getUniversityRankings(seasonId);

    return NextResponse.json({ success: true, data: rankings });
  } catch (error) {
    console.error('Get university rankings error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
