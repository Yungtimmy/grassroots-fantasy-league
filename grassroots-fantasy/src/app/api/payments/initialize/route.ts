import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { PaymentService } from '@/lib/payment';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { seasonId, universityId } = body;

    if (!universityId) {
      return NextResponse.json(
        { success: false, error: 'universityId is required' },
        { status: 400 }
      );
    }

    const season = seasonId
      ? await prisma.season.findUnique({ where: { id: seasonId } })
      : await prisma.season.findFirst({ where: { status: 'active' }, orderBy: { year: 'desc' } });
    if (!season) {
      return NextResponse.json(
        { success: false, error: 'No season is open for registration' },
        { status: 404 }
      );
    }

    const now = new Date();
    if (now < season.registrationStart || now > season.registrationEnd) {
      return NextResponse.json(
        { success: false, error: 'Registration is not open for this season' },
        { status: 400 }
      );
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: authUser.userId,
        seasonId,
        status: 'successful',
      },
    });
    if (existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Payment already completed for this season' },
        { status: 409 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { email: true },
    });

    const result = await PaymentService.initializeRegistration(
      authUser.userId,
      season.registrationFee,
      seasonId,
      universityId,
      user?.email ?? ''
    );

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: result.authorization_url,
        reference: result.reference,
      },
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
