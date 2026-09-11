export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { PaymentService } from '@/lib/payment';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { seasonId, universityId, leagueId } = body;

    console.log("Payment init:", { userId: authUser.userId, universityId, leagueId });

    if (!universityId) {
      return NextResponse.json(
        { success: false, error: 'universityId is required' },
        { status: 400 }
      );
    }

    let season;
    if (seasonId) {
      season = await prisma.season.findUnique({ where: { id: seasonId } });
    } else {
      season = await prisma.season.findFirst({ where: { status: 'active' }, orderBy: { year: 'desc' } });
    }

    if (!season) {
      const now = new Date();
      season = await prisma.season.create({
        data: {
          name: "2026 Season",
          year: 2026,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
          registrationStart: new Date("2026-01-01"),
          registrationEnd: new Date("2026-12-31"),
          registrationFee: 5000,
          status: "active",
        },
      });
      console.log("Created season for payment:", season.id);
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: authUser.userId,
        seasonId: season.id,
        status: 'successful',
      },
    });
    if (existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Payment already completed for this season' },
        { status: 409 }
      );
    }

    let entryFee = season.registrationFee;
    if (leagueId) {
      const league = await prisma.universityLeague.findUnique({
        where: { id: leagueId },
        select: { entryFee: true },
      });
      if (league?.entryFee) {
        entryFee = league.entryFee;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { email: true },
    });

    console.log("Initializing Flutterwave payment:", { entryFee, seasonId: season.id, email: user?.email });

    const result = await PaymentService.initializeRegistration(
      authUser.userId,
      entryFee,
      season.id,
      universityId,
      user?.email ?? '',
      leagueId
    );

    console.log("Payment initialized:", result);

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: result.authorization_url,
        reference: result.reference,
        amount: entryFee,
      },
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
