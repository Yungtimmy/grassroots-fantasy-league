import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.redirect(
        new URL('/?error=missing_reference', request.url)
      );
    }

    const result = await PaymentService.verifyAndComplete(reference);

    if (result.success) {
      return NextResponse.redirect(
        new URL('/?payment=success', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/?payment=failed', request.url)
    );
  } catch (error) {
    console.error('Mock callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=callback_failed', request.url)
    );
  }
}
