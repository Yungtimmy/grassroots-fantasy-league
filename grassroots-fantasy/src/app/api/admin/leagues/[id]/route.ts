import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, description, entryFee, prizeInfo, rules, status } = body;

    const league = await prisma.universityLeague.findUnique({
      where: { id: params.id },
    });

    if (!league) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.universityLeague.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        entryFee: entryFee !== undefined ? entryFee : undefined,
        prizeInfo: prizeInfo !== undefined ? prizeInfo : undefined,
        rules: rules !== undefined ? rules : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating league:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
