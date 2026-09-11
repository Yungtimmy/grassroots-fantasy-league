export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyFlutterwaveSignature, PaymentService } from "@/lib/payment";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("verif-hash") || "";

    // Verify webhook signature
    if (!verifyFlutterwaveSignature(rawBody, signature)) {
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.completed" && event.data?.status === "successful") {
      const reference = event.data?.tx_ref;
      if (reference) {
        await PaymentService.verifyAndComplete(reference);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Flutterwave webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
