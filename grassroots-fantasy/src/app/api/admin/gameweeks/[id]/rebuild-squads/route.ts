export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rebuildGameweekSquads } from "@/lib/squad-rebuild";

/**
 * Dry run unless body.confirm is true. Confirm writes rebuilt lineup rows
 * for one finished gameweek and does not overwrite a snapshot that exists.
 */
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
      select: { id: true },
    });
    if (!gameweek) {
      return NextResponse.json({ success: false, error: "Gameweek not found" }, { status: 404 });
    }

    const result = confirm
      ? await prisma.$transaction(
          (tx) => rebuildGameweekSquads(tx, { gameweekId: gameweek.id, confirm: true }),
          { maxWait: 10_000, timeout: 60_000 },
        )
      : await rebuildGameweekSquads(prisma, { gameweekId: gameweek.id, confirm: false });

    if (confirm && !result.written) {
      return NextResponse.json(
        { success: false, error: result.reason ?? "Squads were not rebuilt", data: result },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Rebuild squads error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
