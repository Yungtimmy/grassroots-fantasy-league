export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { freezeNamedGameweekSquads } from "@/lib/scoring";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const confirm = body?.confirm === true;
    const gameweek = await prisma.gameweek.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, season: { select: { name: true } } },
    });
    if (!gameweek) {
      return NextResponse.json({ success: false, error: "Gameweek not found" }, { status: 404 });
    }

    const result = confirm
      ? await prisma.$transaction((tx) => freezeNamedGameweekSquads(tx, {
          targetId: gameweek.id,
          gameweekName: gameweek.name,
          seasonName: gameweek.season.name,
          confirm: true,
        }), { maxWait: 10_000, timeout: 60_000 })
      : await freezeNamedGameweekSquads(prisma, {
          targetId: gameweek.id,
          gameweekName: gameweek.name,
          seasonName: gameweek.season.name,
          confirm: false,
        });

    return NextResponse.json(
      { success: true, data: result },
      { status: confirm && !result.ok ? 409 : 200 },
    );
  } catch (error) {
    console.error("Freeze lineup error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
