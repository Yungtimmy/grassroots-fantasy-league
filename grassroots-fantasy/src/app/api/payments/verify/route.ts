export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PaymentService } from '@/lib/payment';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
    });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.userId !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to verify this payment' },
        { status: 403 }
      );
    }

    if (payment.status === 'successful') {
      return NextResponse.json({
        success: true,
        data: { payment, message: 'Payment already verified' },
      });
    }

    const result = await PaymentService.verifyAndComplete(reference);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { payment: result.payment },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
