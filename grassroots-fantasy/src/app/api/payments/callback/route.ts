import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("tx_ref") || searchParams.get("reference");

    if (!reference) {
      return NextResponse.redirect(
        new URL("/dashboard/payments?status=error&reason=missing_reference", request.url)
      );
    }

    const result = await PaymentService.verifyAndComplete(reference);

    if (result.success) {
      return NextResponse.redirect(
        new URL("/dashboard?payment=success", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/dashboard/payments?status=failed", request.url)
    );
  } catch (error) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/payments?status=error", request.url)
    );
  }
}
