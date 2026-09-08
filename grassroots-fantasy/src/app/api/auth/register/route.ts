import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { ensureUniversityLeague } from "@/lib/league";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, username, password, universityId } = body;

    if (!name || !email || !username || !password || !universityId) {
      return NextResponse.json(
        { success: false, error: "All fields are required, including university" },
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

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
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
    if (!university || university.status !== "active") {
      return NextResponse.json(
        { success: false, error: "University not found" },
        { status: 404 }
      );
    }

    const league = await ensureUniversityLeague(universityId);
    if (!league) {
      return NextResponse.json(
        { success: false, error: "No season is open for registration yet. Ask an admin to create a season." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, username, passwordHash },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
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

    return NextResponse.json(
      { success: true, data: { user, token } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
