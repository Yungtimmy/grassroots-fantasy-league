export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/auth";
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

    console.log("Registration attempt:", { name, email, username, universityId });

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

    if (university.status !== "active") {
      await prisma.university.update({
        where: { id: universityId },
        data: { status: "active" },
      });
    }

    let season = await getCurrentSeason();
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
      console.log("Created new season:", season.id);
    }

    const league = await ensureUniversityLeague(universityId);
    if (!league) {
      return NextResponse.json(
        { success: false, error: "Could not create league. Please try again." },
        { status: 500 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        passwordHash: "google-oauth",
        facultyId: facultyId || null,
        departmentId: departmentId || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        facultyId: true,
        departmentId: true,
        createdAt: true,
      },
    });

    await prisma.universityLeagueMember.create({
      data: { userId: user.id, leagueId: league.id },
    });

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setAuthCookie(token);

    console.log("Registration successful:", user.id);

    return NextResponse.json(
      { success: true, data: { user, token } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
