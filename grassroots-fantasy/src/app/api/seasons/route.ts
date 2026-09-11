export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { year: 'desc' },
      include: {
        _count: {
          select: { leagues: true, gameweeks: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: seasons });
  } catch (error) {
    console.error('Get seasons error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      year,
      startDate,
      endDate,
      registrationStart,
      registrationEnd,
      registrationFee,
    } = body;

    if (!name || !year || !startDate || !endDate || !registrationStart || !registrationEnd) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    const season = await prisma.season.create({
      data: {
        name,
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationStart: new Date(registrationStart),
        registrationEnd: new Date(registrationEnd),
        registrationFee: registrationFee ?? 500,
      },
    });

    return NextResponse.json(
      { success: true, data: season },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create season error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' || message === 'Forbidden' ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
