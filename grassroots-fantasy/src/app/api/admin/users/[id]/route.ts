import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Get user error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { id } = params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.role) {
      const allowedRoles = ['user', 'admin'];
      if (!allowedRoles.includes(body.role)) {
        return NextResponse.json(
          { success: false, error: `Invalid role. Allowed: ${allowedRoles.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.role = body.role;
    }
    if (body.status) updateData.status = body.status;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Update user error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
