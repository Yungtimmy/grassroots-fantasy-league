export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PaymentService } from "@/lib/payment";
import { ensureUniversityLeague, getCurrentSeason } from "@/lib/league";
import { readJsonObject, resolveGoogleIdentity } from "@/lib/verified-identity";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const identity = await resolveGoogleIdentity(request, body);
    if (!identity.ok) {
      return NextResponse.json(
        { success: false, error: identity.error },
        { status: identity.status }
      );
    }
    const email = identity.identity.email;
    const { name, username, universityId, facultyId, departmentId } = body as {
      name?: string;
      username?: string;
      universityId?: string;
      facultyId?: string;
      departmentId?: string;
    };

    if (!name || !email || !username || !universityId) {
      return NextResponse.json(
        { success: false, error: "Name, email, username, and university are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { success: false, error: "Username must be between 3 and 30 characters" },
        { status: 400 }
      );
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { success: false, error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email or username already exists" },
        { status: 409 }
      );
    }

    const university = await prisma.university.findUnique({ where: { id: universityId } });
    if (!university) {
      return NextResponse.json(
        { success: false, error: "University not found" },
        { status: 404 }
      );
    }

    let season = await getCurrentSeason();
    if (!season) {
      season = await prisma.season.create({
        data: {
          name: "2026 Season",
          year: 2026,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
          registrationStart: new Date("2026-01-01"),
          registrationEnd: new Date("2026-12-31"),
          registrationFee: 5200,
          status: "active",
        },
      });
    }

    const league = await ensureUniversityLeague(universityId);
    if (!league) {
      return NextResponse.json(
        { success: false, error: "Could not create league. Please try again." },
        { status: 500 }
      );
    }

    const entryFee = league.entryFee || season.registrationFee;

    const result = await PaymentService.initializeRegistration(
      null,
      entryFee,
      season.id,
      universityId,
      email,
      league.id,
      { name, email, username, universityId, facultyId: facultyId || null, departmentId: departmentId || null }
    );

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: result.authorization_url,
        reference: result.reference,
        amount: entryFee,
      },
    });
  } catch (error) {
    console.error("Register-and-pay error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
