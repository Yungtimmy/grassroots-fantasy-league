import crypto from "crypto";
import { prisma } from "./db";

const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || "";
const FLUTTERWAVE_ENCRYPTION = process.env.FLUTTERWAVE_ENCRYPTION_KEY || "";
const FLUTTERWAVE_BASE = "https://api.flutterwave.com/v3";

// ─── Provider abstraction ────────────────────────────────────

export interface PaymentVerification {
  success: boolean;
  reference: string;
  amount: number;
  status: "successful" | "failed" | "pending";
  metadata?: Record<string, unknown>;
}

export abstract class PaymentProvider {
  abstract initializePayment(
    amount: number,
    email: string,
    reference: string,
    metadata?: Record<string, unknown>
  ): Promise<{ authorization_url: string; reference: string }>;
  abstract verifyPayment(reference: string): Promise<PaymentVerification>;
}

// ─── Flutterwave provider ────────────────────────────────────

export class FlutterwaveProvider extends PaymentProvider {
  async initializePayment(
    amount: number,
    email: string,
    reference: string,
    metadata?: Record<string, unknown>
  ) {
    const res = await fetch(`${FLUTTERWAVE_BASE}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount,
        currency: "NGN",
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`,
        customer: { email },
        meta: metadata || {},
        config: { permanent: false },
      }),
    });

    const body = await res.json();

    if (body.status !== "success") {
      throw new Error(body.message || "Flutterwave initialization failed");
    }

    return {
      authorization_url: body.data.link,
      reference: body.data.tx_ref,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    const res = await fetch(`${FLUTTERWAVE_BASE}/transactions/verify_by_reference?tx_ref=${reference}`, {
      headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET}` },
    });

    const body = await res.json();

    if (body.status !== "success" || !body.data) {
      return {
        success: false,
        reference,
        amount: 0,
        status: "failed",
      };
    }

    const txn = body.data;

    return {
      success: txn.status === "successful",
      reference: txn.tx_ref,
      amount: txn.amount,
      status: txn.status === "successful" ? "successful" : "failed",
      metadata: txn.meta,
    };
  }
}

// ─── Mock provider (dev fallback) ────────────────────────────

export class MockPaymentProvider extends PaymentProvider {
  async initializePayment(
    amount: number,
    _email: string,
    reference: string,
    _metadata?: Record<string, unknown>
  ) {
    return {
      authorization_url: `/api/payments/callback?tx_ref=${reference}`,
      reference,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    return {
      success: true,
      reference,
      amount: 500,
      status: "successful",
    };
  }
}

// ─── Factory ─────────────────────────────────────────────────

export function createPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || "mock";
  if (provider === "flutterwave" && FLUTTERWAVE_SECRET && FLUTTERWAVE_SECRET !== "FLWSECK_REPLACE_ME") {
    return new FlutterwaveProvider();
  }
  return new MockPaymentProvider();
}

// ─── Webhook signature verification (Flutterwave) ────────────

export function verifyFlutterwaveSignature(
  payload: string,
  signature: string
): boolean {
  const secret = FLUTTERWAVE_ENCRYPTION;
  if (!secret) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return hash === signature;
}

// ─── Payment service ─────────────────────────────────────────

export class PaymentService {
  static async initializeRegistration(
    userId: string | null,
    amount: number,
    seasonId: string,
    universityId: string,
    email: string,
    leagueId?: string,
    extraMetadata?: Record<string, unknown>
  ) {
    const reference = `GFL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const provider = createPaymentProvider();

    const metadata = { userId, seasonId, universityId, leagueId, ...extraMetadata };

    const { authorization_url } = await provider.initializePayment(
      amount,
      email,
      reference,
      metadata
    );

    await prisma.payment.create({
      data: {
        userId: userId ?? undefined,
        amount,
        reference,
        status: "pending",
        seasonId,
        universityId,
        metadata: JSON.stringify({ leagueId, ...extraMetadata }),
      },
    });

    return { authorization_url, reference };
  }

  static async verifyAndComplete(reference: string) {
    const provider = createPaymentProvider();
    const result = await provider.verifyPayment(reference);

    if (!result.success || result.status !== "successful") {
      await prisma.payment.update({
        where: { reference },
        data: { status: "failed" },
      });
      return { success: false, message: "Payment verification failed" };
    }

    const payment = await prisma.payment.update({
      where: { reference },
      data: {
        status: "successful",
        verifiedAt: new Date(),
      },
    });

    // Enroll user in league (supports both leagueId-based and season+university-based)
    // Skip if userId is null — callback handles user creation + enrollment
    if (payment.userId) {
      let leagueId: string | undefined;

      if (payment.metadata) {
        try {
          const meta = JSON.parse(payment.metadata);
          leagueId = meta.leagueId;
        } catch {}
      }

      if (!leagueId && payment.seasonId && payment.universityId) {
        const league = await prisma.universityLeague.findUnique({
          where: {
            universityId_seasonId: {
              universityId: payment.universityId,
              seasonId: payment.seasonId,
            },
          },
        });
        leagueId = league?.id;
      }

      if (leagueId) {
        await prisma.universityLeagueMember.upsert({
          where: {
            userId_leagueId: {
              userId: payment.userId,
              leagueId,
            },
          },
          create: {
            userId: payment.userId,
            leagueId,
          },
          update: {},
        });
      }
    }

    return { success: true, payment };
  }
}
