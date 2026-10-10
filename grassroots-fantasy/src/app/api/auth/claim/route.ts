export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken, setAuthCookie } from "@/lib/auth";
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

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: identity.identity.email, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found. Please register first." },
        { status: 404 }
      );
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Claim session error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
