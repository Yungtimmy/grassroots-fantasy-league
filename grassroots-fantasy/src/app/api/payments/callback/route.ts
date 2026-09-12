export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PaymentService } from "@/lib/payment";
import { createToken, setAuthCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("tx_ref") || searchParams.get("reference");

    if (!reference) {
      return NextResponse.redirect(
        new URL("/?error=missing_reference", request.url)
      );
    }

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      return NextResponse.redirect(
        new URL("/?error=payment_not_found", request.url)
      );
    }

    const result = await PaymentService.verifyAndComplete(reference);

    if (!result.success) {
      return NextResponse.redirect(
        new URL("/?error=payment_failed", request.url)
      );
    }

    // If this was a pending registration (userId === "pending-registration"), create the user now
    if (payment.userId === "pending-registration" && payment.metadata) {
      let meta: Record<string, string> = {};
      try {
        meta = JSON.parse(payment.metadata);
      } catch {}

      if (meta.name && meta.email && meta.username && meta.universityId) {
        // Check user doesn't already exist (race condition)
        const existing = await prisma.user.findFirst({
          where: { OR: [{ email: meta.email }, { username: meta.username }] },
        });

        if (!existing) {
          const user = await prisma.user.create({
            data: {
              name: meta.name,
              email: meta.email,
              username: meta.username,
              passwordHash: "google-oauth",
              facultyId: meta.facultyId || null,
              departmentId: meta.departmentId || null,
            },
            select: { id: true, email: true, role: true, name: true },
          });

          // Update payment to reference real user
          await prisma.payment.update({
            where: { reference },
            data: { userId: user.id },
          });

          // Enroll in league
          let leagueId: string | undefined = meta.leagueId;
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
            await prisma.universityLeagueMember.create({
              data: { userId: user.id, leagueId },
            });
          }

          // Set auth cookie so user is logged in
          const token = await createToken({
            userId: user.id,
            email: user.email,
            role: user.role,
          });
          await setAuthCookie(token);

          return NextResponse.redirect(
            new URL("/dashboard?payment=success", request.url)
          );
        }
      }
    }

    // Existing user payment — just redirect
    return NextResponse.redirect(
      new URL("/dashboard?payment=success", request.url)
    );
  } catch (error) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=callback_error", request.url)
    );
  }
}
